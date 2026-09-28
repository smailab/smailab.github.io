/* =========================================================
   RegenDoc 공통 스크립트
   ========================================================= */

const BRAND = { name: "RegenDoc", ko: "리젠닥", tel: "1588-0000", kakao: "#" };

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const won = n => n.toLocaleString("ko-KR") + "원";
const catName = id => (CATEGORIES.find(c => c.id === id) || {}).name || id;
const minPrice = c => Math.min(...c.programs.map(p => p.price));
const stars = n => "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

/* ---------- Header / Footer ---------- */
function renderHeader(active) {
  const links = [
    ["index.html#categories", "재생의료 가이드", "guide"],
    ["clinics.html", "클리닉 찾기", "clinics"],
    ["clinics.html?cat=checkup", "프리미엄 검진", "checkup"],
    ["community.html", "커뮤니티", "community"],
    ["index.html#faq", "자주 묻는 질문", "faq"]
  ];
  $("#site-header").innerHTML = `
    <header class="header">
      <div class="container">
        <a href="index.html" class="logo">
          <span class="logo-mark">R</span>
          <span>${BRAND.name}<small>LONGEVITY · REGENERATIVE</small></span>
        </a>
        <nav class="nav" id="nav">
          ${links.map(([h, t, k]) => `<a href="${h}" class="${k === active ? "active" : ""}">${t}</a>`).join("")}
        </nav>
        <div class="header-cta">
          <a href="tel:${BRAND.tel}" class="btn btn-outline btn-sm">📞 ${BRAND.tel}</a>
          <a href="index.html#consult" class="btn btn-gold btn-sm">무료 상담</a>
          <button class="menu-btn" aria-label="메뉴" onclick="document.getElementById('nav').classList.toggle('open')">☰</button>
        </div>
      </div>
    </header>`;
}

function renderFooter() {
  $("#site-footer").innerHTML = `
    <footer class="footer">
      <div class="container">
        <div class="footer-top">
          <div>
            <a href="index.html" class="logo"><span class="logo-mark">R</span><span>${BRAND.name}</span></a>
            <p>검증된 재생의료·롱제비티·프리미엄 검진 클리닉을<br>한 곳에서 비교하고 상담받는 헬스케어 플랫폼</p>
          </div>
          <div>
            <h4>서비스</h4>
            <ul>
              <li><a href="clinics.html">클리닉 찾기</a></li>
              <li><a href="clinics.html?cat=checkup">프리미엄 검진</a></li>
              <li><a href="clinics.html?cat=stemcell">줄기세포 치료</a></li>
              <li><a href="index.html#consult">무료 상담 신청</a></li>
            </ul>
          </div>
          <div>
            <h4>고객센터</h4>
            <ul>
              <li>${BRAND.tel}</li>
              <li>평일 09:00 – 18:00</li>
              <li>점심 12:00 – 13:00</li>
              <li>help@regendoc.example</li>
            </ul>
          </div>
          <div>
            <h4>제휴 문의</h4>
            <ul>
              <li><a href="index.html#consult">병원 입점 신청</a></li>
              <li><a href="#">이용약관</a></li>
              <li><a href="#"><b>개인정보처리방침</b></a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          상호: ${BRAND.name}(${BRAND.ko}) | 대표: 000 | 사업자등록번호: 000-00-00000 | 통신판매업신고: 0000-서울강남-0000<br>
          주소: 서울특별시 강남구 000로 00 | © ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.
          <div class="disclaimer">
            ${BRAND.name}은 의료기관이 아닌 정보 제공 및 상담 연결 플랫폼으로, 진료 및 치료 행위에 대한 책임은 각 의료기관에 있습니다.
            모든 시술·치료는 개인에 따라 효과와 부작용이 다를 수 있으므로 반드시 의료진과 충분히 상담하시기 바랍니다.
            현재 사이트에 게재된 클리닉·후기·가격 정보는 시연용 샘플 데이터입니다.
          </div>
        </div>
      </div>
    </footer>
    <div class="float-cta">
      <a href="${BRAND.kakao}" class="kakao" title="카카오톡 상담">💬</a>
      <a href="tel:${BRAND.tel}" class="tel" title="전화 상담">📞</a>
    </div>
    <div class="modal-bg" id="modal">
      <div class="modal">
        <div class="ok">✓</div>
        <h3>상담 신청이 완료되었습니다</h3>
        <p>영업일 기준 24시간 이내에<br>전담 코디네이터가 연락드리겠습니다.</p>
        <button class="btn btn-primary btn-block" onclick="document.getElementById('modal').classList.remove('open')">확인</button>
      </div>
    </div>`;
}

/* ---------- Clinic card ---------- */
function clinicCard(c) {
  return `
    <a href="clinic.html?id=${c.id}" class="clinic-card">
      <div class="clinic-thumb" style="background:linear-gradient(135deg, ${c.color[0]}, ${c.color[1]})">
        <span class="initial">${esc(c.name.charAt(0))}</span>
        <span class="region">📍 ${esc(c.region)}</span>
      </div>
      <div class="clinic-body">
        <div class="rating"><span class="star">★</span><b>${c.rating}</b><small>(${c.reviews}개 후기)</small></div>
        <h3>${esc(c.name)}</h3>
        <p class="summary">${esc(c.summary)}</p>
        <div class="chips">${c.categories.map(id => `<span class="chip">${catName(id)}</span>`).join("")}</div>
        <div class="clinic-foot">
          <span class="from">최저 <b>${won(minPrice(c))}</b>~</span>
          <span class="btn btn-primary btn-sm">상세보기</span>
        </div>
      </div>
    </a>`;
}

function reviewCard(r) {
  const c = CLINICS.find(x => x.id === r.clinicId);
  return `
    <div class="review-card">
      <div class="stars">${stars(r.rating)}</div>
      <p>“${esc(r.text)}”</p>
      <div class="meta"><b>${esc(r.user)}</b> · ${esc(r.age)}<br>${esc(c ? c.name : "")} · ${esc(r.program)}</div>
    </div>`;
}

const BOARDS = { column: "전문의 칼럼", free: "자유게시판", review: "치료 후기" };

function postCard(p) {
  return `
    <a href="community.html?id=${p.id}" class="post-card">
      <div class="chips"><span class="chip gold">${BOARDS[p.board]}</span><span class="chip">${esc(p.tag)}</span></div>
      <h3>${esc(p.title)}</h3>
      <p>${esc(p.body)}</p>
      <div class="post-meta">${esc(p.author)} · ${p.date} · 조회 ${p.views.toLocaleString()}</div>
    </a>`;
}

/* ---------- Consult form ---------- */
function initConsultForm(form) {
  if (!form) return;
  const clinicSel = $("select[name=clinic]", form);
  if (clinicSel) {
    clinicSel.innerHTML = `<option value="">추천받기 (선택 안 함)</option>` +
      CLINICS.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
  }
  const interest = $(".check-group", form);
  if (interest && !interest.children.length) {
    interest.innerHTML = CATEGORIES.map(c =>
      `<label><input type="checkbox" name="interest" value="${c.id}"><span>${c.name}</span></label>`).join("");
  }
  const phone = $("input[name=phone]", form);
  phone && phone.addEventListener("input", () => {
    const d = phone.value.replace(/\D/g, "").slice(0, 11);
    phone.value = d.length < 4 ? d : d.length < 8 ? `${d.slice(0, 3)}-${d.slice(3)}` : `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    const fd = new FormData(form);
    if (!/^01\d-\d{3,4}-\d{4}$/.test(fd.get("phone") || "")) {
      alert("연락처를 올바르게 입력해 주세요. (예: 010-1234-5678)");
      phone && phone.focus();
      return;
    }
    const data = Object.fromEntries(fd.entries());
    data.interest = fd.getAll("interest");
    data.createdAt = new Date().toISOString();
    // TODO: 실제 운영 시 백엔드 API / 구글폼 / CRM 웹훅으로 전송하도록 교체
    try {
      const list = JSON.parse(localStorage.getItem("regendoc_consults") || "[]");
      list.push(data);
      localStorage.setItem("regendoc_consults", JSON.stringify(list));
    } catch (_) { /* storage unavailable */ }
    form.reset();
    $("#modal").classList.add("open");
  });
}

function consultFormHTML(presetClinicId) {
  return `
    <form class="consult-form">
      <div class="form-row">
        <div class="field"><label>이름 *</label><input name="name" required placeholder="홍길동"></div>
        <div class="field"><label>연락처 *</label><input name="phone" required inputmode="numeric" placeholder="010-0000-0000"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>연령대</label>
          <select name="age"><option>30대</option><option selected>40대</option><option>50대</option><option>60대</option><option>70대 이상</option></select>
        </div>
        <div class="field"><label>희망 지역</label>
          <select name="region"><option value="">상관없음</option>${REGIONS.map(r => `<option>${r}</option>`).join("")}</select>
        </div>
      </div>
      <div class="field"><label>관심 분야 (복수 선택)</label><div class="check-group"></div></div>
      <div class="field"><label>희망 클리닉</label><select name="clinic"></select></div>
      <div class="field"><label>상담 내용</label><textarea name="message" placeholder="현재 건강 상태, 관심 있는 치료나 검진, 궁금한 점을 자유롭게 적어주세요."></textarea></div>
      <label class="agree"><input type="checkbox" required> 개인정보 수집·이용에 동의합니다. (필수)</label>
      <button class="btn btn-gold btn-block" type="submit">무료 상담 신청하기</button>
    </form>`;
}

/* ---------- Pages ---------- */
function initHome() {
  $("#cat-grid").innerHTML = CATEGORIES.map(c => `
    <a href="clinics.html?cat=${c.id}" class="cat-card">
      <div class="ico">${c.icon}</div><h3>${c.name}</h3><p>${c.desc}</p>
    </a>`).join("");

  const top = [...CLINICS].sort((a, b) => b.rating * 1000 + b.reviews - (a.rating * 1000 + a.reviews)).slice(0, 6);
  $("#featured").innerHTML = top.map(clinicCard).join("");
  $("#review-track").innerHTML = REVIEWS.map(reviewCard).join("");
  $("#column-preview").innerHTML = POSTS.filter(p => p.board === "column").slice(0, 3).map(postCard).join("");
  $("#faq-list").innerHTML = FAQS.map((f, i) => `
    <details ${i === 0 ? "open" : ""}><summary>${f.q}</summary><p>${f.a}</p></details>`).join("");

  $("#s-region").innerHTML = `<option value="">전체 지역</option>` + REGIONS.map(r => `<option>${r}</option>`).join("");
  $("#s-cat").innerHTML = `<option value="">전체 분야</option>` + CATEGORIES.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  $("#search").addEventListener("submit", e => {
    e.preventDefault();
    const p = new URLSearchParams();
    const r = $("#s-region").value, c = $("#s-cat").value, q = $("#s-q").value.trim();
    if (r) p.set("region", r);
    if (c) p.set("cat", c);
    if (q) p.set("q", q);
    location.href = "clinics.html" + (p.toString() ? "?" + p : "");
  });

  $("#stat-clinics").textContent = CLINICS.length + "곳+";
  $("#stat-reviews").textContent = CLINICS.reduce((s, c) => s + c.reviews, 0).toLocaleString() + "+";

  $("#consult-slot").innerHTML = consultFormHTML();
  initConsultForm($(".consult-form"));
}

function initList() {
  const params = new URLSearchParams(location.search);
  const state = {
    q: params.get("q") || "",
    regions: new Set(params.get("region") ? [params.get("region")] : []),
    cats: new Set(params.get("cat") ? [params.get("cat")] : []),
    sort: "rec"
  };

  $("#f-q").value = state.q;
  $("#f-region").innerHTML = REGIONS.map(r =>
    `<label class="opt"><input type="checkbox" value="${r}" ${state.regions.has(r) ? "checked" : ""}> ${r}</label>`).join("");
  $("#f-cat").innerHTML = CATEGORIES.map(c =>
    `<label class="opt"><input type="checkbox" value="${c.id}" ${state.cats.has(c.id) ? "checked" : ""}> ${c.icon} ${c.name}</label>`).join("");

  const render = () => {
    const q = state.q.toLowerCase();
    let list = CLINICS.filter(c =>
      (!state.regions.size || state.regions.has(c.region)) &&
      (!state.cats.size || c.categories.some(id => state.cats.has(id))) &&
      (!q || [c.name, c.summary, c.region, ...c.tags, ...c.programs.map(p => p.name)].join(" ").toLowerCase().includes(q))
    );
    const sorters = {
      rec: (a, b) => b.rating * 1000 + b.reviews - (a.rating * 1000 + a.reviews),
      rating: (a, b) => b.rating - a.rating,
      reviews: (a, b) => b.reviews - a.reviews,
      price: (a, b) => minPrice(a) - minPrice(b)
    };
    list.sort(sorters[state.sort]);
    $("#count").innerHTML = `총 <b>${list.length}</b>개 클리닉`;
    $("#list").innerHTML = list.length ? list.map(clinicCard).join("")
      : `<div class="empty" style="grid-column:1/-1">조건에 맞는 클리닉이 없습니다.<br><br><a href="index.html#consult" class="btn btn-gold btn-sm">코디네이터에게 추천받기</a></div>`;
    const title = state.cats.size === 1 ? catName([...state.cats][0]) + " 클리닉" : "클리닉 찾기";
    $("#page-title").textContent = title;
  };

  $("#f-q").addEventListener("input", e => { state.q = e.target.value; render(); });
  $("#f-region").addEventListener("change", e => { e.target.checked ? state.regions.add(e.target.value) : state.regions.delete(e.target.value); render(); });
  $("#f-cat").addEventListener("change", e => { e.target.checked ? state.cats.add(e.target.value) : state.cats.delete(e.target.value); render(); });
  $("#sort").addEventListener("change", e => { state.sort = e.target.value; render(); });
  $("#reset").addEventListener("click", () => {
    state.q = ""; state.regions.clear(); state.cats.clear();
    $("#f-q").value = ""; $$(".filters input[type=checkbox]").forEach(i => (i.checked = false));
    render();
  });
  render();
}

function initDetail() {
  const id = Number(new URLSearchParams(location.search).get("id"));
  const c = CLINICS.find(x => x.id === id) || CLINICS[0];
  document.title = `${c.name} | ${BRAND.name}`;

  const hero = $("#detail-hero");
  hero.style.background = `linear-gradient(135deg, ${c.color[0]}, ${c.color[0]} 55%, ${c.color[1]})`;
  hero.innerHTML = `
    <div class="container">
      <div class="crumb"><a href="index.html">홈</a> › <a href="clinics.html">클리닉 찾기</a> › ${esc(c.region)}</div>
      <div class="chips">${c.tags.map(t => `<span class="chip">${esc(t)}</span>`).join("")}</div>
      <h1>${esc(c.name)}</h1>
      <p class="summary">${esc(c.summary)}</p>
      <div class="rating"><span class="star">★</span><b>${c.rating}</b><small>· 후기 ${c.reviews}개 · 📍 ${esc(c.region)}</small></div>
    </div>`;

  const reviews = REVIEWS.filter(r => r.clinicId === c.id);
  $("#detail-main").innerHTML = `
    <div class="tabs">
      <a href="#intro" class="active">소개</a><a href="#programs">프로그램·가격</a><a href="#doctors">의료진</a><a href="#reviews">후기</a><a href="#location">위치·진료시간</a>
    </div>
    <section class="detail-sec" id="intro">
      <h2>클리닉 소개</h2>
      <p>${esc(c.intro)}</p>
      <div class="chips" style="margin-top:16px">${c.categories.map(id => `<a href="clinics.html?cat=${id}" class="chip gold">${catName(id)}</a>`).join("")}</div>
    </section>
    <section class="detail-sec" id="programs">
      <h2>프로그램 · 가격</h2>
      ${c.programs.map(p => `
        <div class="program">
          <div><h3>${esc(p.name)}</h3><p>${esc(p.desc)}</p><p>⏱ 소요 ${esc(p.duration)}</p></div>
          <div class="price"><b>${won(p.price)}</b><small>VAT 포함 · 참고가</small></div>
        </div>`).join("")}
      <p style="font-size:13px;color:var(--muted);margin-top:8px">※ 표시 가격은 참고용이며 진료 결과에 따라 달라질 수 있습니다.</p>
    </section>
    <section class="detail-sec" id="doctors">
      <h2>의료진</h2>
      ${c.doctors.map(d => `
        <div class="doctor">
          <div class="avatar">${esc(d.name.charAt(0))}</div>
          <div><h3>${esc(d.name)}</h3><div class="title">${esc(d.title)}</div>
          <ul>${d.career.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
        </div>`).join("")}
    </section>
    <section class="detail-sec" id="reviews">
      <h2>실제 이용 후기 <small style="color:var(--muted);font-size:15px">(${c.reviews})</small></h2>
      ${reviews.length ? `<div class="review-track" style="grid-auto-flow:row;grid-auto-columns:auto;grid-template-columns:1fr">${reviews.map(reviewCard).join("")}</div>`
        : `<div class="empty">아직 등록된 후기가 없습니다.</div>`}
    </section>
    <section class="detail-sec" id="location">
      <h2>위치 · 진료시간</h2>
      <table class="info-table">
        <tr><th>주소</th><td>${esc(c.address)}</td></tr>
        <tr><th>진료시간</th><td>${esc(c.hours)}</td></tr>
        <tr><th>대표번호</th><td>${esc(c.phone)}</td></tr>
      </table>
      <div class="map-ph">🗺️ 지도 영역 (카카오맵 / 네이버지도 API 연동 위치)</div>
    </section>`;

  $("#side").innerHTML = `
    <div class="side-card">
      <h3>이 클리닉에 상담 신청</h3>
      <p class="sub">최저 ${won(minPrice(c))}부터 · 상담은 무료입니다</p>
      ${consultFormHTML()}
    </div>`;
  const form = $("#side .consult-form");
  initConsultForm(form);
  $("select[name=clinic]", form).value = c.id;

  $("#mobile-bar").innerHTML = `
    <a href="tel:${BRAND.tel}" class="btn btn-outline">📞 전화 상담</a>
    <a href="index.html#consult" class="btn btn-gold">무료 상담 신청</a>`;

  const others = CLINICS.filter(x => x.id !== c.id && x.categories.some(k => c.categories.includes(k))).slice(0, 3);
  $("#related").innerHTML = others.map(clinicCard).join("");

  // tabs active state
  const tabs = $$(".tabs a");
  const secs = tabs.map(a => $(a.getAttribute("href")));
  window.addEventListener("scroll", () => {
    let idx = 0;
    secs.forEach((s, i) => { if (s.getBoundingClientRect().top < 160) idx = i; });
    tabs.forEach((t, i) => t.classList.toggle("active", i === idx));
  }, { passive: true });
}

function initCommunity() {
  const params = new URLSearchParams(location.search);
  const root = $("#community");
  const id = Number(params.get("id"));
  const post = POSTS.find(p => p.id === id);

  if (post) {
    document.title = `${post.title} | ${BRAND.name}`;
    const more = POSTS.filter(p => p.board === post.board && p.id !== post.id).slice(0, 3);
    root.innerHTML = `
      <article class="article">
        <a href="community.html?board=${post.board}" class="more-link">← ${BOARDS[post.board]} 목록</a>
        <div class="chips" style="margin-top:24px"><span class="chip gold">${BOARDS[post.board]}</span><span class="chip">${esc(post.tag)}</span></div>
        <h1>${esc(post.title)}</h1>
        <div class="post-meta">${esc(post.author)} · ${post.date} · 조회 ${post.views.toLocaleString()}</div>
        <div class="body">${esc(post.body)}</div>
      </article>
      ${more.length ? `<div class="section-head" style="margin-top:64px"><div><h2>함께 보면 좋은 글</h2></div></div>
      <div class="post-grid">${more.map(postCard).join("")}</div>` : ""}`;
    return;
  }

  const board = BOARDS[params.get("board")] ? params.get("board") : "all";
  const list = POSTS.filter(p => board === "all" || p.board === board);
  root.innerHTML = `
    <div class="board-tabs">
      <a href="community.html" class="${board === "all" ? "active" : ""}">전체</a>
      ${Object.entries(BOARDS).map(([k, v]) => `<a href="community.html?board=${k}" class="${board === k ? "active" : ""}">${v}</a>`).join("")}
    </div>
    ${board === "column" ? `<div class="post-grid">${list.map(postCard).join("")}</div>` : `
    <div class="board-list">
      <div class="board-row head"><span>분류</span><span>제목</span><span>작성자</span><span>날짜</span><span>조회</span></div>
      ${list.map(p => `
        <a href="community.html?id=${p.id}" class="board-row">
          <span><span class="chip ${p.board === "column" ? "gold" : ""}">${BOARDS[p.board]}</span></span>
          <span class="t">${esc(p.title)}</span>
          <span class="m">${esc(p.author)}</span>
          <span class="m">${p.date}</span>
          <span class="m">${p.views.toLocaleString()}</span>
        </a>`).join("")}
    </div>`}
    <div style="text-align:right;margin-top:20px">
      <button class="btn btn-primary btn-sm" onclick="alert('글쓰기는 회원 로그인 기능 연동 후 이용할 수 있습니다.')">✏️ 글쓰기</button>
    </div>`;
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  renderHeader(page);
  renderFooter();
  if (page === "home") initHome();
  if (page === "clinics") initList();
  if (page === "detail") initDetail();
  if (page === "community") initCommunity();
});
