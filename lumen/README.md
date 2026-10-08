# LUMEN (루멘) – 전신 MRI · CT · PET-CT 예방 정밀 검진

Ezra / Prenuvo 컨셉의 예방 목적 전신 영상 검진 스타트업 홈페이지 (정적 사이트, GitHub Pages).
주소: `https://smailab.github.io/lumen/`

## 페이지
| 파일 | 내용 |
|---|---|
| `index.html` | 메인 – 히어로, 발견 가능 질환, 검사 장비(MRI/CT/PET-CT) 비교, 추천 패키지·가격, 진행 절차, FAQ |
| `book.html` | 검사 예약 – 5단계: 검사 선택(패키지/개별/추가옵션) → 병원 선택 → 날짜·시간 → 예약자 정보·사전 문진 → 확인 |
| `centers.html` | 제휴 병원 – 지역·장비·토요일 검사 필터, 검색, 상세 정보, 해당 병원으로 바로 예약 |

URL 파라미터: `book.html?pkg=heart-lung`, `book.html?scan=petct`, `book.html?center=seoul-gangnam`, `centers.html?region=부산`

## 예약 로직
- 선택한 검사 장비를 **모두** 보유한 병원만 선택 가능
- 패키지 구성과 정확히 같을 때만 패키지 할인 적용
- PET-CT 포함 시 오전 시간만 예약 가능, 일요일 휴진, 토요일은 운영 병원만
- 사전 문진: MRI(심박동기·체내 금속·폐소공포증), CT/PET-CT(임신·조영제), PET-CT(당뇨) → 해당 시 안내 문구 표시
- 예약 내역은 브라우저 localStorage에 저장 (헤더의 "예약 확인")

## 구조
- `css/style.css` – 전체 스타일 (반응형)
- `js/data.js` – 검사 항목·패키지·추가 옵션·제휴 병원·FAQ **(시연용 샘플 데이터 – 병원명은 가상)**
- `js/app.js` – 공통 헤더/푸터, 페이지별 렌더링, 예약 단계 로직

## 운영 전 해야 할 일
1. `js/data.js`를 실제 제휴 병원·가격·장비 정보로 교체
2. `js/app.js`의 `BRAND`(대표번호, 이메일) 수정
3. 예약 데이터를 실제로 받으려면 백엔드 연동 필요 (현재 예약 확정은 `#submit` 클릭 핸들러에서 localStorage에만 저장) – 예: Google Forms/Sheets, Formspree, Supabase, 병원 예약 API
4. 시간대별 잔여 슬롯은 현재 데모용 의사난수 – 실제 병원 스케줄 API로 교체
5. 의료광고 사전심의(의료법 제56·57조), 개인정보(민감정보) 처리방침, 비급여 가격 고지 검토

## 이미지
`img/*.jpg`는 `tools/gen_images.py`로 생성한 **합성 의료영상 일러스트**입니다 (실제 환자 영상 아님, 저작권 걱정 없음).
재생성: `pip install numpy scipy pillow && python3 lumen/tools/gen_images.py`
실제 센터·장비·고객 사진이 생기면 같은 파일명으로 교체하거나 `index.html`에 추가하면 됩니다.
