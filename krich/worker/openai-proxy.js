/* K-RICH CLINIC API – Cloudflare Worker
 * 1) /chat          : OpenAI 챗봇 프록시 (API 키는 Worker 시크릿에만 보관)
 * 2) /booking       : 예약 접수 → KV 저장
 * 3) /slots         : 날짜별 마감 시간 조회
 * 4) /admin/*       : 관리자 로그인·예약 목록·상태 변경
 *
 * 바인딩: BOOKINGS (KV)
 * 시크릿: OPENAI_API_KEY, ADMIN_PASSWORD
 * 변수  : OPENAI_MODEL, ALLOWED_ORIGINS
 */

const TOKEN_TTL_SEC = 60 * 60 * 8;          // 관리자 세션 8시간
const STATUSES = ['pending', 'confirmed', 'done', 'cancelled', 'noshow'];

/* ---------- Durable Object: 날짜별 슬롯 잠금 (강한 일관성) ---------- */
export class SlotRegistry {
  constructor(state) { this.state = state; }
  async fetch(request) {
    const url = new URL(request.url);
    const op = url.pathname.slice(1);
    if (op === 'taken') {
      const m = await this.state.storage.list({ prefix: 't:' });
      return Response.json({ taken: [...m.keys()].map(k => k.slice(2)) });
    }
    const body = await request.json().catch(() => ({}));
    const time = String(body.time || '');
    if (!/^\d{2}:\d{2}$/.test(time)) return Response.json({ error: 'bad time' }, { status: 400 });
    if (op === 'claim') {
      const cur = await this.state.storage.get('t:' + time);
      if (cur) return Response.json({ ok: false, conflict: true });
      await this.state.storage.put('t:' + time, String(body.code || '1'));
      return Response.json({ ok: true });
    }
    if (op === 'release') { await this.state.storage.delete('t:' + time); return Response.json({ ok: true }); }
    return Response.json({ error: 'not found' }, { status: 404 });
  }
}

const slotStub = (env, date) => env.SLOTS.get(env.SLOTS.idFromName(date));

/* ---------- helpers ---------- */
const enc = new TextEncoder();

function corsHeaders(origin, allowed) {
  const ok = allowed.length === 0 || allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? (origin || '*') : 'null',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function timingSafeEqual(a, b) {
  const x = enc.encode(a), y = enc.encode(b);
  if (x.length !== y.length) return false;
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}

async function hmac(key, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function makeToken(secret) {
  const exp = String(Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC);
  return `${exp}.${await hmac(secret, exp)}`;
}

async function verifyToken(token, secret) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return false;
  const [exp, sig] = token.split('.');
  if (!/^\d+$/.test(exp) || Number(exp) < Math.floor(Date.now() / 1000)) return false;
  return timingSafeEqual(sig, await hmac(secret, exp));
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s);
const isTime = s => /^\d{2}:\d{2}$/.test(s);
const hhmm = t => String(t).replace(':', '');
const key = b => `b:${b.date}:${hhmm(b.time)}:${b.code}`;

/* ---------- handlers ---------- */
async function createBooking(body, env) {
  const i = body.info || {};
  const b = {
    code: 'KR' + Date.now().toString(36).toUpperCase().slice(-6) + Math.floor(Math.random() * 90 + 10),
    createdAt: new Date().toISOString(),
    status: 'pending',
    date: str(body.date, 10),
    time: str(body.time, 5),
    visit: body.visit === 'repeat' ? 'repeat' : 'first',
    dose: Number(body.dose) || 0,
    pack: str(body.pack, 60),
    receive: str(body.receive, 60),
    extras: Array.isArray(body.extras) ? body.extras.slice(0, 10).map(x => str(x, 30)) : [],
    mix: str(body.mix, 500),
    total: Math.max(0, Math.min(10000000, Number(body.total) || 0)),
    info: {
      name: str(i.name, 60), ename: str(i.ename, 80), birth: str(i.birth, 10), sex: str(i.sex, 4),
      phone: str(i.phone, 40), contact: str(i.contact, 120), height: str(i.height, 6), weight: str(i.weight, 6),
      meds: str(i.meds, 500), stay: str(i.stay, 300), fridge: str(i.fridge, 10), prior: str(i.prior, 200),
    },
    screening: Array.isArray(body.screening) ? body.screening.slice(0, 20).map(x => str(x, 200)) : [],
    adminNote: '',
    updatedAt: null,
  };
  if (!isDate(b.date) || !isTime(b.time)) return { error: '날짜·시간이 올바르지 않습니다.', status: 400 };
  if (!b.info.name || !b.info.phone || !b.info.contact) return { error: '필수 정보가 비어 있습니다.', status: 400 };
  if (new Date(b.date + 'T00:00:00+09:00') < new Date(Date.now() - 86400000)) return { error: '지난 날짜는 예약할 수 없습니다.', status: 400 };

  // 같은 시간대 중복 방지 (Durable Object – 강한 일관성)
  if (env.SLOTS) {
    const claim = await slotStub(env, b.date).fetch('https://do/claim', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ time: b.time, code: b.code }),
    }).then(r => r.json()).catch(() => ({ ok: true }));
    if (claim.conflict) return { error: '방금 다른 분이 같은 시간을 예약했습니다. 다른 시간을 선택해 주세요.', status: 409 };
  }
  const meta = { code: b.code, status: b.status, time: b.time, name: b.info.name, dose: b.dose, total: b.total };
  await env.BOOKINGS.put(key(b), JSON.stringify(b), { metadata: meta });
  await env.BOOKINGS.put(`c:${b.code}`, key(b));
  return { ok: true, code: b.code, createdAt: b.createdAt };
}

async function listBookings(env, { from, to, status }) {
  const out = [];
  let cursor;
  do {
    const r = await env.BOOKINGS.list({ prefix: 'b:', cursor, limit: 1000 });
    for (const k of r.keys) {
      const d = k.name.split(':')[1];
      if (from && d < from) continue;
      if (to && d > to) continue;
      const m = k.metadata || {};
      if (status && m.status !== status) continue;
      out.push({ k: k.name, date: d, ...m });
    }
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor);
  out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return out;
}

/* ---------- entry ---------- */
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const cors = corsHeaders(origin, allowed);
    const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (path === '/' || path === '/health') return json({ ok: true, service: 'krich-api' });
    if (cors['Access-Control-Allow-Origin'] === 'null') return json({ error: 'origin not allowed' }, 403);

    const body = request.method === 'POST' ? await request.json().catch(() => null) : null;
    if (request.method === 'POST' && body === null) return json({ error: 'invalid json' }, 400);

    /* ----- 챗봇 ----- */
    if (path === '/chat' && request.method === 'POST') {
      if (!env.OPENAI_API_KEY) return json({ error: 'OPENAI_API_KEY not configured' }, 500);
      const messages = Array.isArray(body.messages) ? body.messages.slice(-30) : [];
      if (!messages.length) return json({ error: 'messages required' }, 400);
      for (const m of messages) {
        if (!m || !['system', 'user', 'assistant'].includes(m.role) || typeof m.content !== 'string') return json({ error: 'invalid message' }, 400);
        if (m.content.length > (m.role === 'system' ? 20000 : 2000)) return json({ error: 'message too long' }, 413);
      }
      const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: env.OPENAI_MODEL || 'gpt-4o-mini', messages, temperature: 0.3, max_tokens: 700, stream: body.stream !== false }),
      });
      const h = new Headers(cors);
      h.set('Content-Type', upstream.headers.get('Content-Type') || 'application/json');
      h.set('Cache-Control', 'no-store');
      return new Response(upstream.body, { status: upstream.status, headers: h });
    }

    if (!env.BOOKINGS) return json({ error: 'BOOKINGS KV not bound' }, 500);

    /* ----- 예약 접수 ----- */
    if (path === '/booking' && request.method === 'POST') {
      const r = await createBooking(body, env);
      return r.error ? json({ error: r.error }, r.status) : json(r);
    }

    /* ----- 예약 조회 (예약번호 + 생년월일) ----- */
    if (path === '/booking/lookup' && request.method === 'POST') {
      const code = str(body.code, 20).toUpperCase(), birth = str(body.birth, 10);
      if (!code || !birth) return json({ error: '예약번호와 생년월일을 입력해 주세요.' }, 400);
      const k = await env.BOOKINGS.get(`c:${code}`);
      if (!k) return json({ error: '예약을 찾을 수 없습니다.' }, 404);
      const rec = JSON.parse((await env.BOOKINGS.get(k)) || 'null');
      if (!rec || rec.info.birth !== birth) return json({ error: '예약을 찾을 수 없습니다.' }, 404);
      return json({ ok: true, booking: { code: rec.code, status: rec.status, date: rec.date, time: rec.time, dose: rec.dose, pack: rec.pack, total: rec.total, name: rec.info.name, adminNote: rec.adminNote } });
    }

    /* ----- 예약 취소 (본인) ----- */
    if (path === '/booking/cancel' && request.method === 'POST') {
      const code = str(body.code, 20).toUpperCase(), birth = str(body.birth, 10);
      const k = await env.BOOKINGS.get(`c:${code}`);
      if (!k) return json({ error: '예약을 찾을 수 없습니다.' }, 404);
      const rec = JSON.parse((await env.BOOKINGS.get(k)) || 'null');
      if (!rec || rec.info.birth !== birth) return json({ error: '예약을 찾을 수 없습니다.' }, 404);
      rec.status = 'cancelled'; rec.updatedAt = new Date().toISOString();
      await env.BOOKINGS.put(k, JSON.stringify(rec), { metadata: { code: rec.code, status: rec.status, time: rec.time, name: rec.info.name, dose: rec.dose, total: rec.total } });
      if (env.SLOTS) await slotStub(env, rec.date).fetch('https://do/release', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ time: rec.time }) }).catch(() => {});
      return json({ ok: true });
    }

    /* ----- 날짜별 마감 시간 ----- */
    if (path === '/slots' && request.method === 'GET') {
      const d = url.searchParams.get('date') || '';
      if (!isDate(d)) return json({ error: 'date required' }, 400);
      if (env.SLOTS) {
        const j = await slotStub(env, d).fetch('https://do/taken').then(r => r.json()).catch(() => null);
        if (j && Array.isArray(j.taken)) return json({ date: d, taken: j.taken });
      }
      const r = await env.BOOKINGS.list({ prefix: `b:${d}:` });
      const taken = r.keys.filter(k => (k.metadata || {}).status !== 'cancelled')
        .map(k => (k.metadata || {}).time || (p => p.length === 4 ? p.slice(0, 2) + ':' + p.slice(2) : p)(k.name.split(':')[2]));
      return json({ date: d, taken });
    }

    /* ----- 관리자 ----- */
    if (path.startsWith('/admin')) {
      if (!env.ADMIN_PASSWORD) return json({ error: 'ADMIN_PASSWORD not configured' }, 500);

      if (path === '/admin/login' && request.method === 'POST') {
        const pw = typeof body.password === 'string' ? body.password : '';
        await new Promise(r => setTimeout(r, 400));                 // 무차별 대입 완화
        if (!timingSafeEqual(pw, env.ADMIN_PASSWORD)) return json({ error: '비밀번호가 올바르지 않습니다.' }, 401);
        return json({ ok: true, token: await makeToken(env.ADMIN_PASSWORD), expiresIn: TOKEN_TTL_SEC });
      }

      const auth = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
      if (!(await verifyToken(auth, env.ADMIN_PASSWORD))) return json({ error: 'unauthorized' }, 401);

      if (path === '/admin/bookings' && request.method === 'GET') {
        const rows = await listBookings(env, {
          from: isDate(url.searchParams.get('from') || '') ? url.searchParams.get('from') : null,
          to: isDate(url.searchParams.get('to') || '') ? url.searchParams.get('to') : null,
          status: STATUSES.includes(url.searchParams.get('status')) ? url.searchParams.get('status') : null,
        });
        return json({ ok: true, count: rows.length, bookings: rows });
      }

      /* 시간 차단 / 해제 (휴진, 수동 정리) */
      if (path === '/admin/slot' && request.method === 'POST') {
        const d = str(body.date, 10), t = str(body.time, 5);
        if (!isDate(d) || !isTime(t)) return json({ error: 'date/time required' }, 400);
        const action = body.action === 'release' ? 'release' : 'claim';
        if (!env.SLOTS) return json({ error: 'SLOTS not bound' }, 500);
        const r = await slotStub(env, d).fetch('https://do/' + action, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ time: t, code: 'BLOCK' }),
        }).then(x => x.json()).catch(() => ({}));
        return json({ ok: true, action, date: d, time: t, conflict: !!r.conflict });
      }

      if (path === '/admin/booking' && request.method === 'GET') {
        const code = (url.searchParams.get('code') || '').toUpperCase();
        const k = await env.BOOKINGS.get(`c:${code}`);
        if (!k) return json({ error: 'not found' }, 404);
        const rec = JSON.parse((await env.BOOKINGS.get(k)) || 'null');
        return rec ? json({ ok: true, booking: rec }) : json({ error: 'not found' }, 404);
      }

      if (path === '/admin/booking' && request.method === 'POST') {
        const code = str(body.code, 20).toUpperCase();
        const k = await env.BOOKINGS.get(`c:${code}`);
        if (!k) return json({ error: 'not found' }, 404);
        const rec = JSON.parse((await env.BOOKINGS.get(k)) || 'null');
        if (!rec) return json({ error: 'not found' }, 404);
        if (body.status !== undefined) {
          if (!STATUSES.includes(body.status)) return json({ error: 'invalid status' }, 400);
          const was = rec.status;
          rec.status = body.status;
          if (env.SLOTS && was !== body.status) {
            const op = body.status === 'cancelled' ? 'release' : (was === 'cancelled' ? 'claim' : null);
            if (op) await slotStub(env, rec.date).fetch('https://do/' + op, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ time: rec.time, code: rec.code }) }).catch(() => {});
          }
        }
        if (body.adminNote !== undefined) rec.adminNote = str(body.adminNote, 1000);
        rec.updatedAt = new Date().toISOString();
        await env.BOOKINGS.put(k, JSON.stringify(rec), { metadata: { code: rec.code, status: rec.status, time: rec.time, name: rec.info.name, dose: rec.dose, total: rec.total } });
        return json({ ok: true, booking: rec });
      }
    }

    return json({ error: 'not found' }, 404);
  },
};
