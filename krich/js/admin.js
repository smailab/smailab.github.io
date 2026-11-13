/* K-RICH CLINIC – 예약 관리 (관리자) */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const yen = n => '¥' + Math.round(Number(n) || 0).toLocaleString('ja-JP');
  const API = (CHATBOT.endpoint || '').replace(/\/$/, '');
  const TK = 'krich_admin_token';
  const token = () => { try { return sessionStorage.getItem(TK) || ''; } catch { return ''; } };
  const setToken = v => { try { v ? sessionStorage.setItem(TK, v) : sessionStorage.removeItem(TK); } catch {} };

  const LABEL = { pending: '확정 대기', confirmed: '확정', done: '방문 완료', cancelled: '취소', noshow: '노쇼' };
  const pad = n => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const plus = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const dow = k => { const [y, m, d] = k.split('-').map(Number); return '일월화수목금토'[new Date(y, m - 1, d).getDay()]; };

  async function api(path, opts = {}) {
    const r = await fetch(API + path, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: 'Bearer ' + token() } : {}), ...(opts.headers || {}) },
    });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && path !== '/admin/login') { setToken(''); login('세션이 만료되었습니다. 다시 로그인해 주세요.'); throw new Error('unauthorized'); }
    if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
    return j;
  }

  /* ---------- 로그인 ---------- */
  function login(msg) {
    $('#logout').hidden = true;
    $('#root').innerHTML = `<div class="adm-login">
      <h1>예약 관리</h1>
      <p class="muted">관리자 비밀번호를 입력하세요.</p>
      ${msg ? `<div class="notice" style="margin:14px 0">${esc(msg)}</div>` : ''}
      <form id="f"><label class="f">비밀번호<input type="password" id="pw" autocomplete="current-password" autofocus></label>
      <div id="err" class="err-msg"></div>
      <button class="btn btn-primary btn-block" style="margin-top:14px" type="submit" id="go">로그인</button></form>
    </div>`;
    $('#f').onsubmit = async e => {
      e.preventDefault(); $('#go').disabled = true; $('#err').textContent = '';
      try {
        const j = await api('/admin/login', { method: 'POST', body: JSON.stringify({ password: $('#pw').value }) });
        setToken(j.token); list();
      } catch (err) { $('#err').textContent = err.message; $('#go').disabled = false; }
    };
  }

  /* ---------- 목록 ---------- */
  const state = { from: today(), to: plus(60), status: '', rows: [] };

  async function list() {
    $('#logout').hidden = false;
    $('#root').innerHTML = `
      <div class="adm-bar">
        <label class="f">시작<input type="date" id="from" value="${state.from}"></label>
        <label class="f">종료<input type="date" id="to" value="${state.to}"></label>
        <label class="f">상태<select id="status">
          <option value="">전체</option>
          ${Object.entries(LABEL).map(([k, v]) => `<option value="${k}" ${state.status === k ? 'selected' : ''}>${v}</option>`).join('')}
        </select></label>
        <button class="btn btn-outline btn-sm" id="q-today">오늘</button>
        <button class="btn btn-outline btn-sm" id="q-week">이번 주</button>
        <button class="btn btn-primary btn-sm" id="reload">새로고침</button>
        <button class="btn btn-outline btn-sm" id="csv">CSV 내려받기</button>
        <button class="btn btn-outline btn-sm" id="slot">시간 차단·해제</button>
      </div>
      <div id="sum" class="adm-sum"></div>
      <div id="rows">불러오는 중…</div>`;
    const bind = () => {
      $('#from').onchange = e => { state.from = e.target.value; fetchRows(); };
      $('#to').onchange = e => { state.to = e.target.value; fetchRows(); };
      $('#status').onchange = e => { state.status = e.target.value; fetchRows(); };
      $('#reload').onclick = fetchRows;
      $('#q-today').onclick = () => { state.from = state.to = today(); $('#from').value = $('#to').value = today(); fetchRows(); };
      $('#q-week').onclick = () => { state.from = today(); state.to = plus(7); $('#from').value = state.from; $('#to').value = state.to; fetchRows(); };
      $('#csv').onclick = csv;
      $('#slot').onclick = slotTool;
    };
    bind(); fetchRows();
  }

  async function fetchRows() {
    state.rows = [];
    $('#rows').innerHTML = '불러오는 중…';
    try {
      const qs = new URLSearchParams({ from: state.from, to: state.to, ...(state.status ? { status: state.status } : {}) });
      const j = await api('/admin/bookings?' + qs);
      state.rows = j.bookings || [];
      render();
    } catch (e) { $('#rows').innerHTML = `<div class="notice red">불러오지 못했습니다: ${esc(e.message)}</div>`; }
  }

  function render() {
    const rows = state.rows;
    const by = s => rows.filter(r => r.status === s).length;
    $('#sum').innerHTML = `<b>${rows.length}건</b> · 확정 대기 ${by('pending')} · 확정 ${by('confirmed')} · 완료 ${by('done')} · 취소 ${by('cancelled')} · 노쇼 ${by('noshow')}
      <span class="muted" style="margin-left:8px">상세 화면의 상태가 정확합니다. 다른 기기에서 바꾼 상태는 목록에 최대 1분 뒤 반영됩니다.</span>`;
    if (!rows.length) { $('#rows').innerHTML = '<p class="muted">해당 기간에 예약이 없습니다.</p>'; return; }
    const slotCount = {};
    rows.filter(r => r.status !== 'cancelled').forEach(r => { const k = r.date + r.time; slotCount[k] = (slotCount[k] || 0) + 1; });
    const dupes = rows.filter(r => r.status !== 'cancelled' && slotCount[r.date + r.time] > 1).length;
    $('#rows').innerHTML = (dupes ? `<div class="notice red" style="margin-bottom:12px">같은 시간에 겹친 예약이 ${dupes}건 있습니다. 확인 후 한쪽을 다른 시간으로 안내해 주세요.</div>` : '') + `<div class="adm-table"><table>
      <thead><tr><th>일시</th><th>예약자</th><th>처방</th><th>금액</th><th>상태</th><th></th></tr></thead>
      <tbody>${rows.map(r => `<tr data-code="${esc(r.code)}">
        <td><b>${esc(r.date)}</b> <span class="muted">(${dow(r.date)})</span><br>${esc(r.time)}${r.status !== 'cancelled' && slotCount[r.date + r.time] > 1 ? ' <span class="st st-noshow" title="같은 시간에 여러 예약">중복</span>' : ''}</td>
        <td>${esc(r.name)}<br><span class="muted">${esc(r.code)}</span></td>
        <td>${r.dose ? r.dose + 'mg' : '-'}</td>
        <td class="num">${yen(r.total)}</td>
        <td><span class="st st-${esc(r.status)}">${esc(LABEL[r.status] || r.status)}</span></td>
        <td><button class="btn btn-outline btn-sm" data-open="${esc(r.code)}">상세</button></td>
      </tr>`).join('')}</tbody></table></div>`;
    document.querySelectorAll('[data-open]').forEach(b => b.onclick = () => detail(b.dataset.open));
  }

  /* ---------- 상세 ---------- */
  async function detail(code) {
    let b;
    try { b = (await api('/admin/booking?code=' + encodeURIComponent(code))).booking; }
    catch (e) { alert('불러오지 못했습니다: ' + e.message); return; }
    const i = b.info || {};
    const h = +i.height / 100, bmi = h > 0 ? (+i.weight / (h * h)).toFixed(1) : '-';
    const row = (k, v) => v ? `<div><dt>${k}</dt><dd>${v}</dd></div>` : '';
    const wrap = document.createElement('div');
    wrap.className = 'modal-bg open';
    wrap.innerHTML = `<div class="modal">
      <h2>${esc(b.code)} <span class="st st-${esc(b.status)}">${esc(LABEL[b.status] || b.status)}</span></h2>
      <dl class="adm-dl">
        ${row('일시', `${esc(b.date)} (${dow(b.date)}) ${esc(b.time)}`)}
        ${row('구분', `${b.visit === 'first' ? '초진' : '재진'} · 마운자로 ${b.dose}mg · ${esc(b.pack)}`)}
        ${row('수령', esc(b.receive))}
        ${row('희망 구성', esc(b.mix))}
        ${row('예약자', `${esc(i.name)} (${esc(i.ename)})`)}
        ${row('생년월일', `${esc(i.birth)}${i.sex ? ' · ' + (i.sex === 'F' ? '여' : '남') : ''}`)}
        ${row('연락처', `${esc(i.phone)} · ${esc(i.contact)}`)}
        ${row('신체', `${esc(i.height)}cm · ${esc(i.weight)}kg · BMI ${bmi}`)}
        ${row('복용약·질환', esc(i.meds))}
        ${row('체류·숙소', `${esc(i.stay)}${i.fridge ? ' · 냉장고 ' + (i.fridge === 'yes' ? '있음' : '없음') : ''}`)}
        ${row('기존 투여', esc(i.prior))}
        ${row('문진 해당', (b.screening || []).length ? `<span style="color:var(--red)">${b.screening.map(esc).join('<br>')}</span>` : '해당 없음')}
        ${row('예상 금액', yen(b.total))}
        ${row('접수', esc((b.createdAt || '').replace('T', ' ').slice(0, 16)))}
        ${row('최종 수정', esc((b.updatedAt || '').replace('T', ' ').slice(0, 16)))}
      </dl>
      <label class="f" style="margin-top:14px">메모 (관리자용)<textarea id="note" rows="2">${esc(b.adminNote || '')}</textarea></label>
      <div class="adm-actions">
        ${Object.entries(LABEL).map(([k, v]) => `<button class="btn ${k === b.status ? 'btn-primary' : 'btn-outline'} btn-sm" data-st="${k}">${v}</button>`).join('')}
      </div>
      <div id="dmsg" class="muted" style="margin-top:10px"></div>
      <div class="actions"><button class="btn btn-outline" id="close">닫기</button><button class="btn btn-primary" id="save">저장</button></div>
    </div>`;
    document.body.appendChild(wrap);
    let newStatus = b.status;
    wrap.querySelectorAll('[data-st]').forEach(btn => btn.onclick = () => {
      newStatus = btn.dataset.st;
      wrap.querySelectorAll('[data-st]').forEach(x => { x.className = 'btn btn-outline btn-sm'; });
      btn.className = 'btn btn-primary btn-sm';
    });
    const close = () => wrap.remove();
    wrap.querySelector('#close').onclick = close;
    wrap.onclick = e => { if (e.target === wrap) close(); };
    wrap.querySelector('#save').onclick = async () => {
      wrap.querySelector('#save').disabled = true;
      wrap.querySelector('#dmsg').textContent = '저장 중…';
      try {
        await api('/admin/booking', { method: 'POST', body: JSON.stringify({ code: b.code, status: newStatus, adminNote: wrap.querySelector('#note').value }) });
        const row = state.rows.find(r => r.code === b.code);
        if (row) row.status = newStatus;            // 목록 캐시는 반영이 늦으므로 즉시 갱신
        close(); render();
      } catch (e) { wrap.querySelector('#dmsg').textContent = '저장 실패: ' + e.message; wrap.querySelector('#save').disabled = false; }
    };
  }

  function slotTool() {
    const wrap = document.createElement('div');
    wrap.className = 'modal-bg open';
    wrap.innerHTML = `<div class="modal">
      <h2>시간 차단 · 해제</h2>
      <p class="muted" style="margin:0 0 14px">차단하면 손님이 그 시간을 선택할 수 없습니다. 휴진이나 점심 연장 등에 사용하세요. 예약을 취소해도 시간은 자동으로 풀립니다.</p>
      <div class="form-grid">
        <label class="f">날짜<input type="date" id="s-date" value="${today()}"></label>
        <label class="f">시간<input type="time" id="s-time" step="1800" value="13:00"></label>
      </div>
      <div id="s-msg" class="muted" style="margin-top:12px"></div>
      <div class="actions"><button class="btn btn-outline" id="s-close">닫기</button>
        <span><button class="btn btn-outline" id="s-free">해제</button> <button class="btn btn-primary" id="s-block">차단</button></span></div>
    </div>`;
    document.body.appendChild(wrap);
    const close = () => wrap.remove();
    wrap.querySelector('#s-close').onclick = close;
    wrap.onclick = e => { if (e.target === wrap) close(); };
    const run = async (action) => {
      const date = wrap.querySelector('#s-date').value, time = wrap.querySelector('#s-time').value.slice(0, 5);
      if (!date || !time) { wrap.querySelector('#s-msg').textContent = '날짜와 시간을 입력해 주세요.'; return; }
      wrap.querySelector('#s-msg').textContent = '처리 중…';
      try {
        const j = await api('/admin/slot', { method: 'POST', body: JSON.stringify({ date, time, action }) });
        wrap.querySelector('#s-msg').textContent = action === 'release'
          ? `${date} ${time} 해제했습니다.`
          : (j.conflict ? `${date} ${time}은 이미 차단·예약된 시간입니다.` : `${date} ${time} 차단했습니다.`);
      } catch (e) { wrap.querySelector('#s-msg').textContent = '실패: ' + e.message; }
    };
    wrap.querySelector('#s-block').onclick = () => run('claim');
    wrap.querySelector('#s-free').onclick = () => run('release');
  }

  function csv() {
    const head = ['예약번호', '날짜', '시간', '이름', '용량', '금액', '상태'];
    const lines = [head.join(',')].concat(state.rows.map(r => [r.code, r.date, r.time, r.name, r.dose, r.total, LABEL[r.status] || r.status].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')));
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `krich-bookings-${state.from}_${state.to}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  $('#logout').onclick = () => { setToken(''); login(); };
  if (!API) { $('#root').innerHTML = '<div class="notice red">CHATBOT.endpoint가 설정되지 않아 서버에 연결할 수 없습니다.</div>'; return; }
  token() ? list() : login();
})();
