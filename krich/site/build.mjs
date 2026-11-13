/* krich/ 폴더를 Cloudflare 워커 하나로 묶습니다.
 * 이 환경의 네트워크 프록시가 자산 업로드용 임시 토큰을 덮어써 Pages 직접 업로드가 막혀 있어,
 * 파일을 워커 스크립트에 담아 배포합니다.
 * 실행: node krich/site/build.mjs */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const OUT = join(ROOT, 'site', 'assets.js');
const SKIP_DIRS = new Set(['worker', 'site', 'node_modules']);
const SKIP_FILES = new Set(['README.md']);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};
const BINARY = new Set(['.jpg', '.jpeg', '.png', '.webp', '.ico']);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name) || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (!SKIP_FILES.has(name)) acc.push(full);
  }
  return acc;
}

const files = walk(ROOT).sort();
const map = {};
for (const f of files) {
  const path = '/' + relative(ROOT, f).split('\\').join('/');
  const ext = extname(f).toLowerCase();
  const buf = readFileSync(f);
  const binary = BINARY.has(ext);
  map[path] = { t: TYPES[ext] || 'application/octet-stream', b: binary ? 1 : 0, c: binary ? buf.toString('base64') : buf.toString('utf8') };
}
writeFileSync(OUT, '/* 자동 생성 – 수정하지 마세요. node krich/site/build.mjs 로 다시 만듭니다. */\nexport const ASSETS = ' + JSON.stringify(map) + ';\n');
console.log(`${files.length}개 파일 → site/assets.js (${(readFileSync(OUT).length / 1024).toFixed(0)} KB)`);
