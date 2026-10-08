/* =========================================================
   LUMEN 공통 스크립트
   ========================================================= */

const BRAND = { name: "LUMEN", ko: "루멘", tel: "1600-0000", email: "care@lumen.example" };
const STORE_KEY = "lumen_reservations";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const won = n => Math.round(n).toLocaleString("ko-KR") + "원";
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const scanById = id => SCANS.find(s => s.id === id);
const centerById = id => CENTERS.find(c => c.id === id);
const modChip = m => `<span class="chip ${m}">${MODALITIES[m].name}</span>`;
const params = new URLSearchParams(location.search);

function loadReservations() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; }
}
function saveReservation(r) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify([r, ...loadReservations()])); } catch { /* 저장 불가 환경 */ }
}

/* ---------- Header / Footer ---------- */
function renderHeader(active) {
  const links = [
    ["index.html#scans", "검사 안내", "scans"],
    ["index.html#packages", "패키지·가격", "packages"],
    ["centers.html", "제휴 병원", "centers"],
    ["index.html#faq", "자주 묻는 질문", "faq"]
  ];
  $("#site-header").innerHTML = `
    <header class="header" id="header">
      <div class="container">
        <a href="index.html" class="logo"><span class="logo-mark"></span>${BRAND.name}</a>
        <nav class="nav" id="nav">
          ${links.map(([h, t, k]) => `<a href="${h}" class="${k === active ? "active" : ""}">${t}</a>`).join("")}
        </nav>
        <div class="header-cta">
          <button class="btn btn-ghost btn-sm" onclick="openMyReservations()">예약 확인</button>
          <a href="book.html" class="btn btn-primary btn-sm">검사 예약</a>
          <button class="menu-btn" aria-label="메뉴" onclick="document.getElementById('nav').classList.toggle('open')">☰</button>
        </div>
      </div>
    </header>`;
  addEventListener("scroll", () => $("#header").classList.toggle("scrolled", scrollY > 8), { passive: true });
}

function renderFooter() {
  $("#site-footer").innerHTML = `
    <footer class="footer">
      <div class="container">
        <div class="footer-top">
          <div>
            <a href="index.html" class="logo"><span class="logo-mark"></span>${BRAND.name}</a>
            <p>MRI · CT · PET-CT 기반 예방 정밀 검진.<br>증상이 생기기 전에, 몸 속을 먼저 확인하세요.</p>
          </div>
          <div>
            <h4>검사</h4>
            <ul>
              <li><a href="index.html#scans">전신 MRI</a></li>
              <li><a href="index.html#scans">저선량 CT</a></li>
              <li><a href="index.html#scans">PET-CT</a></li>
              <li><a href="index.html#packages">패키지·가격</a></li>
            </ul>
          </div>
          <div>
            <h4>서비스</h4>
            <ul>
              <li><a href="book.html">검사 예약</a></li>
              <li><a href="centers.html">제휴 병원</a></li>
              <li><a href="#" onclick="openMyReservations();return false">예약 확인</a></li>
              <li><a href="index.html#faq">자주 묻는 질문</a></li>
            </ul>
          </div>
          <div>
            <h4>고객센터</h4>
            <ul>
              <li><a href="tel:${BRAND.tel}">${BRAND.tel}</a></li>
              <li>평일 09:00–18:00</li>
              <li><a href="mailto:${BRAND.email}">${BRAND.email}</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          본 사이트의 병원·가격·일정 정보는 시연용 샘플입니다. 실제 검사는 각 제휴 의료기관에서 시행되며, 검사 가능 여부와 최종 비용은 의료진 상담 후 확정됩니다.<br>
          예방 목적의 영상 검사는 모든 질환을 발견하지 못할 수 있으며, 우연히 발견된 소견으로 추가 검사가 필요할 수 있습니다. CT·PET-CT는 방사선 노출이 있으므로 의료진과 상의 후 선택하세요.<br>
          © ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.
        </div>
      </div>
    </footer>
    <div class="modal" id="modal" onclick="if(event.target===this)closeModal()">
      <div class="modal-card"><button class="modal-close" onclick="closeModal()" aria-label="닫기">×</button><div id="modal-body"></div></div>
    </div>`;
  addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
}

function openModal(html) { $("#modal-body").innerHTML = html; $("#modal").classList.add("open"); }
function closeModal() { $("#modal")?.classList.remove("open"); }

function openMyReservations() {
  const list = loadReservations();
  openModal(`
    <h3>내 예약</h3>
    <p class="muted" style="font-size:14px">이 브라우저에서 진행한 예약 내역입니다.</p>
    ${list.length ? list.map(r => `
      <div class="res-item">
        <b>${esc(r.code)}</b> · ${esc(r.date)} ${esc(r.time)}<br>
        ${esc(centerById(r.center)?.name || "")}<br>
        <span class="muted">${r.scans.map(id => esc(scanById(id)?.name || id)).join(", ")} · ${won(r.total)}</span>
      </div>`).join("") : `<div class="empty" style="margin-top:16px">아직 예약 내역이 없습니다.<br><a class="btn btn-primary btn-sm" style="margin-top:14px" href="book.html">검사 예약하기</a></div>`}
  `);
}

/* ---------- 공통 계산 ---------- */
function priceOf(scanIds, discount = 0) {
  const sum = scanIds.reduce((t, id) => t + scanById(id).price, 0);
  return { sum, final: Math.round(sum * (1 - discount) / 1000) * 1000 };
}
function modalitiesOf(scanIds) { return [...new Set(scanIds.map(id => scanById(id).modality))]; }
function centerSupports(c, mods) { return mods.every(m => c.modalities.includes(m)); }

/* =========================================================
   HOME
   ========================================================= */
function initHome() {
  // 검사 장비별 카드
  const modInfo = {
    MRI: { time: "30–90분", best: "뇌·척추·간·췌장·신장·골반 등 연부조직", items: ["방사선 노출 없음", "뇌동맥류·고형암 조기 발견", "전신 13개 이상 장기 한 번에"] },
    CT: { time: "10–20분", best: "폐결절, 관상동맥 석회화·협착", items: ["폐암 선별(저선량)", "심혈관 위험도 수치화", "짧은 검사 시간"] },
    PETCT: { time: "약 2시간", best: "대사 활성이 높은 종양 탐지", items: ["전신 암 스크리닝", "림프절·전이 의심 소견", "가족력이 높은 경우 권장"] }
  };
  const modImg = { MRI: ["img/brain-mri.jpg", "50% 45%"], CT: ["img/chest-ct.jpg", "50% 50%"], PETCT: ["img/pet-mip.jpg", "50% 6%"] };
  $("#mod-grid").innerHTML = Object.entries(MODALITIES).map(([k, m]) => `
    <article class="mod-card reveal">
      <div class="mod-img ${k === "PETCT" ? "light" : ""}">
        <img src="${modImg[k][0]}" alt="${m.name} 예시 영상" loading="lazy" style="object-position:${modImg[k][1]}">
        ${modChip(k)}
      </div>
      <div class="mod-body">
      <h3>${m.name}<span class="muted" style="font-size:15px;font-weight:500;margin-left:8px">${m.full}</span></h3>
      <dl>
        <dt>검사 시간</dt><dd>${modInfo[k].time}</dd>
        <dt>방사선</dt><dd>${m.radiation}</dd>
        <dt>강점</dt><dd>${modInfo[k].best}</dd>
      </dl>
      <ul>${modInfo[k].items.map(i => `<li>${i}</li>`).join("")}</ul>
      <div style="margin-top:auto;display:flex;flex-wrap:wrap;gap:6px;padding-top:8px">
        ${SCANS.filter(s => s.modality === k).map(s => `<a class="chip plain" href="book.html?scan=${s.id}">${s.name} · ${won(s.price)}</a>`).join("")}
      </div>
      </div>
    </article>`).join("");

  // 패키지
  $("#pkg-grid").innerHTML = PACKAGES.map(p => {
    const { sum, final } = priceOf(p.scans, p.discount);
    return `
    <article class="pkg reveal ${p.featured ? "featured" : ""}">
      ${p.featured ? `<span class="badge">가장 많이 선택</span>` : ""}
      <span class="en muted">${p.en}</span>
      <h3>${p.name}</h3>
      <p class="muted" style="font-size:15px;margin-top:6px">${p.desc}</p>
      <div class="price">${won(final)}${p.discount ? `<s>${won(sum)}</s>` : ""}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${modalitiesOf(p.scans).map(modChip).join("")}</div>
      <div class="pkg-thumbs">${p.scans.map(id => scanById(id)).map(sc => `<img src="${sc.img}" alt="" loading="lazy" style="object-position:${sc.imgPos}" title="${sc.name}">`).join("")}</div>
      <ul>${p.perks.map(x => `<li>${x}</li>`).join("")}</ul>
      <a href="book.html?pkg=${p.id}" class="btn ${p.featured ? "btn-accent" : "btn-primary"}">이 패키지로 예약</a>
    </article>`;
  }).join("");

  $("#stat-centers").textContent = CENTERS.length + "곳";
  $("#stat-regions").textContent = REGIONS.length + "개";

  $("#faq-list").innerHTML = FAQS.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("");
}

/* =========================================================
   CENTERS (제휴 병원)
   ========================================================= */
function initCenters() {
  const state = { q: params.get("q") || "", region: params.get("region") || "전체", mods: new Set(), weekend: false };

  $("#region-bar").innerHTML = REGIONS.map(r =>
    `<div>${r}<b>${CENTERS.filter(c => c.region === r).length}</b></div>`).join("");

  $("#f-region").innerHTML = ["전체", ...REGIONS].map(r => `<button data-r="${r}" class="${r === state.region ? "on" : ""}">${r}</button>`).join("");
  $("#f-mod").innerHTML = Object.entries(MODALITIES).map(([k, m]) => `<button data-m="${k}">${m.name}</button>`).join("");
  $("#f-q").value = state.q;

  $("#f-region").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    state.region = b.dataset.r;
    $$("#f-region button").forEach(x => x.classList.toggle("on", x === b));
    render();
  });
  $("#f-mod").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    state.mods.has(b.dataset.m) ? state.mods.delete(b.dataset.m) : state.mods.add(b.dataset.m);
    b.classList.toggle("on");
    render();
  });
  $("#f-q").addEventListener("input", e => { state.q = e.target.value.trim(); render(); });
  $("#f-weekend").addEventListener("change", e => { state.weekend = e.target.checked; render(); });

  function render() {
    const q = state.q.toLowerCase();
    const list = CENTERS.filter(c =>
      (state.region === "전체" || c.region === state.region) &&
      centerSupports(c, [...state.mods]) &&
      (!state.weekend || c.weekend) &&
      (!q || [c.name, c.region, c.district, c.address, ...c.equipment, ...c.features].join(" ").toLowerCase().includes(q))
    ).sort((a, b) => (b.flagship ? 1 : 0) - (a.flagship ? 1 : 0));

    $("#count").textContent = `검색 결과 ${list.length}곳`;
    $("#center-grid").innerHTML = list.length ? list.map(c => `
      <article class="center">
        <div class="center-visual">
          <img src="${centerImg(c)}" alt="" loading="lazy">
          <span>${esc(c.region)} · ${esc(c.district)}</span>
          ${c.flagship ? `<span class="flag">직영 플래그십</span>` : ""}
        </div>
        <div class="center-top">
          <div>
            <h3>${esc(c.name)}</h3>
            <p class="addr">${esc(c.address)}</p>
          </div>
        </div>
        <div class="row">${c.modalities.map(modChip).join("")}</div>
        <div class="meta">
          <div><b>장비</b>${c.equipment.map(esc).join(" · ")}</div>
          <div><b>운영</b>${esc(c.hours)}</div>
        </div>
        <div class="row">${c.features.map(f => `<span class="chip plain">${esc(f)}</span>`).join("")}</div>
        <div class="actions">
          <button class="btn btn-ghost btn-sm" onclick="showCenter('${c.id}')">상세 정보</button>
          <a class="btn btn-primary btn-sm" href="book.html?center=${c.id}">이 병원으로 예약</a>
        </div>
      </article>`).join("") : `<div class="empty" style="grid-column:1/-1">조건에 맞는 제휴 병원이 없습니다. 필터를 조정해 보세요.</div>`;
  }
  render();
}

function centerImg(c) {
  const pool = ["img/spine-mri.jpg", "img/brain-mri.jpg", "img/chest-ct.jpg", "img/wholebody-mri.jpg"];
  return pool[CENTERS.indexOf(c) % pool.length];
}

function showCenter(id) {
  const c = centerById(id);
  const scans = SCANS.filter(s => c.modalities.includes(s.modality));
  openModal(`
    <h3>${esc(c.name)}</h3>
    <p class="muted" style="font-size:14px">${esc(c.region)} ${esc(c.district)}</p>
    <div class="meta">
      <div><b>주소</b>${esc(c.address)}</div>
      <div><b>운영 시간</b>${esc(c.hours)}</div>
      <div><b>보유 장비</b>${c.equipment.map(esc).join("<br>")}</div>
      <div><b>편의 서비스</b>${c.features.map(esc).join(" · ")}</div>
      <div><b>이 병원에서 가능한 검사</b>${scans.map(s => `${s.name} <span class="muted">(${won(s.price)})</span>`).join("<br>")}</div>
    </div>
    <a class="btn btn-primary" style="width:100%;margin-top:22px" href="book.html?center=${c.id}">이 병원으로 예약하기</a>
  `);
}

/* =========================================================
   BOOK (검사 선택 · 예약)
   ========================================================= */
function initBook() {
  const STEPS = ["검사 선택", "병원 선택", "일정 선택", "정보·문진", "예약 확인"];
  const S = {
    step: 0,
    pkg: null,               // 선택된 패키지 id (없으면 개별 선택)
    scans: new Set(),
    addons: new Set(),
    center: null,
    date: null, time: null,
    info: {}, screen: {}
  };

  // URL 파라미터 반영
  if (params.get("pkg") && PACKAGES.find(p => p.id === params.get("pkg"))) applyPackage(params.get("pkg"));
  if (params.get("scan") && scanById(params.get("scan"))) S.scans.add(params.get("scan"));
  if (params.get("center") && centerById(params.get("center"))) S.center = params.get("center");

  function applyPackage(id) {
    S.pkg = id;
    S.scans = new Set(PACKAGES.find(p => p.id === id).scans);
  }
  function discount() {
    if (!S.pkg) return 0;
    const p = PACKAGES.find(x => x.id === S.pkg);
    // 패키지 구성과 정확히 일치할 때만 할인 적용
    const same = p.scans.length === S.scans.size && p.scans.every(id => S.scans.has(id));
    return same ? p.discount : 0;
  }
  function totals() {
    const ids = [...S.scans];
    const { sum, final } = priceOf(ids, discount());
    const add = [...S.addons].reduce((t, id) => t + ADDONS.find(a => a.id === id).price, 0);
    return { sum, scanFinal: final, add, total: final + add, minutes: ids.reduce((t, id) => t + scanById(id).duration, 0) };
  }
  const mods = () => modalitiesOf([...S.scans]);

  /* ----- Step renderers ----- */
  function stepScans() {
    return `
      <div class="panel">
        <h2>어떤 검사를 받으시겠어요?</h2>
        <p class="muted">추천 패키지를 고르거나, 필요한 검사를 직접 조합하세요.</p>
        <h4>추천 패키지</h4>
        <div class="opt-grid">
          ${PACKAGES.map(p => {
            const { final } = priceOf(p.scans, p.discount);
            return `<button type="button" class="opt ${S.pkg === p.id && discount() === p.discount ? "on" : ""}" data-pkg="${p.id}">
              <b>${p.name}</b><small>${p.scans.map(id => scanById(id).name).join(" + ")}</small>
              <span class="p">${won(final)}</span>
              ${p.discount ? `<small style="color:var(--accent);font-weight:700">패키지 ${p.discount * 100}% 할인</small>` : ""}
            </button>`;
          }).join("")}
        </div>
        <h4>개별 검사 선택</h4>
        <div class="scan-list">
          ${SCANS.map(s => `
            <label class="scan-item ${S.scans.has(s.id) ? "on" : ""}">
              <input type="checkbox" data-scan="${s.id}" ${S.scans.has(s.id) ? "checked" : ""}>
              <img class="thumb" src="${s.img}" alt="" loading="lazy" style="object-position:${s.imgPos}${s.modality === "PETCT" ? ";background:#fff" : ""}">
              <div>
                <div class="t">${s.name} ${modChip(s.modality)} ${s.tag ? `<span class="chip plain">${s.tag}</span>` : ""}</div>
                <div class="d">${s.summary}</div>
                <div class="m">소요 약 ${s.duration}분 · 방사선 ${s.radiation}</div>
              </div>
              <span class="p">${won(s.price)}</span>
              <details onclick="event.stopPropagation()">
                <summary>검사 부위 · 발견 가능 질환 · 준비사항</summary>
                <ul>
                  <li><b>부위</b> ${s.regions.join(", ")}</li>
                  <li><b>발견 가능</b> ${s.detects.join(", ")}</li>
                  <li><b>준비</b> ${s.prep.join(" / ")}</li>
                </ul>
              </details>
            </label>`).join("")}
        </div>
        <h4>추가 옵션</h4>
        <div class="scan-list">
          ${ADDONS.map(a => `
            <label class="scan-item addon ${S.addons.has(a.id) ? "on" : ""}">
              <input type="checkbox" data-addon="${a.id}" ${S.addons.has(a.id) ? "checked" : ""}>
              <div><div class="t" style="font-size:15px">${a.name}</div></div>
              <span class="p">+${won(a.price)}</span>
            </label>`).join("")}
        </div>
        ${S.scans.has("wb-mri") && S.scans.has("wb-mri-plus") ? `<div class="notice warn">전신 MRI 플러스에 전신 MRI 항목이 모두 포함되어 있습니다. 둘 중 하나만 선택하세요.</div>` : ""}
        ${S.scans.has("petct") ? `<div class="notice info">PET-CT는 방사선 노출(약 7–10 mSv)이 있어, 암 가족력·고위험군에게 주로 권장됩니다. 상담 시 의료진이 적합성을 다시 확인합니다.</div>` : ""}
        <div class="nav-btns"><span></span><button class="btn btn-primary" data-next ${canNext() ? "" : "disabled"}>병원 선택하기 →</button></div>
      </div>`;
  }

  function stepCenter() {
    const need = mods();
    const regionSel = S._region || "전체";
    const list = CENTERS.filter(c => regionSel === "전체" || c.region === regionSel)
      .sort((a, b) => centerSupports(b, need) - centerSupports(a, need));
    return `
      <div class="panel">
        <h2>검사받을 병원을 선택하세요</h2>
        <p class="muted">선택한 검사(${need.map(m => MODALITIES[m].name).join(", ")})를 모두 시행할 수 있는 병원만 선택 가능합니다.</p>
        <div class="seg" id="b-region" style="margin-bottom:16px">
          ${["전체", ...REGIONS].map(r => `<button type="button" data-r="${r}" class="${r === regionSel ? "on" : ""}">${r}</button>`).join("")}
        </div>
        <div class="center-pick">
          ${list.map(c => {
            const ok = centerSupports(c, need);
            return `<button type="button" class="opt ${S.center === c.id ? "on" : ""} ${ok ? "" : "off"}" data-center="${c.id}" ${ok ? "" : "disabled"}>
              <div>
                <b>${esc(c.name)}</b> ${c.flagship ? `<span class="flag">직영</span>` : ""}<br>
                <small>${esc(c.address)}</small><br>
                <small>${esc(c.hours)}</small>
              </div>
              <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end">${c.modalities.map(modChip).join("")}${ok ? "" : `<small style="width:100%;text-align:right">일부 검사 불가</small>`}</div>
            </button>`;
          }).join("")}
        </div>
        <div class="nav-btns"><button class="btn btn-ghost" data-prev>← 이전</button><button class="btn btn-primary" data-next ${canNext() ? "" : "disabled"}>일정 선택하기 →</button></div>
      </div>`;
  }

  // 날짜별 예약 가능 시간 (데모: 병원·날짜 기반 의사난수)
  function slotsFor(centerId, dateStr) {
    const c = centerById(centerId);
    const d = new Date(dateStr + "T00:00:00");
    const dow = d.getDay();
    if (dow === 0 || (dow === 6 && !c.weekend)) return [];
    const last = dow === 6 ? 14 : 18;
    const out = [];
    let seed = [...(centerId + dateStr)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
    for (let h = 8; h < last; h++) for (const m of ["00", "30"]) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      out.push({ t: `${String(h).padStart(2, "0")}:${m}`, open: seed % 10 > 3 });
    }
    // PET-CT는 오전 검사만 (금식·투약 일정)
    return mods().includes("PETCT") ? out.filter(s => s.t < "12:00") : out;
  }
  function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

  function stepDate() {
    const days = [];
    const base = new Date(); base.setHours(0, 0, 0, 0);
    for (let i = 2; i < 30; i++) { const d = new Date(base); d.setDate(base.getDate() + i); days.push(d); }
    const W = ["일", "월", "화", "수", "목", "금", "토"];
    const slots = S.date ? slotsFor(S.center, S.date) : [];
    return `
      <div class="panel">
        <h2>검사 일정을 선택하세요</h2>
        <p class="muted">${esc(centerById(S.center).name)} · 예상 소요 약 ${totals().minutes + 30}분 (접수·환복 포함)</p>
        <h4>날짜</h4>
        <div class="dates">
          ${days.map(d => {
            const k = ymd(d); const avail = slotsFor(S.center, k).some(s => s.open);
            return `<button type="button" class="date ${d.getDay() === 0 ? "sun" : ""} ${S.date === k ? "on" : ""}" data-date="${k}" ${avail ? "" : "disabled"}>
              <small>${d.getMonth() + 1}월 ${W[d.getDay()]}</small><b>${d.getDate()}</b></button>`;
          }).join("")}
        </div>
        ${S.date ? `
          <h4>시간</h4>
          <div class="times">${slots.map(s => `<button type="button" class="time ${S.time === s.t ? "on" : ""}" data-time="${s.t}" ${s.open ? "" : "disabled"}>${s.t}</button>`).join("")}</div>
          ${mods().includes("PETCT") ? `<div class="notice info">PET-CT 포함 예약은 금식·방사성의약품 투약 일정으로 오전 시간만 선택 가능합니다.</div>` : ""}
        ` : `<p class="muted" style="font-size:14px;margin-top:14px">날짜를 먼저 선택하세요. 일요일·공휴일은 휴진입니다.</p>`}
        <div class="nav-btns"><button class="btn btn-ghost" data-prev>← 이전</button><button class="btn btn-primary" data-next ${canNext() ? "" : "disabled"}>정보 입력하기 →</button></div>
      </div>`;
  }

  function screeningQs() {
    const qs = [];
    const m = mods();
    if (m.includes("MRI")) qs.push(
      ["pacemaker", "심장박동기·제세동기·인공와우가 있나요?", "MRI"],
      ["metal", "체내 금속(클립, 인공관절, 스텐트 등)이 있나요?", "MRI"],
      ["claustro", "폐소공포증이 있나요?", "MRI"]
    );
    if (m.includes("CT") || m.includes("PETCT")) qs.push(
      ["pregnant", "임신 중이거나 임신 가능성이 있나요?", "RAD"],
      ["contrast", "조영제 알레르기 또는 신장 질환이 있나요?", "RAD"]
    );
    if (m.includes("PETCT")) qs.push(["diabetes", "당뇨병으로 약물·인슐린을 사용 중인가요?", "PET"]);
    return qs;
  }
  function screenWarnings() {
    const w = [], a = S.screen;
    if (a.pacemaker === "Y") w.push("심장박동기·인공와우가 있는 경우 MRI 검사가 제한될 수 있습니다. 예약 후 의료진이 기기 정보를 확인해 연락드립니다.");
    if (a.metal === "Y") w.push("체내 금속의 종류에 따라 MRI 가능 여부가 달라집니다. 수술 기록이나 기기 카드를 지참해 주세요.");
    if (a.claustro === "Y") w.push("폐소공포증 케어 옵션(와이드보어/오픈형 장비 우선 배정, 진정 상담)을 추가하시는 것을 권장합니다.");
    if (a.pregnant === "Y") w.push("임신 중에는 CT·PET-CT 검사를 시행하지 않습니다. 해당 검사는 의료진 상담 후 조정됩니다.");
    if (a.contrast === "Y") w.push("조영제 사용 검사(관상동맥 CT 혈관조영 등)는 사전 혈액검사(신기능) 또는 대체 검사가 필요할 수 있습니다.");
    if (a.diabetes === "Y") w.push("PET-CT 전 혈당 관리가 중요합니다. 코디네이터가 약 복용 일정을 따로 안내드립니다.");
    return w;
  }

  function stepInfo() {
    const i = S.info;
    const qs = screeningQs();
    const w = screenWarnings();
    return `
      <div class="panel">
        <h2>예약자 정보와 사전 문진</h2>
        <p class="muted">안전한 검사를 위해 정확히 입력해 주세요.</p>
        <form id="info-form" class="form-grid" onsubmit="return false">
          <label class="field">이름<input name="name" required value="${esc(i.name || "")}" autocomplete="name"></label>
          <label class="field">휴대폰 번호<input name="phone" required inputmode="tel" placeholder="010-0000-0000" value="${esc(i.phone || "")}" autocomplete="tel"></label>
          <label class="field">생년월일<input name="birth" required type="date" value="${esc(i.birth || "")}"></label>
          <label class="field">성별<select name="sex" required>
            <option value="">선택</option>
            ${["여성", "남성"].map(s => `<option ${i.sex === s ? "selected" : ""}>${s}</option>`).join("")}
          </select></label>
          <label class="field full">이메일 (결과 리포트 수신)<input name="email" type="email" required value="${esc(i.email || "")}" autocomplete="email"></label>
          <label class="field full">검사 목적 · 걱정되는 부분 (선택)<textarea name="memo" rows="3" placeholder="예: 가족력(대장암), 흡연 20년, 최근 두통">${esc(i.memo || "")}</textarea></label>
        </form>
        <h4>사전 문진</h4>
        <div id="screen">
          ${qs.map(([k, q]) => `
            <div class="q"><span>${q}</span>
              <div class="yn">
                <label><input type="radio" name="${k}" value="N" ${S.screen[k] === "N" ? "checked" : ""}>아니오</label>
                <label><input type="radio" name="${k}" value="Y" ${S.screen[k] === "Y" ? "checked" : ""}>예</label>
              </div>
            </div>`).join("")}
        </div>
        <div id="warns">${w.map(x => `<div class="notice warn">${x}</div>`).join("")}</div>
        <label class="agree"><input type="checkbox" id="agree1" ${S.info.agree1 ? "checked" : ""}> [필수] 개인정보(건강정보 포함) 수집·이용 및 제휴 의료기관 제공에 동의합니다.</label>
        <label class="agree"><input type="checkbox" id="agree2" ${S.info.agree2 ? "checked" : ""}> [필수] 예방 목적 영상 검사의 한계(위양성·우연 발견 소견, 방사선 노출 등)에 대한 안내를 확인했습니다.</label>
        <div class="nav-btns"><button class="btn btn-ghost" data-prev>← 이전</button><button class="btn btn-primary" data-next ${canNext() ? "" : "disabled"}>예약 내용 확인 →</button></div>
      </div>`;
  }

  function stepConfirm() {
    const t = totals(), c = centerById(S.center);
    return `
      <div class="panel">
        <h2>예약 내용을 확인하세요</h2>
        <p class="muted">결제는 검사 당일 병원에서 진행됩니다. (예약금 없음)</p>
        <div class="sum-line"><span>검사</span><span style="text-align:right">${[...S.scans].map(id => scanById(id).name).join("<br>")}</span></div>
        ${S.addons.size ? `<div class="sum-line"><span>추가 옵션</span><span style="text-align:right">${[...S.addons].map(id => ADDONS.find(a => a.id === id).name).join("<br>")}</span></div>` : ""}
        <div class="sum-line"><span>병원</span><span style="text-align:right">${esc(c.name)}<br><small class="muted">${esc(c.address)}</small></span></div>
        <div class="sum-line"><span>일시</span><span>${S.date} ${S.time}</span></div>
        <div class="sum-line"><span>예약자</span><span>${esc(S.info.name)} · ${esc(S.info.phone)}</span></div>
        <div class="sum-sep"></div>
        <div class="sum-total"><span>예상 결제 금액</span><b>${won(t.total)}</b></div>
        ${screenWarnings().length ? `<div class="notice warn">사전 문진에서 확인이 필요한 항목이 있어, 예약 후 의료진이 24시간 이내에 연락드립니다.</div>` : ""}
        <h4>검사 전 준비사항</h4>
        <ul style="margin-left:18px;font-size:14px;color:var(--ink-2);display:grid;gap:4px">
          ${[...new Set([...S.scans].flatMap(id => scanById(id).prep))].map(p => `<li>${p}</li>`).join("")}
          <li>신분증 지참, 검사 20분 전 도착</li>
        </ul>
        <div class="nav-btns"><button class="btn btn-ghost" data-prev>← 수정</button><button class="btn btn-accent" id="submit">예약 확정하기</button></div>
      </div>`;
  }

  function stepDone(r) {
    const c = centerById(r.center);
    return `
      <div class="panel done-box">
        <div class="ok">✓</div>
        <h2>예약이 접수되었습니다</h2>
        <p class="muted">확인 문자와 이메일을 보내드렸습니다. 담당 코디네이터가 검사 2일 전 다시 안내드립니다.</p>
        <div class="code">${r.code}</div>
        <table>
          <tr><td>일시</td><td>${r.date} ${r.time}</td></tr>
          <tr><td>병원</td><td>${esc(c.name)}</td></tr>
          <tr><td>검사</td><td>${r.scans.map(id => scanById(id).name).join(", ")}</td></tr>
          <tr><td>예상 금액</td><td>${won(r.total)}</td></tr>
        </table>
        <div style="display:flex;gap:10px;justify-content:center;margin-top:28px;flex-wrap:wrap">
          <a class="btn btn-ghost" href="index.html">홈으로</a>
          <button class="btn btn-primary" onclick="openMyReservations()">내 예약 보기</button>
        </div>
      </div>`;
  }

  /* ----- Validation ----- */
  function infoValid() {
    const i = S.info;
    const qsDone = screeningQs().every(([k]) => S.screen[k]);
    return i.name && /^[0-9\-\s]{9,14}$/.test(i.phone || "") && i.birth && i.sex && /\S+@\S+\.\S+/.test(i.email || "") && qsDone && i.agree1 && i.agree2;
  }
  function canNext() {
    switch (S.step) {
      case 0: return S.scans.size > 0 && !(S.scans.has("wb-mri") && S.scans.has("wb-mri-plus"));
      case 1: return !!S.center && centerSupports(centerById(S.center), mods());
      case 2: return !!(S.date && S.time);
      case 3: return !!infoValid();
      default: return true;
    }
  }

  /* ----- Render ----- */
  function renderSummary() {
    const t = totals();
    const c = S.center && centerById(S.center);
    $("#summary").innerHTML = `
      <div class="panel">
        <h3>예약 요약</h3>
        ${S.scans.size ? `
          ${[...S.scans].map(id => { const s = scanById(id); return `<div class="sum-line"><span>${s.name}</span><span>${won(s.price)}</span></div>`; }).join("")}
          ${discount() ? `<div class="sum-line" style="color:var(--accent)"><span>패키지 할인 ${discount() * 100}%</span><span>−${won(t.sum - t.scanFinal)}</span></div>` : ""}
          ${[...S.addons].map(id => { const a = ADDONS.find(x => x.id === id); return `<div class="sum-line"><span>${a.name}</span><span>${won(a.price)}</span></div>`; }).join("")}
          <div class="sum-sep"></div>
          <div class="sum-total"><span>합계</span><b>${won(t.total)}</b></div>
          <div class="sum-meta">
            <span>검사 시간 약 ${t.minutes}분</span>
            ${c ? `<span>📍 ${esc(c.name)}</span>` : ""}
            ${S.date ? `<span>🗓 ${S.date} ${S.time || ""}</span>` : ""}
          </div>` : `<p class="sum-empty">검사를 선택하면 금액이 표시됩니다.</p>`}
      </div>
      <p class="muted" style="font-size:12px;margin-top:12px;padding:0 6px">표시 가격은 비급여 기준 예상 금액이며, 조영제 사용·추가 촬영 시 변동될 수 있습니다.</p>`;
  }

  function render() {
    $("#stepper").innerHTML = STEPS.map((s, i) =>
      `<span class="${i === S.step ? "on" : i < S.step ? "done" : ""}"><i>STEP ${i + 1}</i>${s}</span>`).join("");
    $("#step").innerHTML = [stepScans, stepCenter, stepDate, stepInfo, stepConfirm][S.step]();
    renderSummary();
  }
  function go(n) { S.step = n; render(); scrollTo({ top: 0, behavior: "smooth" }); }
  function refreshNext() { const b = $("[data-next]"); if (b) b.disabled = !canNext(); }

  /* ----- Events (위임) ----- */
  $("#step").addEventListener("click", e => {
    const t = e.target.closest("[data-pkg],[data-center],[data-date],[data-time],[data-next],[data-prev],#submit,#b-region button");
    if (!t) return;
    if (t.dataset.pkg) { applyPackage(t.dataset.pkg); render(); }
    else if (t.dataset.r) { S._region = t.dataset.r; render(); }
    else if (t.dataset.center) { S.center = t.dataset.center; S.date = S.time = null; render(); }
    else if (t.dataset.date) { S.date = t.dataset.date; S.time = null; render(); }
    else if (t.dataset.time) { S.time = t.dataset.time; render(); }
    else if (t.hasAttribute("data-next") && canNext()) {
      // 검사 구성이 바뀌어 선택한 병원이 해당 검사를 못 하면 병원 선택 초기화
      if (S.step === 0 && S.center && !centerSupports(centerById(S.center), mods())) { S.center = null; S.date = S.time = null; }
      if (S.step === 0 && S.time && mods().includes("PETCT") && S.time >= "12:00") S.time = null;
      go(S.step + 1);
    }
    else if (t.hasAttribute("data-prev")) go(S.step - 1);
    else if (t.id === "submit") {
      const r = {
        code: "LM-" + Date.now().toString(36).toUpperCase().slice(-6),
        scans: [...S.scans], addons: [...S.addons], center: S.center,
        date: S.date, time: S.time, name: S.info.name, total: totals().total, createdAt: new Date().toISOString()
      };
      saveReservation(r);
      $("#stepper").innerHTML = STEPS.map(s => `<span class="done"><i>✓</i>${s}</span>`).join("");
      $("#step").innerHTML = stepDone(r);
      scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  $("#step").addEventListener("change", e => {
    const t = e.target;
    if (t.dataset.scan) {
      t.checked ? S.scans.add(t.dataset.scan) : S.scans.delete(t.dataset.scan);
      render();
    } else if (t.dataset.addon) {
      t.checked ? S.addons.add(t.dataset.addon) : S.addons.delete(t.dataset.addon);
      render();
    } else if (t.type === "radio") {
      S.screen[t.name] = t.value;
      $("#warns").innerHTML = screenWarnings().map(x => `<div class="notice warn">${x}</div>`).join("");
      refreshNext();
    } else if (t.id === "agree1" || t.id === "agree2") {
      S.info[t.id] = t.checked; refreshNext();
    } else if (t.closest("#info-form")) {
      S.info[t.name] = t.value; refreshNext();
    }
  });
  $("#step").addEventListener("input", e => {
    if (e.target.closest("#info-form")) { S.info[e.target.name] = e.target.value; refreshNext(); }
  });

  render();
}

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  renderHeader(page);
  renderFooter();
  ({ home: initHome, centers: initCenters, book: initBook }[page] || (() => {}))();
  initReveal();
});

function initReveal() {
  const els = $$(".reveal");
  if (!("IntersectionObserver" in window)) return els.forEach(e => e.classList.add("in"));
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
  }), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  els.forEach((e, i) => { e.style.transitionDelay = `${(i % 4) * 70}ms`; io.observe(e); });
}
