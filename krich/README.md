# K-RICH CLINIC (후쿠오카) – 마운자로 클리닉 예약 사이트

한국인 방문객 대상 일본 마운자로(Mounjaro) 처방 클리닉 랜딩 + 온라인 예약 (정적 사이트, GitHub Pages).
실제 병원: K-RICH CLINIC (후쿠오카시 주오구 다이묘, 미용피부과·재생의료, 원장 김민규) – 공식 사이트 https://k-rich.jp/

## 공식 사이트에서 확인해 반영한 정보 (2026-11-13)
- 주소 〒810-0041 福岡県福岡市中央区大名2丁目12-18 GMビル赤坂 6階, 전화 092-406-5533, 접수 10:00~19:00, 휴진 비정기
- 공식 WEB 예약(medical-force), Instagram @k_rich_clinic, Google Maps 링크. LINE 상담 링크는 요청에 따라 미사용(`CLINIC.line = null`, URL 입력 시 버튼 자동 표시)
- 원장 프로필·경력·사진(`img/doctor.jpg`), 로고(`brand/logo.svg`), 브랜드 색상(베이지 #F4EEEA/#E5D8CD, 브라운 #987F65/#402D10/#1A0F04), 세리프 헤딩
- 마운자로 펜 가격은 클리닉 제공 실제 가격(4개 세트: 2.5mg ¥17,800 / 5mg ¥29,800 / 7.5mg ¥46,800 / 10mg ¥56,800). 카카오톡 채널은 공식 사이트에 없어 `CLINIC.kakao = null` (LINE으로 대체, URL 입력 시 자동 전환)
- 역에서의 도보 시간은 지도 기준 추정치(약 4분/8분)
주소: `https://smailab.github.io/krich/` (Cloudflare Pages 프로젝트 `krich-clinic`도 준비됨 – GitHub 연결 시 `krich-clinic.pages.dev`)

## 페이지
| 파일 | 내용 |
|---|---|
| `index.html` | 랜딩 – 히어로(가격 카드), 선택 이유, 마운자로 소개·용량 스케줄, 가격표·패키지, 5단계 절차, 귀국 반입 가이드, 진료진, 후기, 오시는 길(지도), FAQ, CTA |
| `book.html` | 예약 – 5단계: 진료 선택(초진/재진·용량·수량·옵션) → 날짜·시간 → 회원 가입·로그인 → 예약자 정보·BMI·체류/숙소 냉장고·기존 투여·사전 문진 → 확인·예약번호 발급 |
| `book.html?my=1` | 내 예약 확인·취소 (브라우저 localStorage) |
| `book.html?pack=p8` | 패키지 미리 선택 (`p4`/`p8`/`p12`) |

## AI 챗봇 상담 (OpenAI)
- 우측 하단 💬 AI 상담 버튼(히어로·헤더·푸터·모바일 바에서도 열림). `js/chat.js`가 사이트 데이터(가격·FAQ·반입 가이드·문진 등)로 시스템 프롬프트를 만들어 OpenAI chat completions를 스트리밍 호출
- **API 키는 사이트에 넣지 않습니다.** Cloudflare Worker 프록시 `https://krich-chat.hyunsh99.workers.dev` 배포 완료, `CHATBOT.endpoint`에 연결됨
- 호출 허용 도메인: `https://smailab.github.io`, `https://krich-clinic.pages.dev` (워커 `ALLOWED_ORIGINS`)
- 남은 단계: Cloudflare 대시보드 → Workers & Pages → `krich-chat` → Settings → Variables and Secrets 에서 `OPENAI_API_KEY` 시크릿 등록 (`worker/README.md` 참고)
- 프록시 배포 전에는 챗봇 창 ⚙에서 관리자 테스트 키를 브라우저에만 저장해 테스트 가능
- 모델 기본값 `gpt-4o-mini` (`CHATBOT.model`, 프록시의 `OPENAI_MODEL`), 대화는 sessionStorage에 유지, 최근 12턴만 전송
- **답변 범위 제한**: 마운자로 약품·처방, 본 클리닉의 가격·절차·예약, 한국 반입·보관, 클리닉 기본 정보, 페이지에 적힌 내용만 답변. 그 외(다른 질병·약 상담, 페이지에 없는 시술, 일반 상식, 번역·코딩, 여행·맛집, 투자, 잡담, 역할극)는 정해진 문구로 거절하고 전화 안내
- 혼합 질문은 범위 안의 부분만 답하고 나머지는 한 문장으로 거절. 지침 노출·역할 변경 요구도 거절
- 그 밖의 지침: 진단·처방 판단 금지, 응급 시 병원 안내, 가격은 엔+원화, 예약·전화 안내

## 원화 환산
- 모든 엔화 가격 옆에 `(약 ○○원)`을 표시. 페이지 로드 시 실시간 환율(jsdelivr currency-api → open.er-api.com 순)을 받아 갱신하고, 실패하면 `FX.krwPerJpy` 기준값(100엔=853.84원, 2026-11-06) 사용. 100원 단위 반올림, 참고용 표기

## 회원 계정
- 예약하려면 회원 가입이 필요합니다. 아이디는 이메일 주소이며, 이름·전화번호·비밀번호를 받습니다
- 비밀번호는 PBKDF2-SHA256(10만 회, 솔트)로 해시해 D1 `accounts` 테이블에 저장합니다. 평문은 저장하지 않습니다
- 로그인 세션은 `SESSION_SECRET`으로 서명한 30일 토큰이며 브라우저 localStorage에 보관합니다
- 예약은 `bookings.account_email`로 계정에 연결되어 `book.html?my=1`에서 기기와 상관없이 조회·취소할 수 있습니다
- 회원 가입 전 예약 건은 예약번호 + 생년월일로 조회합니다

## 예약 저장·관리
- 예약은 Cloudflare **D1** 데이터베이스 `krich-bookings`에 저장됩니다 (`worker/schema.sql`)
- 같은 시간 중복 예약은 Durable Object `SlotRegistry`가 차단합니다 (KV와 달리 즉시 일관성)
- 관리자 페이지 `admin.html`: 비밀번호 로그인 → 기간·상태별 목록, 상세(문진 포함), 상태 변경(확정 대기/확정/방문 완료/취소/노쇼), 관리자 메모, 시간 차단·해제, CSV 내려받기
- 손님은 `book.html?my=1`에서 예약번호 + 생년월일로 어느 기기에서나 조회·취소 가능
- 비밀번호는 Worker 시크릿 `ADMIN_PASSWORD`. 변경: `cd krich/worker && npx wrangler secret put ADMIN_PASSWORD`

## 예약 로직
- 초진은 2.5mg만 선택 가능, 재진은 모든 용량 선택 가능
- 1회 최대 12개(한국 휴대 반입 한도 3개월분) – `CLINIC.maxPens`
- 수령 방법: 내원 수령만 운영 (`RECEIVE`에 항목을 추가하면 선택 UI가 자동 표시)
- 접수 10:00–19:00 매일(공식: 비정기 휴진 → `CLINIC.closedDates`에 날짜 추가), 점심 13:00–14:00 제외, 마감 30분 전까지, 60일 이내 예약
- 사전 문진: 갑상선 수질암·MEN2 가족력, 임신·수유 → 금기 경고 / 췌장염·GLP-1 병용·당뇨약·위장질환 → 주의 안내
- BMI 자동 계산 (23 미만이면 노란색 표시)
- 예약 완료 시 예약번호(KR…) 발급, "예약 내용 복사 후 카카오톡 열기" 버튼으로 카카오톡 채널에 전달

## 구조
- `css/style.css` – 전체 스타일 (반응형, 모바일 하단 고정 CTA)
- `js/data.js` – 클리닉 정보·가격·수령 방법·임상 데이터·절차·귀국 가이드·체류별 수량·체크리스트·FAQ·진료진·후기·문진 항목 **(시연용 샘플 – 병원 주소·가격·프로필은 가상)**

## 콘텐츠 출처 (2026-11 기준)
- 한국 휴대 반입 규정(2026-11-12 시행, 3개월분·주 1회 주사제 12개): 식품의약품안전처·관세청 합동 보도자료(2026-11-11)
- 보관(냉장 2~8℃, 30℃ 이하 상온 21일)·사용 후 펜 폐기: 일본 일라이릴리 안내
- 기내 반입(자가주사기, 사전 신고·진단서 불필요): ANA 안내
- 임상 수치: Jastreboff AM et al., NEJM 2022;387:205-216 (SURMOUNT-1)
- 한국·일본 가격 비교: 주간경향(2026-09), 일본 온라인 클리닉 공식 가격표(2026-11), 2026-08-01 일본 약가 25% 인하
- 규정·가격은 바뀔 수 있으므로 운영 시 주기적으로 갱신 필요
- `js/app.js` – 공통 헤더/푸터, 랜딩 렌더링, 예약 단계 로직
- `js/chat.js` – AI 상담 위젯 (OpenAI), `worker/openai-proxy.js` – API 키를 숨기는 Cloudflare Worker 프록시

## 운영 전 해야 할 일
1. `js/data.js`의 `CLINIC`에서 카카오톡 채널 URL(`kakao`), 휴진일(`closedDates`), 점심시간(`lunch`) 확인·입력
2. `PRICES`의 12.5mg·15mg 가격(현재 '문의'), 8/12주 패키지 할인율(현재 0) 확인. 혈액검사·배송·보냉 가방·주사바늘 항목은 요청에 따라 삭제됨 – 가격표·히어로 카드·예약 요약에 자동 반영
3. `DOCTORS`, `REVIEWS`, 통계 수치(index.html `.stats`)를 실제 내용으로 교체
4. 지도 iframe은 `CLINIC.mapEmbed`(주소 검색 embed)로 표시 – 필요 시 정확한 좌표 embed로 교체
5. `ADMIN_PASSWORD` 변경 (현재 임시 비밀번호가 설정되어 있음)
6. 예약 확정 시 손님에게 자동 알림(이메일/문자)은 아직 없음 – 필요하면 Worker에 연동
7. 의료광고·의약품 반입 안내 문구는 일본 의료법·한국 관세/식약처 규정에 맞게 법률 검토
