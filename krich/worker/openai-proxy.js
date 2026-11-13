/* K-RICH CLINIC API – Cloudflare Worker
 * 1) /chat          : OpenAI 챗봇 프록시 (API 키는 Worker 시크릿에만 보관)
 * 2) /booking       : 예약 접수 → KV 저장
 * 3) /slots         : 날짜별 마감 시간 조회
 * 4) /account/*     : 회원 가입·로그인·내 예약
 * 5) /admin/*       : 관리자 로그인·예약 목록·상태 변경
 *
 * 바인딩: DB (D1), SLOTS (Durable Object)
 * 시크릿: OPENAI_API_KEY, ADMIN_PASSWORD, SESSION_SECRET
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

const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s64 => Uint8Array.from(atob(s64), c => c.charCodeAt(0));

async function pbkdf2(password, saltBytes) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' }, base, 256);
  return b64(bits);
}
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { hash: await pbkdf2(password, salt), salt: b64(salt) };
}
async function checkPassword(password, hash, salt) {
  return timingSafeEqual(await pbkdf2(password, unb64(salt)), hash);
}

const SESSION_TTL_SEC = 60 * 60 * 24 * 30;      // 회원 세션 30일
async function makeSession(secret, email) {
  const exp = String(Math.floor(Date.now() / 1000) + SESSION_TTL_SEC);
  const payload = `${btoa(email).replace(/=+$/, '')}.${exp}`;
  return `${payload}.${await hmac(secret, payload)}`;
}
async function readSession(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [e64, exp, sig] = parts;
  if (!/^\d+$/.test(exp) || Number(exp) < Math.floor(Date.now() / 1000)) return null;
  if (!timingSafeEqual(sig, await hmac(secret, `${e64}.${exp}`))) return null;
  try { return atob(e64.padEnd(Math.ceil(e64.length / 4) * 4, '=')); } catch { return null; }
}

const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 160;

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s);
const isTime = s => /^\d{2}:\d{2}$/.test(s);
const hhmm = t => String(t).replace(':', '');

const toRow = b => ([b.code, b.createdAt, b.updatedAt, b.status, b.date, b.time, b.visit, b.dose, b.pack, b.receive,
  JSON.stringify(b.extras || []), b.mix, b.total, b.info.name, b.info.ename, b.info.birth, b.info.sex, b.info.phone,
  b.info.contact, b.info.height, b.info.weight, b.info.meds, b.info.stay, b.info.fridge, b.info.prior,
  JSON.stringify(b.screening || []), b.adminNote || '', b.accountEmail || null]);

const fromRow = r => r && ({
  code: r.code, createdAt: r.created_at, updatedAt: r.updated_at, status: r.status,
  date: r.visit_date, time: r.visit_time, visit: r.visit_type, dose: r.dose, pack: r.pack, receive: r.receive,
  extras: JSON.parse(r.extras || '[]'), mix: r.mix, total: r.total,
  info: { name: r.name, ename: r.ename, birth: r.birth, sex: r.sex, phone: r.phone, contact: r.contact,
    height: r.height, weight: r.weight, meds: r.meds, stay: r.stay, fridge: r.fridge, prior: r.prior },
  screening: JSON.parse(r.screening || '[]'), adminNote: r.admin_note || '', accountEmail: r.account_email || null,
});

const INSERT_SQL = `INSERT INTO bookings (code,created_at,updated_at,status,visit_date,visit_time,visit_type,dose,pack,receive,extras,mix,total,name,ename,birth,sex,phone,contact,height,weight,meds,stay,fridge,prior,screening,admin_note,account_email)
  VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23,?24,?25,?26,?27,?28)`;

/* ---------- handlers ---------- */
async function createBooking(body, env, accountEmail) {
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
    accountEmail: accountEmail || null,
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
  try {
    await env.DB.prepare(INSERT_SQL).bind(...toRow(b)).run();
  } catch (e) {
    if (env.SLOTS) await slotStub(env, b.date).fetch('https://do/release', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ time: b.time }) }).catch(() => {});
    return { error: '예약을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.', status: 500 };
  }
  return { ok: true, code: b.code, createdAt: b.createdAt };
}

async function listBookings(env, { from, to, status }) {
  const where = [], bind = [];
  if (from) { where.push('visit_date >= ?'); bind.push(from); }
  if (to) { where.push('visit_date <= ?'); bind.push(to); }
  if (status) { where.push('status = ?'); bind.push(status); }
  const sql = `SELECT code, visit_date AS date, visit_time AS time, status, name, dose, total, account_email AS account
    FROM bookings ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY visit_date, visit_time LIMIT 2000`;
  const r = await env.DB.prepare(sql).bind(...bind).all();
  return r.results || [];
}

async function getBooking(env, code) {
  const r = await env.DB.prepare('SELECT * FROM bookings WHERE code = ?').bind(code).first();
  return fromRow(r);
}

async function setStatus(env, code, status, note) {
  const sets = ['updated_at = ?'], bind = [new Date().toISOString()];
  if (status !== undefined) { sets.push('status = ?'); bind.push(status); }
  if (note !== undefined) { sets.push('admin_note = ?'); bind.push(note); }
  bind.push(code);
  await env.DB.prepare(`UPDATE bookings SET ${sets.join(', ')} WHERE code = ?`).bind(...bind).run();
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

    if (!env.DB) return json({ error: 'D1 database not bound' }, 500);

    /* ----- 회원 ----- */
    const sessionEmail = async () => {
      if (!env.SESSION_SECRET) return null;
      return readSession((request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, ''), env.SESSION_SECRET);
    };

    if (path === '/account/register' && request.method === 'POST') {
      if (!env.SESSION_SECRET) return json({ error: 'SESSION_SECRET not configured' }, 500);
      const email = str(body.email, 160).toLowerCase();
      const name = str(body.name, 60), phone = str(body.phone, 40);
      const pw = typeof body.password === 'string' ? body.password : '';
      if (!name) return json({ error: '이름을 입력해 주세요.' }, 400);
      if (!isEmail(email)) return json({ error: '이메일 주소를 다시 확인해 주세요.' }, 400);
      if (!phone) return json({ error: '전화번호를 입력해 주세요.' }, 400);
      if (pw.length < 8) return json({ error: '비밀번호는 8자 이상으로 정해주세요.' }, 400);
      if (pw.length > 200) return json({ error: '비밀번호가 너무 깁니다.' }, 400);
      const exists = await env.DB.prepare('SELECT email FROM accounts WHERE email = ?').bind(email).first();
      if (exists) return json({ error: '이미 가입된 이메일입니다. 로그인해 주세요.' }, 409);
      const { hash, salt } = await hashPassword(pw);
      const now = new Date().toISOString();
      await env.DB.prepare('INSERT INTO accounts (email,name,phone,pw_hash,pw_salt,created_at,last_login) VALUES (?,?,?,?,?,?,?)')
        .bind(email, name, phone, hash, salt, now, now).run();
      return json({ ok: true, token: await makeSession(env.SESSION_SECRET, email), account: { email, name, phone } });
    }

    if (path === '/account/login' && request.method === 'POST') {
      if (!env.SESSION_SECRET) return json({ error: 'SESSION_SECRET not configured' }, 500);
      const email = str(body.email, 160).toLowerCase();
      const pw = typeof body.password === 'string' ? body.password : '';
      await new Promise(r => setTimeout(r, 300));
      const row = await env.DB.prepare('SELECT * FROM accounts WHERE email = ?').bind(email).first();
      if (!row || !(await checkPassword(pw, row.pw_hash, row.pw_salt))) {
        return json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, 401);
      }
      await env.DB.prepare('UPDATE accounts SET last_login = ? WHERE email = ?').bind(new Date().toISOString(), email).run();
      return json({ ok: true, token: await makeSession(env.SESSION_SECRET, email), account: { email: row.email, name: row.name, phone: row.phone } });
    }

    if (path === '/account/me' && request.method === 'GET') {
      const email = await sessionEmail();
      if (!email) return json({ error: 'unauthorized' }, 401);
      const row = await env.DB.prepare('SELECT email, name, phone, created_at FROM accounts WHERE email = ?').bind(email).first();
      if (!row) return json({ error: 'unauthorized' }, 401);
      return json({ ok: true, account: { email: row.email, name: row.name, phone: row.phone, createdAt: row.created_at } });
    }

    if (path === '/account/bookings' && request.method === 'GET') {
      const email = await sessionEmail();
      if (!email) return json({ error: 'unauthorized' }, 401);
      const r = await env.DB.prepare(`SELECT code, visit_date AS date, visit_time AS time, status, dose, pack, total, admin_note AS adminNote
        FROM bookings WHERE account_email = ? ORDER BY visit_date DESC, visit_time DESC LIMIT 100`).bind(email).all();
      return json({ ok: true, bookings: r.results || [] });
    }

    /* ----- 예약 접수 (회원 전용) ----- */
    if (path === '/booking' && request.method === 'POST') {
      const email = await sessionEmail();
      if (!email) return json({ error: '예약하려면 로그인해 주세요.' }, 401);
      const r = await createBooking(body, env, email);
      return r.error ? json({ error: r.error }, r.status) : json(r);
    }

    /* ----- 예약 조회 (예약번호 + 생년월일) ----- */
    if (path === '/booking/lookup' && request.method === 'POST') {
      const code = str(body.code, 20).toUpperCase(), birth = str(body.birth, 10);
      if (!code || !birth) return json({ error: '예약번호와 생년월일을 입력해 주세요.' }, 400);
      const rec = await getBooking(env, code);
      if (!rec || rec.info.birth !== birth) return json({ error: '예약을 찾을 수 없습니다.' }, 404);
      return json({ ok: true, booking: { code: rec.code, status: rec.status, date: rec.date, time: rec.time, dose: rec.dose, pack: rec.pack, total: rec.total, name: rec.info.name, adminNote: rec.adminNote } });
    }

    /* ----- 예약 취소 (본인) ----- */
    if (path === '/booking/cancel' && request.method === 'POST') {
      const code = str(body.code, 20).toUpperCase(), birth = str(body.birth, 10);
      const rec = await getBooking(env, code);
      const me = await sessionEmail();
      const mine = rec && me && rec.accountEmail === me;
      if (!rec || (!mine && rec.info.birth !== birth)) return json({ error: '예약을 찾을 수 없습니다.' }, 404);
      await setStatus(env, code, 'cancelled');
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
      const r = await env.DB.prepare("SELECT visit_time FROM bookings WHERE visit_date = ? AND status != 'cancelled'").bind(d).all();
      return json({ date: d, taken: (r.results || []).map(x => x.visit_time) });
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
        const rec = await getBooking(env, (url.searchParams.get('code') || '').toUpperCase());
        return rec ? json({ ok: true, booking: rec }) : json({ error: 'not found' }, 404);
      }

      if (path === '/admin/booking' && request.method === 'POST') {
        const code = str(body.code, 20).toUpperCase();
        const rec = await getBooking(env, code);
        if (!rec) return json({ error: 'not found' }, 404);
        if (body.status !== undefined && !STATUSES.includes(body.status)) return json({ error: 'invalid status' }, 400);
        const note = body.adminNote !== undefined ? str(body.adminNote, 1000) : undefined;
        await setStatus(env, code, body.status, note);
        if (env.SLOTS && body.status !== undefined && body.status !== rec.status) {
          const op = body.status === 'cancelled' ? 'release' : (rec.status === 'cancelled' ? 'claim' : null);
          if (op) await slotStub(env, rec.date).fetch('https://do/' + op, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ time: rec.time, code: rec.code }) }).catch(() => {});
        }
        return json({ ok: true, booking: await getBooking(env, code) });
      }
    }

    return json({ error: 'not found' }, 404);
  },
};
