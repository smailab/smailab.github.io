# Cloudflare에서 사이트 서빙하기

`https://krich-site.hyunsh99.workers.dev` 에서 같은 사이트를 서빙합니다.
GitHub Pages(`https://smailab.github.io/krich/`)와 병행 운영합니다.

## 왜 Pages가 아니라 Workers인가
Cloudflare Pages 직접 업로드는 임시 업로드 토큰을 `Authorization` 헤더로 보내는데, 이 작업 환경의 네트워크 프록시가 그 헤더를 계정 API 토큰으로 덮어써 인증이 실패합니다(`8000013 Authorization failed`). 그래서 사이트 파일을 워커 스크립트에 담아 배포합니다.

**더 나은 방법**: Cloudflare 대시보드에서 Pages 프로젝트 `krich-clinic`을 GitHub 저장소에 연결하면(Build output directory `krich`) 푸시할 때마다 자동 배포됩니다. 그 경우 이 워커는 삭제해도 됩니다.

## 배포
사이트 파일을 고친 뒤 두 명령을 실행해야 Cloudflare 쪽에 반영됩니다.
```bash
node krich/site/build.mjs
cd krich/site && npx wrangler deploy
```
GitHub Pages는 푸시만 하면 자동 반영됩니다.

## 구성
| 파일 | 설명 |
|---|---|
| `build.mjs` | `krich/` 파일을 읽어 `assets.js` 생성 (worker·site 폴더와 README는 제외) |
| `assets.js` | **자동 생성** – 직접 수정하지 말 것 |
| `index.js` | 경로에 맞는 파일 반환. 없는 경로는 index.html을 404로 |
| `wrangler.toml` | 워커 이름 `krich-site` |

## 주의
새 호스트에서 챗봇·예약 API를 쓰려면 `krich/worker/wrangler.toml`의 `ALLOWED_ORIGINS`에 그 주소가 있어야 합니다. 현재 등록된 주소: GitHub Pages, `krich-clinic.pages.dev`, `krich-site.hyunsh99.workers.dev`.
