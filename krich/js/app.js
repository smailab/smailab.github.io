/* K-Rich Clinic – 공통 UI + 랜딩 렌더링 + 예약 플로우 */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const yen = n => '¥' + Math.round(Number(n)).toLocaleString('ja-JP');
  const krwOf = n => Math.round(n * FX.krwPerJpy / 100) * 100;
  const krw = n => '약 ' + krwOf(n).toLocaleString('ko-KR') + '원';
  /* 엔 + (원화) 표기. 원화 부분은 환율 수신 후 자동 갱신 */
  const yk = (n, cls = '') => `${yen(n)} <span class="krw ${cls}" data-jpy="${n}">(${krw(n)})</span>`;
  function applyFx() { document.querySelectorAll('.krw[data-jpy]').forEach(el => { el.textContent = '(' + krw(+el.dataset.jpy) + ')'; }); document.querySelectorAll('.fx-note').forEach(el => { el.textContent = `원화는 ${FX.live ? '실시간' : '기준'} 환율 100엔 = ${(FX.krwPerJpy * 100).toFixed(2)}원 (${FX.asOf}) 기준 참고용이며, 실제 청구는 엔화로 이루어집니다.`; }); }
  async function loadFx() {
    for (const src of FX.sources) {
      try {
        const r = await fetch(src.url, { cache: 'no-store' }); if (!r.ok) continue;
        const j = await r.json(); const v = +src.pick(j);
        if (v > 1 && v < 20) { FX.krwPerJpy = v; FX.asOf = (src.date(j) || new Date().toISOString().slice(0, 10)); FX.live = true; applyFx(); document.dispatchEvent(new Event('fx')); return; }
      } catch (e) { /* 다음 소스 시도 */ }
    }
    applyFx();
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const STORE_KEY = 'krich_bookings';
  const API = (typeof CHATBOT !== 'undefined' && CHATBOT.endpoint ? CHATBOT.endpoint.replace(/\/$/, '') : '');
  const AUTH_KEY = 'krich_session', ACC_KEY = 'krich_account';
  const authToken = () => { try { return localStorage.getItem(AUTH_KEY) || ''; } catch { return ''; } };
  const account = () => { try { return JSON.parse(localStorage.getItem(ACC_KEY) || 'null'); } catch { return null; } };
  const setAuth = (token, acc) => { try { token ? localStorage.setItem(AUTH_KEY, token) : localStorage.removeItem(AUTH_KEY); acc ? localStorage.setItem(ACC_KEY, JSON.stringify(acc)) : localStorage.removeItem(ACC_KEY); } catch {} };
  async function apiCall(path, opts = {}) {
    const r = await fetch(API + path, { ...opts, headers: { 'Content-Type': 'application/json', ...(authToken() ? { Authorization: 'Bearer ' + authToken() } : {}), ...(opts.headers || {}) } });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && path.startsWith('/account/') && path !== '/account/login' && path !== '/account/register') setAuth('', null);
    if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
    return j;
  }
  /* 채팅 상담 링크: 카카오톡 또는 LINE URL이 있을 때만 버튼 표시 */
  const CHAT = CLINIC.kakao ? { url: CLINIC.kakao, label: '카카오톡 상담', cls: 'btn-kakao', icon: '' } : CLINIC.line ? { url: CLINIC.line, label: 'LINE 상담', cls: 'btn-line', icon: '' } : null;
  const chatBtn = (extra = '') => CHAT ? `<a class="btn ${CHAT.cls} ${extra}" href="${CHAT.url}" target="_blank" rel="noopener">${CHAT.label}</a>` : `<a class="btn btn-outline ${extra}" href="#chat" data-open-chat>AI 상담</a>`;

  /* ---------- header / footer ---------- */
  function header() {
    const el = $('#site-header'); if (!el) return;
    el.innerHTML = `
      <div class="topbar">한일 양국 의사면허 원장이 한국어로 진료합니다. <b>온라인 예약 시 초진 상담료 0엔</b></div>
      <header class="site-header">
        <div class="container">
          <a class="logo" href="index.html"><img src="brand/logo.svg" alt="K-RICH Clinic" class="logo-img"><small>FUKUOKA · 福岡</small></a>
          <nav class="nav">
            <a href="index.html#mounjaro">마운자로란</a>
            <a href="index.html#price">가격</a>
            <a href="index.html#flow">진료 절차</a>
            <a href="index.html#access">오시는 길</a>
            <a href="index.html#faq">FAQ</a>
            <a href="book.html?my=1" id="nav-my">예약 확인</a>
          </nav>
          <div class="header-cta">
            ${chatBtn('btn-sm')}
            <a class="btn btn-primary btn-sm" href="book.html">온라인 예약</a>
          </div>
          <button class="menu-btn" id="menu-btn" aria-label="메뉴">☰</button>
        </div>
        <div class="mobile-nav" id="mobile-nav">
          <a href="index.html#mounjaro">마운자로란</a>
          <a href="index.html#price">가격</a>
          <a href="index.html#flow">진료 절차</a>
          <a href="index.html#access">오시는 길</a>
          <a href="index.html#faq">FAQ</a>
          <a href="book.html?my=1">예약 확인</a>
        </div>
      </header>`;
    $('#menu-btn').addEventListener('click', () => $('#mobile-nav').classList.toggle('open'));
    document.querySelectorAll('#mobile-nav a').forEach(a => a.addEventListener('click', () => $('#mobile-nav').classList.remove('open')));
    const acc = account();
    if (acc) document.querySelectorAll('#nav-my').forEach(a => { a.textContent = acc.name + '님 예약'; });
    document.querySelectorAll('#kakao-hero, #kakao-cta').forEach(a => { if (!CHAT) { a.href = '#chat'; a.setAttribute('data-open-chat', ''); a.classList.remove('btn-kakao'); a.textContent = 'AI 상담'; return; } a.href = CHAT.url; a.textContent = CHAT.label + (a.id === 'kakao-cta' ? '으로 문의' : ''); if (a.id === 'kakao-hero') { a.classList.remove('btn-kakao'); a.classList.add(CHAT.cls); } });
    document.querySelectorAll('.tel-link').forEach(a => { a.href = 'tel:' + CLINIC.phoneIntl; a.textContent = CLINIC.phone; });
  }

  function footer() {
    const el = $('#site-footer'); if (!el) return;
    el.innerHTML = `
      <footer class="site-footer">
        <div class="container">
          <div>
            <a class="logo" href="index.html"><img src="brand/logo.svg" alt="K-RICH Clinic" class="logo-img inv"><small>FUKUOKA · 福岡</small></a>
            <p style="margin:14px 0 6px">${esc(CLINIC.nameJa)} · ${esc(CLINIC.dept)}<br>${esc(CLINIC.address)}</p>
            <p style="margin:0">TEL <a href="tel:${CLINIC.phoneIntl}">${esc(CLINIC.phone)}</a>${CLINIC.phoneLocal ? ` (일본 내 ${esc(CLINIC.phoneLocal)})` : ''}${CLINIC.email ? ' · ' + esc(CLINIC.email) : ''}</p>
          </div>
          <div>
            <h4>진료시간</h4>
            <ul>${CLINIC.hours.map(h => `<li>${esc(h.day)} &nbsp; ${esc(h.time)}</li>`).join('')}</ul>
          </div>
          <div>
            <h4>상담 · 예약</h4>
            <ul>
              ${CLINIC.line ? `<li><a href="${CLINIC.line}" target="_blank" rel="noopener">LINE 공식계정</a></li>` : ''}
              ${CLINIC.kakao ? `<li><a href="${CLINIC.kakao}" target="_blank" rel="noopener">카카오톡 채널</a></li>` : ''}
              <li><a href="#chat" data-open-chat>AI 상담 (24시간)</a></li>
              <li><a href="tel:${CLINIC.phoneIntl}">전화 예약 ${esc(CLINIC.phone)}</a></li>
              <li><a href="${CLINIC.webReserve}" target="_blank" rel="noopener">공식 WEB 예약 (일본어)</a></li>
              <li><a href="${CLINIC.instagram}" target="_blank" rel="noopener">Instagram @k_rich_clinic</a></li>
              <li><a href="${CLINIC.site}" target="_blank" rel="noopener">공식 사이트 (k-rich.jp)</a></li>
              <li><a href="book.html">온라인 예약</a></li>
              <li><a href="book.html?my=1">예약 확인 · 취소</a></li>
            </ul>
          </div>
          <div class="legal">
            마운자로(Mounjaro)는 일라이 릴리의 등록상표입니다. 일본에서 2형 당뇨병 치료제로 승인된 의약품이며, 체중 관리 목적 사용은 적응증 외 사용으로 본 클리닉은 자유진료(비보험)로 처방합니다. 자유진료 의약품은 일본 의약품 부작용 피해 구제 제도의 대상이 아닙니다. 흔한 부작용: 메스꺼움·설사·식욕 저하. 의약품은 의사의 진료 후 처방 여부가 결정되며 효과와 부작용에는 개인차가 있습니다. 한국 반입 기준(2026-11-12 시행, 3개월분까지 휴대 반입)은 변경될 수 있으니 출국 전 관세청(125)에 확인하세요. 본 사이트의 내용은 의학적 진단을 대체하지 않습니다. 개인정보는 예약·진료 목적으로만 사용됩니다.<br>
            © ${new Date().getFullYear()} ${esc(CLINIC.nameJa)}. All rights reserved.
          </div>
        </div>
      </footer>
      <div class="sticky-cta">
        <a class="btn btn-outline" href="tel:${CLINIC.phoneIntl}">전화 예약</a>
        <a class="btn btn-primary" href="book.html">온라인 예약</a>
      </div>`;
  }

  /* ---------- landing ---------- */
  function home() {
    const first = PRICES.pens[0];
    const ledger = $('#ledger');
    if (ledger) ledger.innerHTML = PRICES.pens.map(p => `<div class="ledger-row">
      <span class="ledger-dose">${p.dose}<span>mg · ${esc(p.weeks)}</span></span>
      <span class="ledger-price">${yen(p.set4)}<small class="krw" data-jpy="${p.set4}">${krw(p.set4)}</small></span></div>`).join('');

    $('#why-grid').innerHTML = WHY.map(w => `<div class="row-item"><h3>${esc(w.title)}</h3><p>${esc(w.desc)}</p></div>`).join('');

    $('#dose-rows').innerHTML = PRICES.dosesInfo.map(p => `<div class="dose-row"><b>${p.dose}mg</b><div class="bar"></div><span>${esc(p.weeks)}</span></div>`).join('');

    $('#pen-rows').innerHTML = PRICES.pens.map(p => `<tr><td>마운자로 ${p.dose}mg × 4개 (4주분) ${p.first ? '<span class="tag">초진 시작 용량</span>' : ''}<span class="sub">${esc(p.weeks)} · 1펜 = 1주분 · 펜 1개당 ${yen(p.price)}</span></td><td class="num">${yen(p.set4)}<span class="krw" data-jpy="${p.set4}">(${krw(p.set4)})</span></td></tr>`).join('');
    $('#consult-rows').innerHTML = PRICES.consult.map(c => `<tr><td>${esc(c.name)}<span class="sub">${esc(c.note)}</span></td><td class="num">${c.price === 0 ? '¥0' : yen(c.price) + `<span class="krw" data-jpy="${c.price}">(${krw(c.price)})</span>`}</td></tr>`).join('');

    $('#pack-cards').innerHTML = PRICES.packs.map((pk, i) => {
      const base = first.price * pk.pens, total = Math.round(base * (1 - pk.discount));
      return `<div class="pack">
        <h3>2.5mg ${esc(pk.label)}</h3>
        <div class="price">${yen(total)} <small>세금 포함</small><span class="krw" data-jpy="${total}">(${krw(total)})</span></div>
        ${pk.discount ? `<div class="save">${Math.round(pk.discount * 100)}% 할인 · ${yen(base - total)} 절약</div>` : `<div class="save" style="color:var(--ink-3)">${pk.pens === 4 ? '기본 구성' : '4개 세트 × ' + (pk.pens / 4)}</div>`}
        <ul><li>원장 한국어 직접 진료</li><li>원내 첫 주사 + 자가주사 교육</li><li>영문 처방전·약제 증명서</li>${pk.note ? `<li><b>${esc(pk.note)}</b></li>` : ''}</ul>
        <a class="btn ${i === 2 ? 'btn-primary' : 'btn-outline'} btn-sm" href="book.html?pack=${pk.id}">이 구성으로 예약</a></div>`;
    }).join('');

    $('#trial-chart').innerHTML = TRIAL.bars.map(b => `<div class="trial-row"><span class="tl">${esc(b.label)}</span><div class="tb"><div class="tf ${b.label === '위약' ? 'placebo' : ''}" style="width:${(b.pct / 25) * 100}%"></div></div><b>−${b.pct}%</b></div>`).join('');
    $('#trial-stats').innerHTML = TRIAL.stats.map(t => `<div class="trial-stat"><b>${t.v}</b><span>${esc(t.k)}</span></div>`).join('');
    $('#trial-source').textContent = '출처: ' + TRIAL.source;

    const renderCompare = () => { const maxKrw = Math.max(...PRICES.compare.map(c => c.krw || krwOf(c.jpy)));
      $('#compare-rows').innerHTML = PRICES.compare.map(c => { const k = c.krw || krwOf(c.jpy); return `<div class="cmp-row ${c.us ? 'us' : ''}"><div class="cl"><b>${esc(c.label)}</b><span class="muted">${esc(c.note)}</span></div><div class="cb"><div class="cf" style="width:${(k / maxKrw) * 100}%"></div></div><div class="cv">${c.jpy ? yen(c.jpy) + '<small>' + krw(c.jpy) + '</small>' : '약 ' + k.toLocaleString('ko-KR') + '원'}</div></div>`; }).join(''); };
    renderCompare(); document.addEventListener('fx', renderCompare);

    $('#bring-grid').innerHTML = BRING.map(b => `<div class="row-item"><h3>${esc(b.title)}</h3><p>${esc(b.desc)}</p></div>`).join('');
    $('#qty-rows').innerHTML = QTY_GUIDE.map(q => `<tr><td>${esc(q.stay)}</td><td>${esc(q.shots)}</td><td class="num">${esc(q.home)}</td></tr>`).join('');
    $('#checklist').innerHTML = CHECKLIST.map(c => `<div class="row-item"><h3>${esc(c.t)}</h3><p>${esc(c.d)}</p></div>`).join('');

    $('#steps-list').innerHTML = STEPS.map(s => `<div class="step"><div class="n">${s.n}</div><h3>${esc(s.title)}</h3><p>${esc(s.desc)}</p></div>`).join('');
    $('#team-grid').innerHTML = DOCTORS.map(d => `<div class="card ${d.photo ? 'doctor' : ''}">${d.photo ? `<img class="avatar-photo" src="${d.photo}" alt="${esc(d.name)}">` : ''}<div><h3>${esc(d.name)}</h3><div class="role">${esc(d.role)}</div><p>${esc(d.bio)}</p>${d.quote ? `<p class="quote">“${esc(d.quote)}”</p>` : ''}</div></div>`).join('');
    $('#review-grid').innerHTML = REVIEWS.map(r => `<div class="review"><p>“${esc(r.text)}”</p><b>${esc(r.name)}</b></div>`).join('');

    $('#info-list').innerHTML = [
      ['주소', `${esc(CLINIC.addressKo)}<br><span class="muted">${esc(CLINIC.address)}</span>`],
      ['진료시간', CLINIC.hours.map(h => `${esc(h.day)} ${esc(h.time)}`).join('<br>')],
      ['진료과목', esc(CLINIC.dept)],
      ['전화', `<a href="tel:${CLINIC.phoneIntl}">${esc(CLINIC.phone)}</a>${CLINIC.phoneLocal ? ` <span class="muted">(일본 내 ${esc(CLINIC.phoneLocal)})</span>` : ''}`],
      ['예약·상담', `<a href="book.html">온라인 예약</a> · <a href="#chat" data-open-chat>AI 상담</a> · <a href="tel:${CLINIC.phoneIntl}">전화</a> · <a href="${CLINIC.webReserve}" target="_blank" rel="noopener">공식 WEB 예약</a>${CLINIC.line ? ` · <a href="${CLINIC.line}" target="_blank" rel="noopener">LINE</a>` : ''}${CLINIC.kakao ? ` · <a href="${CLINIC.kakao}" target="_blank" rel="noopener">카카오톡</a>` : ''}`],
      ['공식 사이트', `<a href="${CLINIC.site}" target="_blank" rel="noopener">k-rich.jp</a> · <a href="${CLINIC.instagram}" target="_blank" rel="noopener">Instagram</a>`],
      ['결제', '엔화 현금 · VISA/Master/JCB/AMEX (간편결제는 예약 시 확인)'],
    ].map(([k, v]) => `<li><b>${k}</b><span>${v}</span></li>`).join('');
    $('#map-addr').textContent = CLINIC.addressKo;
    $('#map-link').href = CLINIC.mapUrl;
    if (CLINIC.mapEmbed) $('#map-frame').src = CLINIC.mapEmbed;

    $('#faq-list').innerHTML = FAQ.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('');
  }

  /* ---------- booking ---------- */
  const state = { step: 0, visit: 'first', dose: 2.5, pack: 'p4', receive: 'clinic', authMode: 'register', authEmail: '', verifyEmail: null, verifyName: '', extras: [], date: null, time: null, info: {}, screen: {}, agree: false, mix: '' };
  const STEP_NAMES = ['진료 선택', '날짜 · 시간', '회원 확인', '정보 · 사전 문진', '확인'];

  const load = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch { return []; } };
  const save = list => localStorage.setItem(STORE_KEY, JSON.stringify(list));

  function book() {
    const q = new URLSearchParams(location.search);
    if (q.get('pack') && PRICES.packs.some(p => p.id === q.get('pack'))) state.pack = q.get('pack');
    if (q.get('my')) { renderMy(); return; }
    render();
  }

  function price() {
    const pen = PRICES.pens.find(p => p.dose === state.dose);
    const pk = PRICES.packs.find(p => p.id === state.pack);
    const base = pen.price * pk.pens, pens = Math.round(base * (1 - pk.discount));
    const rcv = RECEIVE.find(r => r.id === state.receive);
    const extras = state.extras.reduce((s, id) => s + (PRICES.extras.find(e => e.id === id)?.price || 0), 0) + rcv.price;
    return { pen, pk, base, pens, extras, rcv, total: pens + extras };
  }

  function stepper() {
    $('#stepper').innerHTML = STEP_NAMES.map((n, i) => `<div class="${i === state.step ? 'active' : i < state.step ? 'done' : ''}">${i + 1}. ${n}</div>`).join('');
  }

  function summary() {
    const p = price();
    const dateTxt = state.date ? `${fmtDate(state.date)} ${state.time || ''}` : '-';
    $('#summary').innerHTML = `<h3>예약 요약</h3><dl>
      <div><dt>구분</dt><dd>${state.visit === 'first' ? '초진' : '재진'}</dd></div>
      <div><dt>용량</dt><dd>마운자로 ${p.pen.dose}mg</dd></div>
      <div><dt>구성</dt><dd>${esc(p.pk.label)}</dd></div>
      <div><dt>수령</dt><dd>${esc(p.rcv.title)}</dd></div>
      <div><dt>일시</dt><dd>${dateTxt}</dd></div>
      <div><dt>펜 합계</dt><dd>${yen(p.pens)}${p.pk.discount ? ` <span class="muted">(${Math.round(p.pk.discount * 100)}%↓)</span>` : ''}</dd></div>
      ${p.extras ? `<div><dt>배송·추가 옵션</dt><dd>${yen(p.extras)}</dd></div>` : ''}
      <div><dt>상담료</dt><dd>¥0</dd></div>
    </dl>
    <div class="total"><span>예상 금액<small>세금 포함 · 원내 결제</small></span><span>${yen(p.total)}<small class="krw" data-jpy="${p.total}" style="text-align:right">(${krw(p.total)})</small></span></div>
    <p class="muted" style="margin:12px 0 0">최종 처방 용량·수량은 의사 진료 후 결정되며 금액이 달라질 수 있습니다.</p>`;
  }

  function render() { stepper(); summary(); [step1, step2, stepAuth, step3, step4][state.step](); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  /* step 1 */
  function step1() {
    const el = $('#step');
    el.innerHTML = `<h2>1. 진료 · 처방 선택</h2><p class="desc">초진은 안전을 위해 2.5mg부터 시작합니다. 다른 병원에서 이미 사용 중이라면 "재진/이어서"를 선택하세요.</p>
      <h3 style="margin:0 0 10px">방문 구분</h3>
      <div class="choice-grid" id="visit">
        <button class="choice ${state.visit === 'first' ? 'selected' : ''}" data-v="first"><b>초진 (처음 시작)</b><span>의사 진료 + 주사 교육 + 2.5mg 처방</span></button>
        <button class="choice ${state.visit === 'repeat' ? 'selected' : ''}" data-v="repeat"><b>재진 / 이어서 처방</b><span>이미 사용 중 · 증량 용량 선택 가능</span></button>
      </div>
      <h3 style="margin:22px 0 10px">용량</h3>
      <div class="choice-grid" id="dose">${PRICES.pens.map(p => `<button class="choice ${state.dose === p.dose ? 'selected' : ''}" data-d="${p.dose}" ${state.visit === 'first' && p.dose !== 2.5 ? 'disabled' : ''}><b>${p.dose}mg</b><span>${esc(p.weeks)}</span><span class="p">${yen(p.set4)} / 4개 <span class="krw" data-jpy="${p.set4}">(${krw(p.set4)})</span></span></button>`).join('')}</div>
      <h3 style="margin:22px 0 10px">수량</h3>
      <div class="choice-grid" id="pack">${PRICES.packs.map(pk => `<button class="choice ${state.pack === pk.id ? 'selected' : ''}" data-p="${pk.id}"><b>${esc(pk.label)}</b><span>${pk.discount ? `${Math.round(pk.discount * 100)}% 할인` : pk.pens === 4 ? '기본' : '4개 세트 × ' + (pk.pens / 4)}${pk.note ? ' · ' + esc(pk.note) : ''}</span></button>`).join('')}</div>
      <p class="muted" style="margin:10px 0 0">일본에서 맞을 양 + 한국에 가져갈 양을 합쳐 최대 12개(3개월분)까지 처방합니다. 초진은 2.5mg 4개 + 5mg 8개처럼 증량 구성으로 드립니다.</p>
      ${RECEIVE.length > 1 ? `<h3 style="margin:22px 0 10px">수령 방법</h3><div class="choice-grid" id="receive">${RECEIVE.map(r => `<button class="choice ${state.receive === r.id ? 'selected' : ''}" data-r="${r.id}"><b>${esc(r.title)} <span class="tag-sm">${esc(r.tag)}</span></b><span>${esc(r.desc)}</span><span class="p">${r.price ? '배송비 ' + yk(r.price) : '추가 비용 없음'}</span></button>`).join('')}</div>` : ''}
      <h3 style="margin:22px 0 10px">추가 옵션</h3>
      <div class="grid" style="gap:8px">${PRICES.extras.map(e => `<label class="check"><input type="checkbox" data-e="${e.id}" ${state.extras.includes(e.id) ? 'checked' : ''}><span><b>${esc(e.name)}</b> &nbsp;<span style="color:var(--green);font-weight:700">${e.price ? yk(e.price) : '무료'}</span>${e.note ? `<br><span class="muted">${esc(e.note)}</span>` : ''}</span></label>`).join('')}</div>
      <label class="f" style="margin-top:18px">희망 구성 메모 (선택)<textarea id="mix" rows="2" placeholder="예) 2.5mg 4개 + 5mg 8개로 받고 싶어요">${esc(state.mix)}</textarea></label>
      <div class="actions"><span></span><button class="btn btn-primary" id="next">날짜 선택 →</button></div>`;
    el.querySelectorAll('#visit .choice').forEach(b => b.onclick = () => { state.visit = b.dataset.v; if (state.visit === 'first') state.dose = 2.5; step1(); summary(); });
    el.querySelectorAll('#dose .choice').forEach(b => b.onclick = () => { if (b.disabled) return; state.dose = +b.dataset.d; step1(); summary(); });
    el.querySelectorAll('#pack .choice').forEach(b => b.onclick = () => { state.pack = b.dataset.p; step1(); summary(); });
    el.querySelectorAll('#receive .choice').forEach(b => b.onclick = () => { state.receive = b.dataset.r; step1(); summary(); });
    el.querySelectorAll('input[data-e]').forEach(c => c.onchange = () => { state.extras = [...el.querySelectorAll('input[data-e]:checked')].map(x => x.dataset.e); summary(); });
    $('#mix').oninput = e => state.mix = e.target.value;
    $('#next').onclick = () => { state.step = 1; render(); };
  }

  /* step 2 – calendar */
  let calMonth = null;
  const pad = n => String(n).padStart(2, '0');
  const key = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  function fmtDate(k) { const [y, m, d] = k.split('-').map(Number); const dt = new Date(y, m - 1, d); return `${y}.${pad(m)}.${pad(d)} (${'일월화수목금토'[dt.getDay()]})`; }
  function isClosed(d) { return CLINIC.closedWeekdays.includes(d.getDay()) || (CLINIC.closedDates || []).includes(key(d)); }
  let takenCache = {};                 // { 'YYYY-MM-DD': Set(times) | 'loading' | 'error' }
  async function loadTaken(k) {
    if (!API) { takenCache[k] = new Set(); return; }
    takenCache[k] = 'loading';
    try {
      const r = await fetch(`${API}/slots?date=${encodeURIComponent(k)}`, { cache: 'no-store' });
      const j = await r.json();
      takenCache[k] = new Set(Array.isArray(j.taken) ? j.taken : []);
    } catch { takenCache[k] = 'error'; }
  }
  function slotsFor(k) {
    const [y, m, d] = k.split('-').map(Number); const dt = new Date(y, m - 1, d);
    const weekend = dt.getDay() === 0 || dt.getDay() === 6;
    const close = weekend ? CLINIC.closeHourWeekend : CLINIC.closeHourWeekday;
    const endMin = close * 60 - CLINIC.lastEntryMinutes, out = [];
    const taken = takenCache[k] instanceof Set ? takenCache[k] : new Set();
    for (let t = CLINIC.openHour * 60; t <= endMin; t += CLINIC.slotMinutes) {
      const sTime = `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
      if (CLINIC.lunch.includes(sTime)) continue;
      out.push({ time: sTime, full: taken.has(sTime) });
    }
    return out;
  }

  function step2() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const maxD = new Date(today); maxD.setDate(maxD.getDate() + CLINIC.maxDaysAhead);
    if (!calMonth) calMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const el = $('#step');
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    const firstDow = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
    let cells = '일월화수목금토'.split('').map((d, i) => `<div class="dow ${i === 0 ? 'sun' : ''}">${d}</div>`).join('');
    for (let i = 0; i < firstDow; i++) cells += '<div></div>';
    for (let d = 1; d <= days; d++) {
      const dt = new Date(y, m, d), k = key(dt);
      const dis = dt < today || dt > maxD || isClosed(dt);
      cells += `<button data-k="${k}" ${dis ? 'disabled' : ''} class="${state.date === k ? 'selected' : ''} ${k === key(today) ? 'today' : ''}">${d}</button>`;
    }
    const prevOk = new Date(y, m, 1) > new Date(today.getFullYear(), today.getMonth(), 1);
    const nextOk = new Date(y, m + 1, 1) <= maxD;
    el.innerHTML = `<h2>2. 내원 날짜 · 시간 선택</h2><p class="desc">한국 시간 기준으로 예약 가능합니다 (일본과 시차 없음). 접수 10:00~19:00, 휴진은 비정기이므로 확정 안내 시 함께 알려드립니다. 당일 예약은 전화(${esc(CLINIC.phone)})로 문의해 주세요.${state.receive === 'hotel' ? '' : ''}</p>
      <div class="cal-nav"><button id="prev" ${prevOk ? '' : 'disabled'}>‹</button><b>${y}년 ${m + 1}월</b><button id="next-m" ${nextOk ? '' : 'disabled'}>›</button></div>
      <div class="cal">${cells}</div>
      <div id="slots-wrap">${state.date ? (takenCache[state.date] === 'loading' ? '<p class="muted" style="margin-top:16px">가능한 시간을 불러오는 중…</p>' : slotsHtml()) : '<p class="muted" style="margin-top:16px">날짜를 선택하면 가능한 시간이 표시됩니다.</p>'}</div>
      <div class="actions"><button class="btn btn-outline" id="back">← 이전</button><button class="btn btn-primary" id="next" ${state.date && state.time ? '' : 'disabled'}>정보 입력 →</button></div>`;
    el.querySelectorAll('.cal button[data-k]').forEach(b => b.onclick = async () => {
      state.date = b.dataset.k; state.time = null;
      if (!(takenCache[state.date] instanceof Set)) { step2(); await loadTaken(state.date); }
      step2(); summary();
    });
    $('#prev').onclick = () => { calMonth = new Date(y, m - 1, 1); step2(); };
    $('#next-m').onclick = () => { calMonth = new Date(y, m + 1, 1); step2(); };
    el.querySelectorAll('.slots button').forEach(b => b.onclick = () => { if (b.disabled) return; state.time = b.dataset.t; step2(); summary(); });
    $('#back').onclick = () => { state.step = 0; render(); };
    $('#next').onclick = () => { if (state.date && state.time) { state.step = 2; render(); } };
  }
  function slotsHtml() {
    const s = slotsFor(state.date);
    return `<h3 style="margin:18px 0 0">${fmtDate(state.date)} 가능한 시간</h3><div class="slots">${s.map(x => `<button data-t="${x.time}" ${x.full ? 'disabled' : ''} class="${state.time === x.time ? 'selected' : ''}">${x.time}</button>`).join('')}</div><p class="muted" style="margin:10px 0 0">회색은 이미 예약된 시간입니다. 진료는 약 60분 소요됩니다.${takenCache[state.date] === 'error' ? ' <span style="color:var(--red)">예약 현황을 불러오지 못해 실제로는 마감된 시간이 있을 수 있습니다.</span>' : ''}</p>`;
  }

  /* step 3 – 회원 가입 / 로그인 */
  function stepAuth() {
    const el = $('#step'), acc = account();
    if (acc) {
      el.innerHTML = `<h2>3. 회원 확인</h2><p class="desc">아래 계정으로 예약합니다. 예약 내역은 이 계정에서 언제든 확인할 수 있습니다.</p>
        <dl class="adm-dl" style="max-width:420px">
          <div><dt>이름</dt><dd>${esc(acc.name)}</dd></div>
          <div><dt>이메일</dt><dd>${esc(acc.email)}</dd></div>
          <div><dt>전화번호</dt><dd>${esc(acc.phone)}</dd></div>
        </dl>
        <button class="btn btn-outline btn-sm" id="logout" style="margin-top:16px">다른 계정으로 로그인</button>
        <div class="actions"><button class="btn btn-outline" id="back">이전</button><button class="btn btn-primary" id="next">정보 입력</button></div>`;
      $('#logout').onclick = () => { setAuth('', null); stepAuth(); };
      $('#back').onclick = () => { state.step = 1; render(); };
      $('#next').onclick = () => {
        const i = state.info;
        if (!i.name) i.name = acc.name;
        if (!i.phone) i.phone = acc.phone;
        if (!i.contact) i.contact = acc.email;
        state.step = 3; render();
      };
      return;
    }
    if (state.verifyEmail) { stepVerify(); return; }
    const mode = state.authMode || 'register';
    el.innerHTML = `<h2>3. 회원 가입 · 로그인</h2><p class="desc">예약 내역 확인과 재방문을 위해 간단한 회원 가입이 필요합니다. 이메일 주소가 아이디가 됩니다.</p>
      <div class="choice-grid" id="mode" style="margin-bottom:22px">
        <button class="choice ${mode === 'register' ? 'selected' : ''}" data-m="register"><b>처음이에요</b><span>이름·이메일·전화번호로 가입</span></button>
        <button class="choice ${mode === 'login' ? 'selected' : ''}" data-m="login"><b>이미 가입했어요</b><span>이메일과 비밀번호로 로그인</span></button>
      </div>
      <form id="af"><div class="form-grid">
        ${mode === 'register' ? `<label class="f">이름 *<input id="a-name" value="${esc(state.info.name || '')}" placeholder="홍길동"></label>
        <label class="f">전화번호 *<input id="a-phone" value="${esc(state.info.phone || '')}" placeholder="010-0000-0000" inputmode="tel"></label>` : ''}
        <label class="f ${mode === 'register' ? '' : 'full'}">이메일 *<input id="a-email" type="email" value="${esc(state.authEmail || '')}" placeholder="you@example.com" autocomplete="username"></label>
        <label class="f ${mode === 'register' ? '' : 'full'}">비밀번호 *<input id="a-pw" type="password" placeholder="${mode === 'register' ? '8자 이상' : ''}" autocomplete="${mode === 'register' ? 'new-password' : 'current-password'}"></label>
      </div>
      <div id="a-err" class="err-msg"></div>
      <div class="actions"><button class="btn btn-outline" type="button" id="back">이전</button>
        <button class="btn btn-primary" type="submit" id="go">${mode === 'register' ? '가입하고 계속' : '로그인'}</button></div></form>
      <p class="muted" style="margin-top:18px">입력하신 정보는 예약 확인과 진료 목적으로만 사용합니다.</p>`;
    el.querySelectorAll('#mode .choice').forEach(b => b.onclick = () => { state.authMode = b.dataset.m; stepAuth(); });
    $('#back').onclick = () => { state.step = 1; render(); };
    $('#af').onsubmit = async e => {
      e.preventDefault();
      const err = $('#a-err'); err.textContent = ''; $('#go').disabled = true;
      const email = $('#a-email').value.trim(), pw = $('#a-pw').value;
      state.authEmail = email;
      try {
        if (!API) throw new Error('서버에 연결할 수 없습니다. 전화로 문의해 주세요.');
        const body = mode === 'register'
          ? { name: $('#a-name').value.trim(), phone: $('#a-phone').value.trim(), email, password: pw }
          : { email, password: pw };
        const j = await apiCall('/account/' + mode, { method: 'POST', body: JSON.stringify(body) });
        if (j.needVerify) { state.verifyEmail = j.email || email; state.verifyName = body.name || ''; state.codeSentAt = Date.now(); stepAuth(); return; }
        setAuth(j.token, j.account);
        state.info.name = state.info.name || j.account.name;
        state.info.phone = state.info.phone || j.account.phone;
        state.info.contact = j.account.email;
        stepAuth();
      } catch (e2) { err.textContent = e2.message; $('#go').disabled = false; }
    };
  }

  /* 이메일 인증 번호 입력 */
  function stepVerify() {
    const el = $('#step'), email = state.verifyEmail;
    el.innerHTML = `<h2>3. 이메일 인증</h2>
      <p class="desc"><b>${esc(email)}</b>(으)로 6자리 인증 번호를 보냈습니다. 10분 안에 입력해 주세요. 메일이 보이지 않으면 스팸함도 확인해 주세요.</p>
      <form id="vf" style="max-width:360px">
        <label class="f">인증 번호<input id="v-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" style="font-size:22px;letter-spacing:.3em;text-align:center"></label>
        <div id="v-err" class="err-msg"></div>
        <button class="btn btn-primary btn-block" type="submit" id="v-go" style="margin-top:14px">인증하고 계속</button>
      </form>
      <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" id="v-resend">인증 번호 다시 받기</button>
        <button class="btn btn-outline btn-sm" id="v-edit">이메일 주소 수정</button>
      </div>
      <div id="v-msg" class="muted" style="margin-top:10px"></div>`;
    const codeInput = $('#v-code'); codeInput.focus();
    codeInput.oninput = () => { codeInput.value = codeInput.value.replace(/\D/g, '').slice(0, 6); };
    $('#v-edit').onclick = () => { state.verifyEmail = null; state.authMode = 'register'; stepAuth(); };
    $('#v-resend').onclick = async () => {
      const btn = $('#v-resend'); btn.disabled = true; $('#v-msg').textContent = '보내는 중…';
      try { await apiCall('/account/resend', { method: 'POST', body: JSON.stringify({ email }) }); $('#v-msg').textContent = '인증 번호를 다시 보냈습니다.'; }
      catch (e) { $('#v-msg').textContent = e.message; }
      setTimeout(() => { btn.disabled = false; }, 60000);
    };
    $('#vf').onsubmit = async e => {
      e.preventDefault(); $('#v-go').disabled = true; $('#v-err').textContent = '';
      try {
        const j = await apiCall('/account/verify', { method: 'POST', body: JSON.stringify({ email, code: codeInput.value }) });
        setAuth(j.token, j.account);
        state.verifyEmail = null;
        state.info.name = state.info.name || j.account.name;
        state.info.phone = state.info.phone || j.account.phone;
        state.info.contact = j.account.email;
        stepAuth();
      } catch (e2) { $('#v-err').textContent = e2.message; $('#v-go').disabled = false; }
    };
  }

  /* step 4 – info + screening */
  function step3() {
    const i = state.info, el = $('#step');
    el.innerHTML = `<h2>4. 예약자 정보 · 사전 문진</h2><p class="desc">여권과 동일한 영문 이름을 입력해 주세요. 사전 문진은 안전한 처방을 위한 것으로, 해당 항목이 있어도 의사 진료 후 결정됩니다.</p>
      <div class="form-grid">
        <label class="f">이름 (한글) *<input id="name" value="${esc(i.name || '')}" placeholder="홍길동"></label>
        <label class="f">영문 이름 (여권) *<input id="ename" value="${esc(i.ename || '')}" placeholder="HONG GILDONG" style="text-transform:uppercase"></label>
        <label class="f">생년월일 *<input id="birth" type="date" value="${esc(i.birth || '')}" max="${key(new Date())}"></label>
        <label class="f">성별<select id="sex"><option value="">선택</option><option ${i.sex === 'F' ? 'selected' : ''} value="F">여성</option><option ${i.sex === 'M' ? 'selected' : ''} value="M">남성</option></select></label>
        <label class="f">휴대폰 (한국) *<input id="phone" value="${esc(i.phone || '')}" placeholder="010-0000-0000" inputmode="tel"></label>
        <label class="f">카카오톡 ID 또는 이메일 *<input id="contact" value="${esc(i.contact || '')}" placeholder="예약 확정을 보내드립니다"></label>
        <label class="f">키 (cm) *<input id="height" type="number" value="${esc(i.height || '')}" placeholder="165" inputmode="decimal"></label>
        <label class="f">몸무게 (kg) *<input id="weight" type="number" value="${esc(i.weight || '')}" placeholder="70" inputmode="decimal"></label>
        <div class="full bmi-box"><span>BMI <span class="muted">(자동 계산 · 보통 23 이상 처방 대상)</span></span><b id="bmi">-</b></div>
        <label class="f full">복용 중인 약 · 기저질환 (선택)<textarea id="meds" rows="2" placeholder="예) 고혈압약 복용 중 / 갑상선 기능 저하">${esc(i.meds || '')}</textarea></label>
        <label class="f full">일본 체류 기간 · 숙소 (선택)<input id="stay" value="${esc(i.stay || '')}" placeholder="예) 11/20 ~ 11/23, 텐진 ○○호텔"></label>
        <label class="f">숙소 냉장고<select id="fridge"><option value="">모름</option><option ${i.fridge === 'yes' ? 'selected' : ''} value="yes">있음</option><option ${i.fridge === 'no' ? 'selected' : ''} value="no">없음 (상온 21일 이내 사용)</option></select></label>
        <label class="f">이미 사용 중이라면 현재 용량·마지막 투여일<input id="prior" value="${esc(i.prior || '')}" placeholder="예) 5mg 3주째, 마지막 11/8"></label>
      </div>
      <h3 style="margin:26px 0 10px">사전 문진 <span class="muted">(해당 항목에 체크)</span></h3>
      <div class="grid" style="gap:8px">${SCREENING.map(s => `<label class="check"><input type="checkbox" data-s="${s.id}" ${state.screen[s.id] ? 'checked' : ''}><span>${esc(s.label)}</span></label>`).join('')}</div>
      <div id="screen-msg" style="margin-top:12px"></div>
      <label class="check" style="margin-top:22px"><input type="checkbox" id="agree" ${state.agree ? 'checked' : ''}><span><b>개인정보 수집·이용 및 진료 안내에 동의합니다.</b><br><span class="muted">입력한 정보는 예약·진료·사후 상담 목적으로만 사용되며, 마운자로는 의사 진료 후 처방 여부가 결정됩니다.</span></span></label>
      <div class="actions"><button class="btn btn-outline" id="back">← 이전</button><button class="btn btn-primary" id="next">예약 내용 확인 →</button></div>`;
    const bmi = () => { const h = +$('#height').value / 100, w = +$('#weight').value; const v = h > 0 && w > 0 ? (w / (h * h)) : 0; $('#bmi').textContent = v ? v.toFixed(1) : '-'; $('#bmi').style.color = v && v < 23 ? 'var(--gold)' : 'var(--green)'; };
    ['height', 'weight'].forEach(id => $('#' + id).oninput = bmi); bmi();
    const screenMsg = () => {
      const on = SCREENING.filter(s => state.screen[s.id]);
      const block = on.filter(s => s.block), warn = on.filter(s => s.warn);
      $('#screen-msg').innerHTML = block.length ? `<div class="notice red">체크하신 항목은 마운자로 처방이 <b>금기</b>에 해당합니다. 예약은 가능하지만 처방이 어려울 수 있으니 먼저 카카오톡으로 상담을 권장합니다.</div>` : warn.length ? `<div class="notice">체크하신 항목은 진료 시 의사가 자세히 확인합니다. 관련 처방전·검사 결과가 있으면 사진으로 준비해 주세요.</div>` : '';
    };
    el.querySelectorAll('input[data-s]').forEach(c => c.onchange = () => { state.screen[c.dataset.s] = c.checked; screenMsg(); }); screenMsg();
    $('#agree').onchange = e => state.agree = e.target.checked;
    $('#back').onclick = () => { collect(); state.step = 2; render(); };
    $('#next').onclick = () => {
      collect();
      const req = ['name', 'ename', 'birth', 'phone', 'contact', 'height', 'weight'];
      let ok = true;
      req.forEach(id => { const f = $('#' + id); const bad = !f.value.trim(); f.classList.toggle('err', bad); if (bad) ok = false; });
      if (!ok) { el.querySelector('.err').focus(); return; }
      if (!state.agree) { alert('개인정보 수집·이용에 동의해 주세요.'); return; }
      state.step = 4; render();
    };
    function collect() { ['name', 'ename', 'birth', 'sex', 'phone', 'contact', 'height', 'weight', 'meds', 'stay', 'fridge', 'prior'].forEach(id => state.info[id] = $('#' + id).value.trim()); state.info.ename = state.info.ename.toUpperCase(); }
  }

  /* step 4 – confirm */
  function step4() {
    const p = price(), i = state.info, el = $('#step');
    const h = +i.height / 100, bmi = h ? (+i.weight / (h * h)).toFixed(1) : '-';
    const screens = SCREENING.filter(s => state.screen[s.id]).map(s => s.label);
    el.innerHTML = `<h2>5. 예약 내용 확인</h2><p class="desc">아래 내용이 맞는지 확인 후 "예약 요청"을 눌러주세요. 담당 스태프가 확인 후 입력하신 연락처로 확정 안내를 드립니다.</p>
      <div class="confirm"><dl>
        <div><dt>일시</dt><dd>${fmtDate(state.date)} ${state.time}</dd></div>
        <div><dt>구분</dt><dd>${state.visit === 'first' ? '초진' : '재진'} · 마운자로 ${p.pen.dose}mg · ${esc(p.pk.label)}</dd></div>
        <div><dt>수령</dt><dd>${esc(p.rcv.title)}${p.rcv.price ? ' (' + yen(p.rcv.price) + ')' : ''}</dd></div>
        ${state.extras.length ? `<div><dt>추가 옵션</dt><dd>${state.extras.map(id => esc(PRICES.extras.find(e => e.id === id).name)).join(', ')}</dd></div>` : ''}
        ${state.mix ? `<div><dt>희망 구성</dt><dd>${esc(state.mix)}</dd></div>` : ''}
        <div><dt>예약자</dt><dd>${esc(i.name)} (${esc(i.ename)})</dd></div>
        <div><dt>생년월일</dt><dd>${esc(i.birth)}${i.sex ? ' · ' + (i.sex === 'F' ? '여' : '남') : ''}</dd></div>
        <div><dt>연락처</dt><dd>${esc(i.phone)} · ${esc(i.contact)}</dd></div>
        <div><dt>신체</dt><dd>${esc(i.height)}cm · ${esc(i.weight)}kg · BMI ${bmi}</dd></div>
        ${i.meds ? `<div><dt>복용약·질환</dt><dd>${esc(i.meds)}</dd></div>` : ''}
        ${i.stay ? `<div><dt>체류·숙소</dt><dd>${esc(i.stay)}${i.fridge ? ' · 냉장고 ' + (i.fridge === 'yes' ? '있음' : '없음') : ''}</dd></div>` : ''}
        ${i.prior ? `<div><dt>기존 투여</dt><dd>${esc(i.prior)}</dd></div>` : ''}
        ${screens.length ? `<div><dt>문진 해당</dt><dd style="color:var(--red)">${screens.map(esc).join('<br>')}</dd></div>` : '<div><dt>문진</dt><dd>해당 사항 없음</dd></div>'}
        <div><dt>예상 금액</dt><dd style="color:var(--green);font-weight:900">${yk(p.total)} <span class="muted">· 원내 결제</span></dd></div>
      </dl></div>
      <div class="notice">예약금은 없습니다. 방문이 어려워지면 예약 확인 페이지 또는 전화로 꼭 취소해 주세요.</div>
      <div class="actions"><button class="btn btn-outline" id="back">← 수정</button><button class="btn btn-primary" id="submit">예약 요청하기</button></div>`;
    $('#back').onclick = () => { state.step = 3; render(); };
    $('#submit').onclick = async () => {
      const btn = $('#submit'); btn.disabled = true; btn.textContent = '접수 중…';
      const payload = { date: state.date, time: state.time, visit: state.visit, dose: state.dose, pack: p.pk.label,
        receive: p.rcv.title, extras: state.extras, mix: state.mix, total: p.total, info: { ...i }, screening: screens };
      let rec = null, offline = false;
      if (API) {
        try {
          const r = await fetch(`${API}/booking`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(authToken() ? { Authorization: 'Bearer ' + authToken() } : {}) }, body: JSON.stringify(payload) });
          const j = await r.json().catch(() => ({}));
          if (r.ok && j.code) rec = { ...payload, code: j.code, createdAt: j.createdAt, status: 'pending' };
          else if (r.status === 401) { setAuth('', null); alert('로그인이 만료되었습니다. 다시 로그인해 주세요.'); state.step = 2; btn.disabled = false; btn.textContent = '예약 요청하기'; render(); return; }
          else if (r.status === 409) { alert(j.error || '이미 예약된 시간입니다. 다른 시간을 선택해 주세요.'); delete takenCache[state.date]; state.time = null; state.step = 1; btn.disabled = false; btn.textContent = '예약 요청하기'; render(); return; }
          else throw new Error(j.error || ('HTTP ' + r.status));
        } catch (e) { offline = true; }
      } else offline = true;
      if (!rec) rec = { ...payload, code: 'KR' + Date.now().toString(36).toUpperCase().slice(-6), createdAt: new Date().toISOString(), status: 'pending' };
      save([rec, ...load()]);
      done(rec, offline);
    };
  }

  function kakaoText(r) {
    return `[K-RICH CLINIC 마운자로 예약 요청]\n예약번호: ${r.code}\n일시: ${fmtDate(r.date)} ${r.time}\n구분: ${r.visit === 'first' ? '초진' : '재진'} / ${r.dose}mg / ${r.pack}\n수령: ${r.receive || '내원'}\n이름: ${r.info.name} (${r.info.ename})\n연락처: ${r.info.phone} / ${r.info.contact}\n예상 금액: ${yen(r.total)} (${krw(r.total)})`;
  }

  function done(r, offline) {
    stepper(); $('#stepper').querySelectorAll('div').forEach(d => d.className = 'done');
    $('#step').innerHTML = `<div class="confirm"><div class="mark-ok">✓</div><h2>예약 요청이 접수되었습니다</h2>
      <p class="desc">아래 예약번호를 캡처해 두세요. 스태프가 접수 시간(10:00~19:00) 내에 ${esc(r.info.contact)}(으)로 확정 안내를 드립니다.</p>
      ${offline ? `<div class="notice red" style="text-align:left">네트워크 문제로 예약이 클리닉에 전달되지 않았습니다. 아래 "예약 내용 복사"를 눌러 전화(${esc(CLINIC.phone)})로 알려주세요.</div>` : ''}
      <div class="code">${r.code}</div>
      <dl><div><dt>일시</dt><dd>${fmtDate(r.date)} ${r.time}</dd></div><div><dt>처방</dt><dd>마운자로 ${r.dose}mg · ${esc(r.pack)}</dd></div><div><dt>수령</dt><dd>${esc(r.receive || '내원 수령')}</dd></div><div><dt>예상 금액</dt><dd>${yk(r.total)}</dd></div><div><dt>준비물</dt><dd>여권 · 복용약 사진</dd></div></dl>
      <div class="hero-cta" style="justify-content:center">
        ${CHAT ? `<button class="btn ${CHAT.cls}" id="copy">예약 내용 복사 후 ${CHAT.label.replace(' 상담', '')} 열기</button>` : `<button class="btn btn-primary" id="copy">예약 내용 복사</button><a class="btn btn-outline" href="tel:${CLINIC.phoneIntl}">${esc(CLINIC.phone)}</a>`}
        <a class="btn btn-outline" href="book.html?my=1">내 예약 확인</a>
      </div>
      <p class="muted" style="margin-top:14px">${CHAT ? CHAT.label.replace(' 상담', '') + ' 공식계정에 복사한 내용을 붙여넣어 보내시면 더 빨리 확정됩니다.' : '급하시면 접수 시간 내 전화로 예약번호를 말씀해 주시면 바로 확인해 드립니다. 궁금한 점은 <a href="#chat" data-open-chat>AI 상담</a>에 물어보세요.'}</p></div>`;
    $('#copy').onclick = async () => { try { await navigator.clipboard.writeText(kakaoText(r)); $('#copy').textContent = '복사했습니다'; } catch {} if (CHAT) window.open(CHAT.url, '_blank'); };
  }

  const ST_LABEL = { pending: '확정 대기', confirmed: '확정됨', done: '방문 완료', cancelled: '취소됨', noshow: '노쇼' };

  function renderMy() {
    $('#stepper').style.display = 'none';
    const acc = account();
    $('#summary').innerHTML = acc
      ? `<h3>로그인 계정</h3><dl><div><dt>이름</dt><dd>${esc(acc.name)}</dd></div><div><dt>이메일</dt><dd>${esc(acc.email)}</dd></div><div><dt>전화</dt><dd>${esc(acc.phone)}</dd></div></dl>
         <a class="btn btn-primary btn-block" href="book.html" style="margin-top:16px">새 예약</a>
         <button class="btn btn-outline btn-block" id="logout" style="margin-top:8px">로그아웃</button>`
      : `<h3>예약번호로 조회</h3><p style="font-size:13.5px;color:var(--ink-2);margin:0 0 12px">회원 가입 전에 예약하셨다면 예약번호와 생년월일로 조회하세요.</p>
         <label class="f">예약번호<input id="lk-code" placeholder="KR......" style="text-transform:uppercase"></label>
         <label class="f" style="margin-top:8px">생년월일<input id="lk-birth" type="date"></label>
         <button class="btn btn-outline btn-block" id="lk-go" style="margin-top:10px">조회</button>
         <div id="lk-msg" class="muted" style="margin-top:8px"></div>`;
    if (acc) $('#logout').onclick = () => { setAuth('', null); location.reload(); };
    else $('#lk-go').onclick = lookup;

    if (!acc) {
      $('#step').innerHTML = `<h2>내 예약</h2><p class="desc">로그인하면 예약 내역이 기기와 상관없이 보입니다.</p>
        <form id="lf" style="max-width:420px"><div class="form-grid">
          <label class="f full">이메일<input id="l-email" type="email" autocomplete="username" placeholder="you@example.com"></label>
          <label class="f full">비밀번호<input id="l-pw" type="password" autocomplete="current-password"></label>
        </div><div id="l-err" class="err-msg"></div>
        <button class="btn btn-primary" type="submit" id="l-go" style="margin-top:14px">로그인</button>
        <a class="btn btn-outline" href="book.html" style="margin-top:14px;margin-left:8px">예약하면서 가입하기</a></form>`;
      $('#lf').onsubmit = async e => {
        e.preventDefault(); $('#l-go').disabled = true; $('#l-err').textContent = '';
        try {
          const j = await apiCall('/account/login', { method: 'POST', body: JSON.stringify({ email: $('#l-email').value.trim(), password: $('#l-pw').value }) });
          if (j.needVerify) { $('#l-err').textContent = '이메일 인증이 끝나지 않았습니다. 받으신 인증 번호는 예약 화면에서 입력할 수 있습니다.'; $('#l-go').disabled = false; return; }
          setAuth(j.token, j.account); location.reload();
        } catch (e2) { $('#l-err').textContent = e2.message; $('#l-go').disabled = false; }
      };
      return;
    }

    $('#step').innerHTML = `<h2>내 예약</h2><p class="desc">${esc(acc.name)}님의 예약 내역입니다.</p><div id="my-rows">불러오는 중…</div>`;
    loadMyBookings();
  }

  async function loadMyBookings() {
    try {
      const j = await apiCall('/account/bookings');
      const rows = j.bookings || [];
      $('#my-rows').innerHTML = rows.length
        ? `<div class="my-list">${rows.map(r => `<div class="my-item"><div><b>${fmtDate(r.date)} ${esc(r.time)}</b>마운자로 ${r.dose}mg · ${esc(r.pack)} · ${yen(r.total)}<br><span class="muted">예약번호 ${esc(r.code)}</span>${r.adminNote ? `<br><span class="muted">안내: ${esc(r.adminNote)}</span>` : ''}</div>
            <div style="text-align:right"><span class="st st-${esc(r.status)}">${esc(ST_LABEL[r.status] || r.status)}</span><br>${r.status === 'pending' || r.status === 'confirmed' ? `<button class="btn btn-outline btn-sm" data-c="${esc(r.code)}" style="margin-top:8px">취소</button>` : ''}</div></div>`).join('')}</div>`
        : '<p class="muted">아직 예약이 없습니다. <a href="book.html" style="border-bottom:1px solid var(--line)">예약하기</a></p>';
      $('#my-rows').querySelectorAll('button[data-c]').forEach(b => b.onclick = async () => {
        if (!confirm('예약을 취소할까요?')) return;
        b.disabled = true;
        try { await apiCall('/booking/cancel', { method: 'POST', body: JSON.stringify({ code: b.dataset.c }) }); loadMyBookings(); }
        catch (e) { alert('취소하지 못했습니다. ' + e.message); b.disabled = false; }
      });
    } catch (e) { $('#my-rows').innerHTML = `<div class="notice red">불러오지 못했습니다. ${esc(e.message)}</div>`; }
  }

  async function lookup() {
    const code = $('#lk-code').value.trim().toUpperCase(), birth = $('#lk-birth').value;
    const msg = $('#lk-msg');
    if (!code || !birth) { msg.textContent = '예약번호와 생년월일을 모두 입력해 주세요.'; return; }
    if (!API) { msg.textContent = '서버에 연결할 수 없습니다. 전화로 문의해 주세요.'; return; }
    msg.textContent = '조회 중…';
    try {
      const r = await fetch(`${API}/booking/lookup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, birth }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || '조회 실패');
      const b = j.booking;
      msg.innerHTML = `<div class="notice green" style="text-align:left">
        <b>${esc(b.code)}</b> · ${esc(ST_LABEL[b.status] || b.status)}<br>
        ${fmtDate(b.date)} ${esc(b.time)} · 마운자로 ${b.dose}mg · ${esc(b.pack)}<br>
        예상 금액 ${yen(b.total)}${b.adminNote ? `<br><span class="muted">안내: ${esc(b.adminNote)}</span>` : ''}</div>`;
    } catch (e) { msg.textContent = e.message; }
  }

  /* ---------- init ---------- */
  header(); footer();
  const page = document.body.dataset.page;
  if (page === 'home') home();
  if (page === 'book') book();
  loadFx();
})();
