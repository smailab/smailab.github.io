"""LUMEN 사이트용 의료영상 스타일 일러스트 생성기.

실제 환자 영상이 아닌, SDF(부호 거리 함수)로 만든 해부학 모형에
MRI/CT/PET 대조도와 노이즈를 입힌 합성 이미지입니다.

    python3 lumen/tools/gen_images.py   # -> lumen/img/*.jpg
"""
import os
import numpy as np
from scipy import ndimage as ndi
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), "..", "img")
os.makedirs(OUT, exist_ok=True)
RNG = np.random.default_rng(7)


# ---------------------------------------------------------------- helpers
def grid(w, h):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    return x, y


def sd_ellipse(x, y, cx, cy, rx, ry, rot=0.0):
    if rot:
        c, s = np.cos(rot), np.sin(rot)
        dx, dy = x - cx, y - cy
        x, y = cx + dx * c + dy * s, cy - dx * s + dy * c
    k = np.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2)
    return (k - 1.0) * min(rx, ry)


def sd_cone(x, y, ax, ay, bx, by, ra, rb):
    """두 점 사이 반지름이 변하는 캡슐 (팔·다리용)."""
    vx, vy = bx - ax, by - ay
    L2 = vx * vx + vy * vy
    t = np.clip(((x - ax) * vx + (y - ay) * vy) / L2, 0, 1)
    px, py = ax + t * vx, ay + t * vy
    return np.hypot(x - px, y - py) - (ra + (rb - ra) * t)


def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)


def union(ds, k=12.0):
    d = ds[0]
    for e in ds[1:]:
        d = smin(d, e, k)
    return d


def soft(d, edge=1.2):
    """SDF -> 0..1 마스크 (내부 1)."""
    return 1.0 / (1.0 + np.exp(np.clip(d / edge, -40, 40)))


def noise(h, w, scale, octaves=4, seed=None):
    r = np.random.default_rng(seed) if seed is not None else RNG
    out = np.zeros((h, w), np.float32)
    amp, s, tot = 1.0, scale, 0.0
    for _ in range(octaves):
        n = ndi.gaussian_filter(r.standard_normal((h, w)).astype(np.float32), s)
        n /= n.std() + 1e-6
        out += amp * n
        tot += amp
        amp *= 0.5
        s = max(s / 2, 0.6)
    return out / tot


def warp(img, x, y, amount, scale, seed):
    h, w = img.shape
    dx = noise(h, w, scale, 3, seed) * amount
    dy = noise(h, w, scale, 3, seed + 1) * amount
    return ndi.map_coordinates(img, [y + dy, x + dx], order=1, mode="nearest")


def paint(base, mask, val):
    """mask 영역을 val(스칼라 또는 배열)로 덮어쓰기."""
    return base * (1 - mask) + val * mask


def mri_finish(img, blur=0.9, noise_lvl=0.025, gamma=0.9):
    img = ndi.gaussian_filter(img, blur)
    h, w = img.shape
    n1 = RNG.standard_normal((h, w)) * noise_lvl
    n2 = RNG.standard_normal((h, w)) * noise_lvl
    img = np.sqrt((img + n1) ** 2 + n2 ** 2)  # Rician
    img = np.clip(img, 0, 1) ** gamma
    return img


def save(img, name, tint=None, q=88):
    a = (np.clip(img, 0, 1) * 255).astype(np.uint8)
    if tint is None:
        im = Image.fromarray(a, "L").convert("RGB")
    else:
        rgb = np.stack([a * t for t in tint], -1).clip(0, 255).astype(np.uint8)
        im = Image.fromarray(rgb, "RGB")
    path = os.path.join(OUT, name)
    im.save(path, quality=q, optimize=True, progressive=True)
    print("saved", path, im.size, os.path.getsize(path) // 1024, "KB")


# ---------------------------------------------------------------- body model
def body_sdf(x, y, cx, s):
    """정면(관상면) 인체 실루엣 SDF. s = 스케일."""
    P = lambda v: v * s
    parts = [
        sd_ellipse(x, y, cx, P(120), P(62), P(78)),                       # head
        sd_cone(x, y, cx, P(185), cx, P(240), P(34), P(40)),              # neck
        sd_ellipse(x, y, cx, P(370), P(150), P(150)),                     # chest
        sd_ellipse(x, y, cx, P(520), P(128), P(140)),                     # abdomen
        sd_ellipse(x, y, cx, P(650), P(150), P(95)),                      # pelvis
        sd_ellipse(x, y, cx - P(150), P(290), P(55), P(48)),              # shoulders
        sd_ellipse(x, y, cx + P(150), P(290), P(55), P(48)),
    ]
    for sg in (-1, 1):
        parts += [
            sd_cone(x, y, cx + sg * P(175), P(300), cx + sg * P(205), P(520), P(42), P(34)),  # upper arm
            sd_cone(x, y, cx + sg * P(205), P(520), cx + sg * P(228), P(740), P(33), P(25)),  # forearm
            sd_ellipse(x, y, cx + sg * P(232), P(790), P(26), P(48)),                        # hand
            sd_cone(x, y, cx + sg * P(75), P(690), cx + sg * P(66), P(1010), P(78), P(50)),  # thigh
            sd_cone(x, y, cx + sg * P(66), P(1020), cx + sg * P(62), P(1330), P(50), P(30)), # calf
            sd_ellipse(x, y, cx + sg * P(70), P(1360), P(30), P(30)),                        # ankle/foot
        ]
    d = union(parts[:5], P(30))
    d = smin(d, union(parts[5:7], P(10)), P(40))
    for i in range(7, len(parts), 6):
        arm = union(parts[i:i + 3], P(8))
        leg = union(parts[i + 3:i + 6], P(10))
        d = smin(d, arm, P(14))
        d = smin(d, leg, P(22))
    return d


def whole_body_mri(W=760, H=1560):
    x, y = grid(W, H)
    cx, s = W / 2, 1.08
    P = lambda v: v * s
    d = body_sdf(x, y, cx, s)
    # 팔과 몸통 사이 틈 만들기 (겨드랑이~허리)
    for sg in (-1, 1):
        gap = sd_cone(x, y, cx + sg * P(178), P(360), cx + sg * P(190), P(640), P(3), P(6))
        d = np.maximum(d, -gap)

    body = soft(d, 1.0)
    fat_t = P(9) + noise(H, W, 30, 3, 1) * P(2.5)
    muscle = soft(d + fat_t, 1.5)

    tex = noise(H, W, 2.5, 3, 2)
    img = body * 0.86                                         # 피하지방 (T1 고신호)
    img = paint(img, muscle, 0.30 + 0.05 * tex)               # 근육

    # 근육 사이 지방선 (허벅지·팔)
    sep = warp(noise(H, W, 16, 1, 3), x, y, 10, 30, 11)
    streak = np.clip(1 - np.abs(sep / np.abs(sep).max()) * 30, 0, 1)
    img = paint(img, muscle * streak * soft(-(y - P(720)), 40) * 0.45, 0.6)

    # --- 머리: 두피지방, 두개골, 뇌
    hd = sd_ellipse(x, y, cx, P(120), P(62), P(78))
    skull = soft(hd + P(7), 1.0)
    brain_d = hd + P(13)
    brain = soft(brain_d, 1.0)
    img = paint(img, skull, 0.08)
    gyri = warp(noise(H, W, 3.2, 2, 4), x, y, 4, 8, 5)
    bimg = 0.46 + 0.08 * np.tanh(gyri * 2)
    bimg = np.where(np.abs(gyri) < 0.12, 0.22, bimg)         # 고랑 (CSF 저신호)
    img = paint(img, brain, bimg)
    vent = soft(union([sd_ellipse(x, y, cx - P(12), P(115), P(9), P(22), 0.3),
                       sd_ellipse(x, y, cx + P(12), P(115), P(9), P(22), -0.3)], P(4)), 1)
    img = paint(img, vent * brain, 0.14)

    # --- 척추 (목~천골)
    for i in range(26):
        vy = P(200) + i * P(18.5)
        if vy > P(640):
            break
        vw = P(14 + 6 * min(i, 20) / 20)
        vb = soft(sd_ellipse(x, y, cx, vy, vw, P(7.2)), 0.8)
        img = paint(img, vb, 0.62 + 0.05 * tex)
    # --- 폐
    lungs = [sd_ellipse(x, y, cx - P(70), P(355), P(62), P(118), 0.06),
             sd_ellipse(x, y, cx + P(70), P(355), P(58), P(112), -0.06)]
    lung = soft(union(lungs, P(4)), 1.2)
    lung *= soft(sd_ellipse(x, y, cx + P(18), P(420), P(52), P(60)) * -1, 1.5)  # 심장 자리 파내기
    vessels = np.clip(1 - np.abs(warp(noise(H, W, 6, 2, 6), x, y, 6, 10, 7)) * 12, 0, 1)
    img = paint(img, lung, 0.035 + 0.13 * vessels * soft(sd_ellipse(x, y, cx, P(380), P(90), P(80)), 30))
    # --- 심장
    heart = soft(sd_ellipse(x, y, cx + P(18), P(420), P(52), P(60), -0.5), 1.2)
    img = paint(img, heart, 0.28)
    img = paint(img, soft(sd_ellipse(x, y, cx + P(22), P(425), P(32), P(40), -0.5), 1.2), 0.12)
    # --- 횡격막 아래 장기
    liver = soft(union([sd_ellipse(x, y, cx - P(55), P(495), P(92), P(58), 0.25),
                        sd_ellipse(x, y, cx - P(5), P(480), P(60), P(30))], P(15)), 1.2)
    img = paint(img, liver, 0.45 + 0.03 * tex)
    spleen = soft(sd_ellipse(x, y, cx + P(98), P(488), P(30), P(50), -0.4), 1.2)
    img = paint(img, spleen, 0.40)
    stomach = soft(sd_ellipse(x, y, cx + P(50), P(500), P(38), P(30), 0.4), 1.2)
    img = paint(img, stomach, 0.18)
    for sg in (-1, 1):
        kd = sd_ellipse(x, y, cx + sg * P(72), P(560), P(24), P(42), sg * 0.25)
        img = paint(img, soft(kd, 1), 0.48)
        img = paint(img, soft(kd + P(9), 1), 0.28)
    # 장 (얼룩진 질감)
    bowel = soft(sd_ellipse(x, y, cx, P(600), P(100), P(62)), 4)
    bt = warp(noise(H, W, 5, 3, 8), x, y, 6, 12, 9)
    img = paint(img, bowel * (1 - soft(sd_ellipse(x, y, cx, P(560), P(20), P(60)), 2)),
                0.30 + 0.16 * np.tanh(bt * 1.5))
    # 골반뼈, 방광
    for sg in (-1, 1):
        il = sd_ellipse(x, y, cx + sg * P(98), P(628), P(30), P(62), sg * 0.75)
        il = smin(il, sd_ellipse(x, y, cx + sg * P(62), P(672), P(20), P(36), sg * 0.3), P(10))
        img = paint(img, soft(il, 1), 0.08)
        img = paint(img, soft(il + P(4), 1), 0.5 + 0.06 * tex)
        fh = sd_ellipse(x, y, cx + sg * P(105), P(705), P(19), P(19))
        img = paint(img, soft(fh, 1), 0.66)
    img = paint(img, soft(sd_ellipse(x, y, cx, P(705), P(42), P(30)), 1.2), 0.12)
    # 긴 뼈: 대퇴골·경골·상완골 (피질 저신호 + 골수 고신호)
    for sg in (-1, 1):
        for a, b, r in [((P(108), P(712)), (P(72), P(1000)), P(17)),
                        ((P(70), P(1030)), (P(64), P(1320)), P(14)),
                        ((P(178), P(310)), (P(205), P(515)), P(10)),
                        ((P(207), P(530)), (P(226), P(735)), P(7))]:
            bd = sd_cone(x, y, cx + sg * a[0], a[1], cx + sg * b[0], b[1], r, r * 0.9)
            img = paint(img, soft(bd, 1), 0.06)
            img = paint(img, soft(bd + r * 0.35, 1.2), 0.74 + 0.05 * tex)

    img *= body
    # 코일 감도 불균일 + 비네팅
    img *= 0.9 + 0.1 * noise(H, W, 120, 1, 10)
    img = mri_finish(img, 0.8, 0.018, 0.95)
    return img


def brain_axial(N=900):
    x, y = grid(N, N)
    c = N / 2
    head = sd_ellipse(x, y, c, c + 10, 330, 400)
    img = soft(head, 1.2) * 0.62                                  # 두피
    img = paint(img, soft(head + 20, 1), 0.05)                    # 두개골
    marrow = soft(head + 26, 1) * (1 - soft(head + 34, 1))
    img = paint(img, marrow, 0.35)
    csf_out = soft(head + 36, 1)
    img = paint(img, csf_out, 0.9)                                # 뇌척수액 (T2 고신호)

    cortex_d = head + 42 + noise(N, N, 22, 1, 21) * 4
    brain = soft(cortex_d, 1)
    # 대뇌낫 (정중선)
    falx = np.exp(-((x - c - 3 * np.sin(y / 90)) / 3.5) ** 2) * soft(-(np.abs(y - c) - 330), 10)
    # 방사형 뇌고랑: 표면에서 안쪽으로 파고드는 가는 CSF 선 + 그를 따라가는 회백질 띠
    depth = np.clip(-cortex_d, 0, None)
    th = np.arctan2(y - c, x - c)
    r = np.hypot(x - c, y - c) + 1
    K = 23
    bend = warp(noise(N, N, 50, 2, 22), x, y, 40, 60, 27)
    phase = th * K + bend * 3.2 + np.sin(depth * 0.09 + th * 7) * 0.5
    f = np.sin(phase)
    dist_s = np.abs(np.arcsin(np.clip(f, -1, 1))) / K * r     # 고랑까지 호 길이(px)
    sec = np.floor((phase + np.pi / 2) / np.pi)
    L = 22 + 40 * ((np.sin(sec * 12.9898) * 43758.5453) % 1.0)   # 고랑마다 다른 깊이
    sulc = soft(dist_s - 1.6, 0.8) * soft(depth - L, 3)
    gm = soft(np.minimum(dist_s, depth) - 11, 2.5) * soft(depth - L - 11, 4)
    gm = np.maximum(gm, soft(depth - 11, 2))
    bimg = 0.31 + 0.015 * noise(N, N, 3, 1, 25)
    bimg = paint(bimg, gm, 0.55 + 0.02 * noise(N, N, 2, 1, 24))
    bimg = paint(bimg, sulc, 0.9)
    # 실비우스열 (외측)
    for sg in (-1, 1):
        syl = sd_cone(x, y, c + sg * 300, c - 30, c + sg * 205, c - 5, 5, 2)
        bimg = paint(bimg, soft(syl, 1.2), 0.9)
    img = paint(img, brain, bimg)
    img = paint(img, falx * brain, 0.9)
    # 측뇌실 (나비 모양)
    vents = union([sd_ellipse(x, y, c - 36, c - 85, 13, 46, -0.42),
                   sd_ellipse(x, y, c + 36, c - 85, 13, 46, 0.42),
                   sd_ellipse(x, y, c - 24, c - 25, 9, 34, -0.05),
                   sd_ellipse(x, y, c + 24, c - 25, 9, 34, 0.05),
                   sd_ellipse(x, y, c - 58, c + 95, 14, 46, 0.55),
                   sd_ellipse(x, y, c + 58, c + 95, 14, 46, -0.55)], 14)
    img = paint(img, soft(vents, 1.2), 0.93)
    # 기저핵·시상 (회백질 덩어리)
    for sg in (-1, 1):
        img = paint(img, soft(sd_ellipse(x, y, c + sg * 92, c - 5, 26, 58, sg * 0.25), 4), 0.47)
        img = paint(img, soft(sd_ellipse(x, y, c + sg * 34, c + 45, 26, 30), 4), 0.44)
    img = paint(img, soft(sd_ellipse(x, y, c, c + 25, 7, 26), 1), 0.92)  # 3뇌실
    img *= 0.88 + 0.12 * noise(N, N, 160, 1, 26)
    return mri_finish(img, 0.7, 0.02, 1.0)


def spine_sagittal(W=640, H=1280):
    x, y = grid(W, H)
    curve = lambda yy: W * 0.42 + 34 * np.sin((yy / H) * np.pi * 2.0 - 0.6)  # 경추·요추 전만
    C = curve(y)
    left_of = lambda v, e=2: soft(x - v, e)     # x < v
    right_of = lambda v, e=2: soft(v - x, e)    # x > v
    img = np.zeros((H, W), np.float32)
    # 앞쪽(왼쪽) 장기·혈관, 뒤쪽(오른쪽) 근육·지방
    img = paint(img, right_of(C - 300, 4) * left_of(C + 300), 0.3 + 0.03 * noise(H, W, 3, 2, 31))
    img = paint(img, right_of(C - 300, 4) * left_of(C - 70, 3),
                0.26 + 0.12 * np.tanh(warp(noise(H, W, 6, 3, 34), x, y, 6, 14, 35) * 1.5))
    img = paint(img, right_of(C - 96, 1.5) * left_of(C - 66, 1.5) * 0.9, 0.12)   # 대동맥 (flow void)
    img = paint(img, right_of(C + 240) * left_of(C + 300), 0.84)                   # 피하지방
    septa = soft(np.abs(x - C - 175 - noise(H, W, 30, 2, 32) * 12) - 3, 1.5) * 0.7
    img = paint(img, septa, 0.72)
    # 척추관: CSF (T2 고신호) + 척수
    img = paint(img, soft(np.abs(x - (C + 66)) - 22, 1.2), 0.93)
    cord = soft(np.abs(x - (C + 64)) - 10, 1.2) * soft(y - H * 0.6, 8)
    img = paint(img, cord, 0.42)
    # 추체 + 디스크 + 극돌기
    n = 21
    step = (H - 40) / n
    for i in range(n):
        cy = 30 + i * step + step / 2
        cxv = curve(cy)
        hgt = step * 0.7
        wid = 30 + 16 * i / n
        ang = np.arctan(34 * np.cos((cy / H) * np.pi * 2.0 - 0.6) * np.pi * 2.0 / H)
        vb = sd_ellipse(x, y, cxv, cy, wid * 1.25, hgt * 0.62, -ang)
        vb = np.maximum(vb, np.abs(x - cxv) - wid)
        img = paint(img, soft(vb, 1), 0.07)
        img = paint(img, soft(vb + 3.2, 1), 0.52 + 0.07 * noise(H, W, 1.6, 2, 33 + i))
        dy = cy + step / 2
        disc = sd_ellipse(x, y, curve(dy), dy, wid * 0.98, step * 0.13, -ang)
        img = paint(img, soft(disc, 1), 0.22)
        img = paint(img, soft(sd_ellipse(x, y, curve(dy) - 3, dy, wid * 0.55, step * 0.07, -ang), 1),
                    0.88 if i != n - 4 else 0.28)                 # 한 곳은 탈수된 디스크
        sp = sd_ellipse(x, y, cxv + 135, cy + 12, 40, 9, 0.4)
        img = paint(img, soft(sp, 1), 0.06)
        img = paint(img, soft(sp + 3, 1), 0.5)
    img *= left_of(C + 300) * right_of(C - 300, 30)
    img *= 0.8 + 0.2 * right_of(W * 0.3, 160)
    return mri_finish(img, 0.8, 0.02, 1.0)


def chest_ct(W=1000, H=760):
    x, y = grid(W, H)
    cx, cy = W / 2, H / 2 + 20
    body = sd_ellipse(x, y, cx, cy, 440, 300)
    img = soft(body, 1) * 0.36                                    # 피하지방 (CT 저음영)
    muscle = soft(body + 26 + noise(H, W, 20, 2, 41) * 6, 1.5)
    img = paint(img, muscle, 0.52 + 0.02 * noise(H, W, 2, 2, 42))
    inner = sd_ellipse(x, y, cx, cy + 5, 380, 245)
    img = paint(img, soft(inner, 1), 0.44)
    # 갈비뼈 (흰 고리 조각)
    for k in range(16):
        t = k / 16 * 2 * np.pi + 0.2
        if abs(np.sin(t) - 1) < 0.08 or abs(np.sin(t) + 1) < 0.25:
            continue                                           # 흉골·척추 자리 비우기
        rx_, ry_ = cx + 398 * np.cos(t), cy + 262 * np.sin(t)
        tang = np.arctan2(262 * np.cos(t), -398 * np.sin(t))
        rb = sd_ellipse(x, y, rx_, ry_, 26, 10, -tang)
        img = paint(img, soft(rb, 1), 0.95)
        img = paint(img, soft(rb + 3.5, 1), 0.68)
    # 폐
    lungs = [sd_ellipse(x, y, cx - 175, cy - 15, 160, 205, 0.12),
             sd_ellipse(x, y, cx + 180, cy - 20, 150, 200, -0.12)]
    lung = soft(union(lungs, 6), 1.2)
    lung *= 1 - soft(sd_ellipse(x, y, cx + 30, cy + 60, 130, 110, 0.2), 2)
    lung *= 1 - soft(sd_ellipse(x, y, cx, cy + 150, 60, 80), 2)
    vtree = warp(noise(H, W, 7, 3, 43), x, y, 10, 20, 44)
    vessels = np.clip(1 - np.abs(vtree) * 14, 0, 1) * soft(np.hypot(x - cx, y - cy) - 330, 60)
    dots = (ndi.gaussian_filter((RNG.random((H, W)) > 0.9994).astype(np.float32), 2.0) * 25).clip(0, 1)
    img = paint(img, lung, 0.03 + 0.4 * np.maximum(vessels * 0.7, dots))
    # 작은 폐결절 하나
    img = paint(img, soft(sd_ellipse(x, y, cx - 230, cy - 90, 9, 8), 1), 0.55)
    # 심장·대동맥
    img = paint(img, soft(sd_ellipse(x, y, cx + 30, cy + 60, 130, 110, 0.2), 1.5), 0.5)
    img = paint(img, soft(sd_ellipse(x, y, cx + 15, cy + 50, 70, 60), 3), 0.58)
    img = paint(img, soft(sd_ellipse(x, y, cx + 55, cy + 150, 30, 30), 1), 0.58)   # 하행대동맥
    img = paint(img, soft(sd_ellipse(x, y, cx + 85, cy - 5, 12, 6, 0.6), 1), 0.95)  # 관상동맥 석회
    # 척추·흉골
    vert = sd_ellipse(x, y, cx, cy + 175, 52, 46)
    img = paint(img, soft(vert, 1), 0.92)
    img = paint(img, soft(vert + 7, 1), 0.66 + 0.05 * noise(H, W, 1.5, 2, 45))
    img = paint(img, soft(sd_ellipse(x, y, cx, cy + 245, 16, 30), 1), 0.9)
    img = paint(img, soft(sd_ellipse(x, y, cx, cy + 238, 9, 9), 1), 0.4)
    img = paint(img, soft(sd_ellipse(x, y, cx, cy - 235, 38, 14), 1), 0.9)
    img = paint(img, soft(sd_ellipse(x, y, cx, cy - 235, 30, 8), 1), 0.6)
    img *= soft(body, 1)
    img = ndi.gaussian_filter(img, 0.8)
    img += RNG.standard_normal((H, W)).astype(np.float32) * 0.018 * soft(body, 1)
    return np.clip(img, 0, 1)


def pet_mip(W=640, H=1560):
    x, y = grid(W, H)
    cx, s = W / 2, 0.84
    P = lambda v: v * s
    d = body_sdf(x, y, cx, s)
    body = soft(d, 2.5)
    upt = body * 0.10 * (1 + 0.3 * noise(H, W, 18, 2, 51))
    upt += soft(d + P(10), 6) * 0.06
    blob = lambda X, Y, rx, ry, v, e=3: soft(sd_ellipse(x, y, cx + P(X), P(Y), P(rx), P(ry)), e) * v
    upt += blob(0, 115, 52, 64, 0.85, 4)                          # 뇌 (포도당 대사 높음)
    upt += blob(16, 420, 34, 40, 0.55, 4)                         # 심근
    upt += blob(-55, 495, 85, 55, 0.22, 8)                        # 간
    upt += blob(-72, 560, 18, 34, 0.7, 3) + blob(72, 560, 18, 34, 0.7, 3)   # 신장
    upt += blob(0, 705, 34, 26, 1.0, 3)                           # 방광
    bowel = np.clip(noise(H, W, 6, 2, 52), 0, None) * soft(sd_ellipse(x, y, cx, P(610), P(95), P(55)), 10)
    upt += bowel * 0.18
    upt += blob(0, 230, 16, 22, 0.35, 3)                          # 인두·편도
    upt += blob(62, 330, 7, 7, 0.9, 1.5)                          # 소결절 (예시 병변)
    img = 1 - np.clip(upt, 0, 1) ** 0.8
    img = ndi.gaussian_filter(img, 1.6)
    img += RNG.standard_normal((H, W)).astype(np.float32) * 0.01
    return np.clip(img, 0, 1)


if __name__ == "__main__":
    save(whole_body_mri(), "wholebody-mri.jpg")
    save(brain_axial(), "brain-mri.jpg")
    save(spine_sagittal(), "spine-mri.jpg")
    save(chest_ct(), "chest-ct.jpg")
    save(pet_mip(), "pet-mip.jpg")
