/* K-RICH CLINIC 사이트 (Cloudflare Workers) */
import { ASSETS } from './assets.js';

const enc = new TextEncoder();
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

export default {
  async fetch(request) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    }
    let path = decodeURIComponent(new URL(request.url).pathname);
    if (path.endsWith('/')) path += 'index.html';
    if (path === '') path = '/index.html';

    let asset = ASSETS[path];
    if (!asset && ASSETS[path + '.html']) { asset = ASSETS[path + '.html']; path += '.html'; }
    const missing = !asset;
    if (missing) { asset = ASSETS['/index.html']; path = '/index.html'; }

    return new Response(request.method === 'HEAD' ? null : (asset.b ? unb64(asset.c) : enc.encode(asset.c)), {
      status: missing ? 404 : 200,
      headers: {
        'Content-Type': asset.t,
        'Cache-Control': path.endsWith('.html') ? 'public, max-age=0, must-revalidate' : 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    });
  },
};
