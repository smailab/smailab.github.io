# 챗봇 프록시 배포 (Cloudflare Workers, 무료 플랜 가능)

사이트(GitHub Pages)는 정적이라 OpenAI API 키를 넣을 수 없습니다. 이 Worker가 키를 보관하고 OpenAI를 대신 호출합니다.

## 1. 배포
```bash
cd krich/worker
npm i -g wrangler          # 또는 npx wrangler
npx wrangler login         # Cloudflare 계정 로그인 (브라우저)
npx wrangler secret put OPENAI_API_KEY   # 프롬프트에 API 키 입력 (코드·채팅에 적지 않기)
npx wrangler deploy
```
배포가 끝나면 `https://krich-chat.<계정>.workers.dev` 형태의 주소가 출력됩니다.

## 2. 사이트 연결
`krich/js/data.js`의 `CHATBOT.endpoint`에 그 주소를 넣고 커밋하면 끝입니다.
```js
const CHATBOT = { endpoint: 'https://krich-chat.<계정>.workers.dev', ... };
```

## 3. 확인
- `https://krich-chat.<계정>.workers.dev/health` → `{"ok":true}`
- 사이트에서 💬 AI 상담 버튼 → 질문 → 답변이 스트리밍되면 정상

## 설정값
| 이름 | 설명 |
|---|---|
| `OPENAI_API_KEY` | 시크릿. `wrangler secret put`으로만 저장 |
| `OPENAI_MODEL` | 기본 `gpt-4o-mini` (저렴·빠름). 더 높은 품질이 필요하면 `gpt-4o` 등으로 변경 |
| `ALLOWED_ORIGINS` | 호출을 허용할 사이트 도메인(쉼표 구분). 다른 사이트가 키를 무단 사용하지 못하게 막음 |

## 비용·보안 메모
- 대화 1회당 시스템 프롬프트(약 4~5천 토큰) + 질문·답변이 과금됩니다. gpt-4o-mini 기준 1회 수 원 수준.
- OpenAI 대시보드에서 월 사용 한도(Usage limits)를 꼭 설정하세요.
- Worker는 메시지 수·길이를 제한합니다. 트래픽이 많아지면 Cloudflare **Rate Limiting** 규칙(예: IP당 분당 20회)을 추가하세요.
- Vercel/Netlify 함수로 옮겨도 됩니다. `openai-proxy.js`의 로직을 그대로 쓰면 됩니다.

## 관리자 테스트 모드 (프록시 배포 전)
사이트 챗봇 창 우측 상단 ⚙ → API 키 입력. 키는 **그 브라우저의 localStorage에만** 저장되고 api.openai.com을 직접 호출합니다. 본인 테스트용이며, 방문자에게는 적용되지 않습니다.
