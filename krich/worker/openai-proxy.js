/* K-RICH CLINIC 챗봇 프록시 – Cloudflare Worker
 * 브라우저 → 이 Worker(/chat) → OpenAI. API 키는 Worker 시크릿(OPENAI_API_KEY)에만 저장됩니다.
 * 환경변수: OPENAI_API_KEY (시크릿, 필수), OPENAI_MODEL (기본 gpt-4o-mini), ALLOWED_ORIGINS (쉼표 구분, 예: https://smailab.github.io) */
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const originOk = allowed.length === 0 || allowed.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': originOk ? (origin || '*') : 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
    const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '/health') return json({ ok: true, service: 'krich-chat' });
    if (request.method !== 'POST' || url.pathname !== '/chat') return json({ error: 'not found' }, 404);
    if (!originOk) return json({ error: 'origin not allowed' }, 403);
    if (!env.OPENAI_API_KEY) return json({ error: 'OPENAI_API_KEY not configured' }, 500);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'invalid json' }, 400); }
    const messages = Array.isArray(body.messages) ? body.messages.slice(-30) : [];
    if (!messages.length) return json({ error: 'messages required' }, 400);
    for (const m of messages) {
      if (!m || !['system', 'user', 'assistant'].includes(m.role) || typeof m.content !== 'string') return json({ error: 'invalid message' }, 400);
      if (m.content.length > (m.role === 'system' ? 20000 : 2000)) return json({ error: 'message too long' }, 413);
    }

    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || 'gpt-4o-mini',
        messages,
        temperature: 0.3,
        max_tokens: 700,
        stream: body.stream !== false,
      }),
    });
    const headers = new Headers(cors);
    headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/json');
    headers.set('Cache-Control', 'no-store');
    return new Response(upstream.body, { status: upstream.status, headers });
  },
};
