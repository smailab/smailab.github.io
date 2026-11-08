# LongeviTube – 장수 · 건강수명 영상 큐레이션

유튜브형 레이아웃의 장수(longevity) · 건강수명(healthy lifespan) 영상 모음 사이트 (정적 사이트, GitHub Pages).
주소: `https://smailab.github.io/longevitube/`

## 화면
- **홈**: 카테고리 칩, 배너, 영상 그리드 (추천순 / 최신순 / 좋아요 먼저)
- **카테고리** `#/c/sleep` · **연사 페이지** `#/s/Peter Attia` · **검색** `#/search/수면` (단축키 `/`)
- **영상 페이지** `#/v/zone2`: 플레이어, 좋아요·나중에 보기·공유, 설명·핵심 요약·태그, 내 메모, 관련 영상
- **사이드바**: 홈, 최근 추가, 나중에 볼 영상, 시청 기록, 좋아요, 카테고리, 연사·채널
- **영상 추가** 버튼: 유튜브 링크를 붙여넣어 내 목록에 추가 (이 브라우저에만 저장)
- 다크 모드, 모바일 반응형

## 영상 넣는 법 (사이트 전체에 반영)
`js/data.js`의 `VIDEOS`에 항목을 추가/수정합니다.
- `yt`: 유튜브 영상 ID → 실제 썸네일 + 사이트 안에서 재생
- `cats`: 추가 카테고리 배열 (예: `cats: ["mental", "bluezones"]`) → 여러 카테고리 목록에 함께 표시
- `yt`가 없으면 `q`(검색어)로 유튜브 검색 결과로 연결 (썸네일은 카테고리 색상으로 자동 생성)

기본으로 들어 있는 TED·Huberman Lab·Lex Fridman 등 널리 시청된 실제 유튜브 영상 196개입니다 (배열 순서 = 인기순).
직접 확인한 영상 ID를 `yt`에 채우면 바로 임베드됩니다.

## 구조
- `index.html` – 단일 페이지 (해시 라우팅)
- `css/style.css` – 스타일 (라이트/다크, 반응형)
- `js/data.js` – 카테고리 · 영상 데이터
- `js/app.js` – 렌더링, 라우터, 좋아요/저장/기록/메모(localStorage), 영상 추가

## 캐시
`index.html`이 CSS·JS를 `?v=<1분 단위 값>`을 붙여 불러옵니다. 머지·배포 후 브라우저나 GitHub Pages 캐시에 남은 예전 파일 대신 최신 파일을 받게 하기 위한 것으로, 버전을 따로 올릴 필요가 없습니다.
(`index.html` 자체는 GitHub Pages 기본 캐시 때문에 최대 10분 늦게 반영될 수 있습니다.)

## 관리자 페이지 (`admin.html`)
주소: `https://smailab.github.io/longevitube/admin.html` (사이트 사이드바 맨 아래 ‘관리자’ 링크)

- **권한:** 이 저장소에 쓰기 권한이 있는 GitHub 토큰으로 로그인합니다. 서버가 없으므로 토큰이 곧 관리자 권한입니다.
  - 만드는 법: GitHub → Settings → Developer settings → Fine-grained tokens → Repository access: `smailab/smailab.github.io`만 → Permissions: Contents **Read and write**
  - 토큰은 관리자 브라우저에만 저장되고 GitHub API(`api.github.com`)로만 전송됩니다.
- **영상:** 검색·카테고리 필터, 제목·원제·연사·채널·카테고리·난이도·형식·설명·태그 수정, 삭제, 새 영상 추가, 순서(인기순) 변경
- **카테고리:** 이름·아이콘·썸네일 색 수정, 순서 변경, 추가, 삭제(영상을 다른 카테고리로 옮기거나 함께 삭제). 삭제된 카테고리 링크는 `CATEGORY_ALIAS`로 옮긴 카테고리에 연결됩니다.
- **게시:** ‘게시하기’를 누르면 `longevitube/js/data.js`가 `master`에 바로 커밋되고 1~2분 뒤 사이트에 반영됩니다. 게시 전 변경은 브라우저에 초안으로 보관되어 새로고침해도 유지됩니다.
- **충돌:** 그 사이 다른 곳에서 `data.js`가 바뀌면 게시가 거부됩니다(덮어쓰기 방지). 메뉴 ⋮ → ‘GitHub에서 다시 불러오기’ 후 다시 수정하세요.

## LUMEN 연동
LongeviTube는 LUMEN(`../lumen/`, 전신 MRI·CT·PET-CT 예방 검진)의 영상 채널입니다.
- 상단 바 **LUMEN 정밀검진** 버튼, 사이드바 **LUMEN 정밀검진** 메뉴(검진 안내·검사 예약·제휴 병원)
- 영상 페이지 아래 **관련 검사 안내**: 영상 카테고리에 맞는 검사로 바로 예약 (`js/app.js`의 `LUMEN_SCAN`)
  - 암 → 전신 PET-CT, 심혈관 → 관상동맥 석회화 CT, 뇌·멘탈 → 뇌 MRI+MRA, 그 외 → 전신 MRI
- LUMEN 메인 화면이 이 폴더의 `js/data.js`를 읽어 영상을 보여 주므로, `data.js`의 `CATEGORIES`·`VIDEOS` 이름과 `id`·`yt`·`cat`·`cats` 필드는 유지해 주세요.
