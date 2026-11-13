/* K-RICH CLINIC – AI 상담 챗봇 (OpenAI chat completions)
 * - CHATBOT.endpoint 가 설정되면 프록시(worker/)를 통해 호출 (API 키는 서버에만 존재)
 * - 설정 전에는 관리자 테스트 모드: 브라우저 localStorage에 키를 저장해 api.openai.com 직접 호출 (본인 브라우저에서만 동작) */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const yen = n => '¥' + Math.round(n).toLocaleString('ja-JP');
  const KEY_STORE = 'krich_openai_key', HIST = 'krich_chat_history';

  /* ---------- 지식: 사이트 데이터로 시스템 프롬프트 생성 ---------- */
  function systemPrompt() {
    const fx = (typeof FX !== 'undefined') ? FX : { krwPerJpy: 8.54, asOf: '-' };
    const krw = n => '약 ' + (Math.round(n * fx.krwPerJpy / 100) * 100).toLocaleString('ko-KR') + '원';
    const pens = PRICES.pens.map(p => `- ${p.dose}mg 4개(4주분): ${yen(p.set4)} (${krw(p.set4)}), 펜 1개당 ${yen(p.price)}`).join('\n');
    const packs = PRICES.packs.map(pk => `- ${pk.label}: 2.5mg 기준 ${yen(PRICES.pens[0].price * pk.pens)}${pk.note ? ' · ' + pk.note : ''}`).join('\n');
    const consult = PRICES.consult.map(c => `- ${c.name}: ${c.price ? yen(c.price) : '무료'} (${c.note})`).join('\n');
    const faq = FAQ.map(f => `Q: ${f.q}\nA: ${f.a}`).join('\n\n');
    const bring = BRING.map(b => `- ${b.title}: ${b.desc}`).join('\n');
    const qty = QTY_GUIDE.map(q => `- 체류 ${q.stay}: ${q.shots} → 한국에 가져가는 개수 ${q.home}`).join('\n');
    const steps = STEPS.map(s => `${s.n} ${s.title}: ${s.desc}`).join('\n');
    const screen = SCREENING.map(s => `- ${s.label} (${s.block ? '처방 금기' : '진료 시 확인'})`).join('\n');
    const doc = DOCTORS[0];
    return `당신은 일본 후쿠오카 "${CLINIC.nameJa}"의 한국어 AI 상담원입니다. 한국에서 오는 방문객에게 마운자로(Mounjaro, 티르제파타이드) 처방 관련 안내를 합니다.

[말투와 원칙]
- 한국어로, 친절하고 간결하게(보통 3~6문장). 사용자가 다른 언어로 물으면 그 언어로 답합니다.
- 아래 "클리닉 정보"에 있는 사실만 답합니다. 모르는 내용이나 정보에 없는 가격·재고·휴진일은 추측하지 말고 "전화(${CLINIC.phone})로 확인해 주세요"라고 안내합니다.
- 당신은 의사가 아닙니다. 진단·처방 여부 판단·개인 복용량 조정은 하지 않고, 최종 결정은 의사 진료 후 이루어진다고 안내합니다. 심한 복통·구토 지속·알레르기 등 응급 증상은 즉시 가까운 병원 방문을 권합니다.
- 금기(갑상선 수질암/MEN2 가족력, 임신·수유)에 해당하면 처방이 어려울 수 있다고 솔직히 안내합니다.
- 가격은 엔화와 원화 환산을 함께 말합니다(환율 100엔=${(fx.krwPerJpy * 100).toFixed(2)}원, ${fx.asOf} 기준, 참고용). 실제 청구는 엔화입니다.
- 예약을 원하면 온라인 예약 페이지(book.html)와 전화(${CLINIC.phone})를 안내합니다. 링크는 [온라인 예약](book.html) 형식으로 적습니다.
- 한국 반입 규정·세관 정보는 변경될 수 있으니 출국 전 관세청(125) 확인을 함께 권합니다.
- 대량 구매 권유, 다른 병원 비방, 효과 보장 표현은 하지 않습니다.

[클리닉 정보]
- 이름: ${CLINIC.nameJa} (${CLINIC.nameKo}), 진료과목: ${CLINIC.dept}
- 주소: ${CLINIC.addressKo} / ${CLINIC.address}
- 전화: ${CLINIC.phone}, 접수 시간: ${CLINIC.hours.map(h => h.day + ' ' + h.time).join(', ')}
- 공식 사이트: ${CLINIC.site}, 공식 WEB 예약(일본어): ${CLINIC.webReserve}
- 원장: ${doc.name} – ${doc.role}. ${doc.bio}
- 결제: 엔화 현금, 한국 발급 신용·체크카드(VISA/Master/JCB/AMEX). 간편결제는 전화로 확인.
- 초진은 2.5mg부터 시작, 4주 후 5mg으로 증량이 기본. 재진은 증량 용량 선택 가능. 12.5mg·15mg는 문의.
- 1회 최대 처방 ${CLINIC.maxPens}개(한국 휴대 반입 한도 3개월분). 처방 여부·수량은 의사가 결정.
- 호텔 배송, 혈액검사, 보냉 가방 판매는 하지 않습니다. 내원 수령만 가능합니다.
- 영문 처방전·약제 증명서 무료 발급. 귀국 후 4주 온라인 팔로업 무료. 다 쓴 펜 원내 반납 가능.

[가격 – 세금 포함]
${pens}
${packs}
${consult}

[진료 절차]
${steps}

[한국 반입·보관 가이드]
${bring}
체류 기간별 수량:
${qty}

[사전 문진 항목]
${screen}

[자주 묻는 질문]
${faq}

오늘 날짜: ${new Date().toISOString().slice(0, 10)}`;
  }

  /* ---------- 간단 마크다운 ---------- */
  function md(t) {
    let h = esc(t);
    h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|book\.html[^\s)]*|index\.html[^\s)]*|#[^\s)]*)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    h = h.replace(/(^|[^"'>])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
    h = h.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    h = h.replace(/^\s*[-•]\s+(.*)$/gm, '<li>$1</li>').replace(/(<li>.*<\/li>\n?)+/g, m => '<ul>' + m.replace(/\n/g, '') + '</ul>\n');
    return h.replace(/\n/g, '<br>').replace(/<\/ul><br>/g, '</ul>');
  }

  /* ---------- UI ---------- */
  let history = []; try { history = JSON.parse(sessionStorage.getItem(HIST) || '[]'); } catch {}
  const saveHist = () => { try { sessionStorage.setItem(HIST, JSON.stringify(history.slice(-2 * CHATBOT.maxTurns))); } catch {} };
  const adminKey = () => { try { return localStorage.getItem(KEY_STORE) || ''; } catch { return ''; } };
  const configured = () => !!CHATBOT.endpoint || !!adminKey();

  function mount() {
    const root = document.createElement('div');
    root.innerHTML = `
      <button class="chat-fab" id="chat-fab" aria-label="AI 상담 열기">💬 <span>AI 상담</span></button>
      <div class="chat-panel" id="chat-panel" hidden>
        <div class="chat-head">
          <div><b>${esc(CHATBOT.title)}</b><small>OpenAI 기반 · 의료 상담이 아닌 안내용</small></div>
          <div class="chat-head-btns"><button id="chat-reset" title="대화 초기화">↺</button><button id="chat-admin" title="관리자 설정">⚙</button><button id="chat-close" aria-label="닫기">✕</button></div>
        </div>
        <div class="chat-body" id="chat-body"></div>
        <div class="chat-quick" id="chat-quick"></div>
        <form class="chat-form" id="chat-form"><input id="chat-input" autocomplete="off" placeholder="궁금한 점을 입력하세요" maxlength="1000"><button class="btn btn-primary btn-sm" id="chat-send" type="submit">전송</button></form>
        <div class="chat-foot">AI 답변은 참고용이며 처방 여부는 의사 진료 후 결정됩니다. 급한 문의는 ☎ <a href="tel:${CLINIC.phoneIntl}">${esc(CLINIC.phone)}</a></div>
      </div>`;
    document.body.appendChild(root);
    const panel = $('#chat-panel'), body = $('#chat-body');
    const open = () => { panel.hidden = false; $('#chat-fab').classList.add('open'); if (!body.children.length) renderAll(); setTimeout(() => $('#chat-input').focus(), 50); };
    const close = () => { panel.hidden = true; $('#chat-fab').classList.remove('open'); };
    $('#chat-fab').onclick = () => panel.hidden ? open() : close();
    $('#chat-close').onclick = close;
    $('#chat-reset').onclick = () => { history = []; saveHist(); renderAll(); };
    $('#chat-admin').onclick = adminDialog;
    document.querySelectorAll('[data-open-chat]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); open(); }));
    $('#chat-form').onsubmit = e => { e.preventDefault(); const v = $('#chat-input').value.trim(); if (v) { $('#chat-input').value = ''; send(v); } };
    $('#chat-quick').innerHTML = CHATBOT.quick.map(q => `<button type="button">${esc(q)}</button>`).join('');
    $('#chat-quick').querySelectorAll('button').forEach(b => b.onclick = () => send(b.textContent));
    if (location.hash === '#chat') open();
  }

  function bubble(role, html, id) {
    const d = document.createElement('div'); d.className = 'chat-msg ' + role; if (id) d.id = id;
    d.innerHTML = `<div class="chat-bubble">${html}</div>`; $('#chat-body').appendChild(d); $('#chat-body').scrollTop = 1e9; return d;
  }
  function renderAll() {
    const body = $('#chat-body'); body.innerHTML = '';
    bubble('assistant', md(CHATBOT.greeting));
    if (!configured()) bubble('system', 'AI 상담은 준비 중입니다. 지금은 전화(☎ ' + esc(CLINIC.phone) + ')로 문의해 주세요.<br><small>관리자: ⚙에서 테스트 키 입력 또는 <code>worker/</code> 프록시 배포 후 <code>CHATBOT.endpoint</code> 설정</small>');
    history.forEach(m => bubble(m.role, md(m.content)));
  }

  function adminDialog() {
    const cur = adminKey();
    const v = prompt('관리자 테스트 모드\n\nOpenAI API 키를 이 브라우저(localStorage)에만 저장해 챗봇을 테스트합니다. 공개 운영에는 반드시 프록시(krich/worker)를 사용하세요.\n\n비우고 확인하면 저장된 키를 삭제합니다.', cur ? '(저장됨 – 바꾸려면 새 키 입력)' : '');
    if (v === null) return;
    const val = v.trim();
    try { if (!val || val.startsWith('(저장됨')) { if (!val) localStorage.removeItem(KEY_STORE); } else localStorage.setItem(KEY_STORE, val); } catch {}
    renderAll();
  }

  /* ---------- OpenAI 호출 (스트리밍) ---------- */
  async function send(text) {
    if (!configured()) { bubble('system', '아직 챗봇이 연결되지 않았습니다. 전화로 문의해 주세요 ☎ ' + esc(CLINIC.phone)); return; }
    history.push({ role: 'user', content: text }); saveHist();
    bubble('user', md(text));
    const id = 'm' + Date.now(); const el = bubble('assistant', '<span class="chat-typing">…</span>', id);
    $('#chat-send').disabled = true;
    const messages = [{ role: 'system', content: systemPrompt() }, ...history.slice(-2 * CHATBOT.maxTurns)];
    let full = '';
    try {
      const url = CHATBOT.endpoint ? CHATBOT.endpoint.replace(/\/$/, '') + '/chat' : 'https://api.openai.com/v1/chat/completions';
      const headers = { 'Content-Type': 'application/json' };
      const payload = { messages, stream: true };
      if (!CHATBOT.endpoint) { headers.Authorization = 'Bearer ' + adminKey(); Object.assign(payload, { model: CHATBOT.model, temperature: 0.3, max_tokens: 700 }); }
      const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
      if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(`HTTP ${r.status} ${t.slice(0, 200)}`); }
      const ct = r.headers.get('content-type') || '';
      if (ct.includes('text/event-stream')) {
        const reader = r.body.getReader(), dec = new TextDecoder(); let buf = '';
        while (true) {
          const { value, done } = await reader.read(); if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n'); buf = lines.pop();
          for (const ln of lines) {
            const l = ln.trim(); if (!l.startsWith('data:')) continue; const d = l.slice(5).trim(); if (d === '[DONE]') continue;
            try { const j = JSON.parse(d); const delta = j.choices?.[0]?.delta?.content; if (delta) { full += delta; el.querySelector('.chat-bubble').innerHTML = md(full); $('#chat-body').scrollTop = 1e9; } } catch {}
          }
        }
      } else { const j = await r.json(); full = j.choices?.[0]?.message?.content || j.error?.message || '(응답 없음)'; el.querySelector('.chat-bubble').innerHTML = md(full); }
      if (!full) full = '죄송해요, 답변을 생성하지 못했습니다. 다시 시도해 주세요.';
      history.push({ role: 'assistant', content: full }); saveHist();
    } catch (e) {
      el.querySelector('.chat-bubble').innerHTML = '⚠️ 연결에 실패했습니다. 잠시 후 다시 시도하거나 전화로 문의해 주세요 ☎ ' + esc(CLINIC.phone) + `<br><small class="muted">${esc(e.message)}</small>`;
      history.pop(); saveHist();
    } finally { $('#chat-send').disabled = false; $('#chat-body').scrollTop = 1e9; }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
