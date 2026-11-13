# 챗봇 프록시 (Cloudflare Workers)

**배포 완료:** https://krich-chat.hyunsh99.workers.dev
(`js/data.js`의 `CHATBOT.endpoint`에 연결되어 있습니다)

## 남은 단계: OpenAI 키 등록
워커가 OpenAI를 호출하려면 `OPENAI_API_KEY` 시크릿이 필요합니다. 둘 중 하나로 등록하세요.

**A. 대시보드 (브라우저)**
Cloudflare 대시보드 → Workers & Pages → `krich-chat` → Settings → Variables and Secrets
→ Add → Type `Secret`, Name `OPENAI_API_KEY`, Value에 OpenAI 키 입력 → Deploy

**B. 터미널**
```bash
cd krich/worker && npx wrangler secret put OPENAI_API_KEY
```

등록 후 사이트의 💬 AI 상담에서 바로 동작합니다. 워커 재배포는 필요 없습니다.

---

# 처음부터 배포하는 방법 (참고)

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
| `ALLOWED_ORIGINS` | 호출을 허용할 사이트 도메인(쉼표 구분). 다른 사이트가 키를 무단 사용하지 못하게 막음. 현재: `https://smailab.github.io`, `https://krich-clinic.pages.dev` |

도메인을 추가하려면 `wrangler.toml`의 `ALLOWED_ORIGINS`에 쉼표로 덧붙이고 `npx wrangler deploy`를 실행하세요. 재배포해도 `OPENAI_API_KEY` 시크릿은 유지됩니다. Pages 미리보기 주소(`<해시>.krich-clinic.pages.dev`)는 정확히 일치하지 않으므로 허용되지 않습니다.

## 비용·보안 메모
- 대화 1회당 시스템 프롬프트(약 4~5천 토큰) + 질문·답변이 과금됩니다. gpt-4o-mini 기준 1회 수 원 수준.
- OpenAI 대시보드에서 월 사용 한도(Usage limits)를 꼭 설정하세요.
- Worker는 메시지 수·길이를 제한합니다. 트래픽이 많아지면 Cloudflare **Rate Limiting** 규칙(예: IP당 분당 20회)을 추가하세요.
- Vercel/Netlify 함수로 옮겨도 됩니다. `openai-proxy.js`의 로직을 그대로 쓰면 됩니다.

## 관리자 테스트 모드 (프록시 배포 전)
사이트 챗봇 창 우측 상단 ⚙ → API 키 입력. 키는 **그 브라우저의 localStorage에만** 저장되고 api.openai.com을 직접 호출합니다. 본인 테스트용이며, 방문자에게는 적용되지 않습니다.
