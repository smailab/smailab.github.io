/* =========================================================
   LUMEN 데이터 (시연용 샘플 데이터 – 운영 전 실제 정보로 교체)
   ========================================================= */

const MODALITIES = {
  MRI:   { name: "MRI",    full: "자기공명영상",          color: "#3b6cf6", radiation: "방사선 없음" },
  CT:    { name: "CT",     full: "컴퓨터단층촬영",        color: "#0ea5a4", radiation: "저선량 방사선" },
  PETCT: { name: "PET-CT", full: "양전자방출단층촬영",    color: "#c2410c", radiation: "방사선 노출 있음" }
};

/* 개별 검사 항목 */
const SCANS = [
  {
    id: "wb-mri", img: "img/wholebody-mri.jpg", imgPos: "50% 18%", modality: "MRI", tier: "core",
    name: "전신 MRI", en: "Whole Body MRI",
    duration: 60, price: 2490000, radiation: "없음",
    tag: "대표 검사",
    summary: "머리부터 골반까지 13개 이상 장기를 방사선 없이 한 번에 촬영합니다.",
    regions: ["뇌", "경추·흉추·요추", "갑상선", "폐", "간", "담낭", "췌장", "비장", "신장", "부신", "방광", "자궁·난소 / 전립선", "골반골"],
    detects: ["고형암(간·췌장·신장 등)", "뇌동맥류 의심 소견", "척추 디스크·협착", "지방간", "낭종·혹", "동맥 확장"],
    prep: ["검사 4시간 전부터 금식", "금속 소지품·화장품(펄) 제거", "편한 복장 (검사복 제공)"]
  },
  {
    id: "wb-mri-plus", img: "img/wholebody-mri.jpg", imgPos: "50% 35%", modality: "MRI", tier: "plus",
    name: "전신 MRI 플러스", en: "Whole Body MRI Plus",
    duration: 90, price: 3290000, radiation: "없음",
    tag: "가장 정밀",
    summary: "전신 MRI에 뇌혈관(MRA)·척추 정밀·확산강조영상(DWI)을 더한 확장 프로토콜입니다.",
    regions: ["전신 MRI 전 부위", "뇌혈관 MRA", "척추 전체 정밀", "전신 확산강조영상(DWI)"],
    detects: ["전신 MRI 항목 전체", "뇌동맥류·혈관 협착", "초기 미세 병변", "골전이 의심 소견"],
    prep: ["검사 4시간 전부터 금식", "금속 소지품 제거", "폐소공포증이 있으면 사전 알림"]
  },
  {
    id: "brain-mri", img: "img/brain-mri.jpg", imgPos: "50% 50%", modality: "MRI", tier: "focus",
    name: "뇌 MRI + MRA", en: "Brain MRI & MRA",
    duration: 30, price: 690000, radiation: "없음",
    tag: "",
    summary: "뇌 실질과 뇌혈관을 함께 확인해 뇌졸중·뇌동맥류 위험을 평가합니다.",
    regions: ["대뇌·소뇌", "뇌간", "뇌혈관(Willis 환)", "경동맥"],
    detects: ["뇌동맥류", "무증상 뇌경색", "백질 변화", "뇌종양"],
    prep: ["금식 불필요", "금속 소지품 제거"]
  },
  {
    id: "ldct", img: "img/chest-ct.jpg", imgPos: "50% 50%", modality: "CT", tier: "focus",
    name: "저선량 폐 CT", en: "Low-Dose Chest CT",
    duration: 10, price: 190000, radiation: "약 1 mSv",
    tag: "흡연자 추천",
    summary: "일반 CT 대비 약 1/5 선량으로 폐결절과 초기 폐암을 선별합니다.",
    regions: ["폐", "기관지", "흉막"],
    detects: ["폐결절", "초기 폐암", "폐기종", "간질성 폐질환"],
    prep: ["금식 불필요", "상의 금속 제거"]
  },
  {
    id: "cac", img: "img/chest-ct.jpg", imgPos: "60% 55%", modality: "CT", tier: "focus",
    name: "관상동맥 석회화 CT", en: "Coronary Calcium Score",
    duration: 10, price: 220000, radiation: "약 1 mSv",
    tag: "",
    summary: "심장혈관 석회화 점수(CAC)로 10년 내 심혈관 질환 위험도를 수치화합니다.",
    regions: ["관상동맥"],
    detects: ["관상동맥 석회화 점수", "심혈관 위험도 등급"],
    prep: ["검사 전 카페인 섭취 자제", "조영제 사용 없음"]
  },
  {
    id: "ccta", img: "img/chest-ct.jpg", imgPos: "55% 60%", modality: "CT", tier: "focus",
    name: "관상동맥 CT 혈관조영", en: "Coronary CT Angiography",
    duration: 20, price: 450000, radiation: "약 3–5 mSv",
    tag: "",
    summary: "조영제를 사용해 관상동맥 협착과 플라크 성상을 직접 확인합니다.",
    regions: ["관상동맥", "심장 구조"],
    detects: ["관상동맥 협착", "연성 플라크", "심장 구조 이상"],
    prep: ["검사 4시간 전 금식", "조영제 알레르기·신장 질환 여부 사전 확인", "카페인 자제"]
  },
  {
    id: "petct", img: "img/pet-mip.jpg", imgPos: "50% 25%", modality: "PETCT", tier: "core",
    name: "전신 PET-CT", en: "Whole Body PET-CT",
    duration: 120, price: 1690000, radiation: "약 7–10 mSv",
    tag: "암 정밀",
    summary: "포도당 대사를 영상화해 활동성 암세포 의심 부위를 전신에서 찾습니다. (투약·대기 포함 약 2시간)",
    regions: ["두경부", "흉부", "복부", "골반", "림프절"],
    detects: ["대사 활성 종양", "림프절 이상", "원격 전이 의심 소견"],
    prep: ["검사 6시간 전 금식 (물 가능)", "전날 격한 운동 금지", "당뇨약 복용 시 사전 상담", "검사 후 당일 영유아·임산부 접촉 자제"]
  }
];

/* 추천 패키지 (SCANS 조합 + 할인) */
const PACKAGES = [
  {
    id: "essential", name: "에센셜", en: "Essential",
    scans: ["wb-mri"], discount: 0,
    desc: "방사선 걱정 없이 시작하는 첫 전신 검진",
    perks: ["전신 MRI 60분", "영상의학 전문의 판독", "1:1 결과 상담 (온라인)"]
  },
  {
    id: "heart-lung", name: "에센셜 + 심폐", en: "Essential + Heart & Lung",
    scans: ["wb-mri", "ldct", "cac"], discount: 0.1, featured: true,
    desc: "전신 MRI의 사각지대인 폐·심장혈관까지 보완",
    perks: ["전신 MRI 60분", "저선량 폐 CT", "관상동맥 석회화 CT", "1:1 결과 상담 (대면/온라인)"]
  },
  {
    id: "total", name: "토탈 프리미엄", en: "Total Premium",
    scans: ["wb-mri-plus", "ldct", "ccta", "petct"], discount: 0.15,
    desc: "MRI·CT·PET-CT를 모두 결합한 최상위 정밀 검진",
    perks: ["전신 MRI 플러스 90분", "저선량 폐 CT", "관상동맥 CT 혈관조영", "전신 PET-CT", "전담 코디네이터 · 대면 상담"]
  }
];

/* 선택 추가 항목 */
const ADDONS = [
  { id: "blood", name: "정밀 혈액검사 (종양표지자 포함)", price: 290000 },
  { id: "consult", name: "대면 전문의 결과 상담 (60분)", price: 150000 },
  { id: "sedation", name: "폐소공포증 케어 (오픈형 장비 우선 배정·진정 상담)", price: 100000 }
];

/* 제휴 병원 – 가상의 샘플 데이터 */
const CENTERS = [
  {
    id: "seoul-gangnam", name: "루멘 강남 이미징센터", region: "서울", district: "강남구",
    address: "서울 강남구 테헤란로 일대 (강남역 도보 5분)",
    modalities: ["MRI", "CT", "PETCT"],
    equipment: ["3T MRI · Siemens MAGNETOM Vida", "256채널 CT", "Digital PET-CT"],
    hours: "평일 07:00–21:00 · 토 08:00–17:00", weekend: true,
    features: ["주차 가능", "여성 전용 시간대", "영어 상담"],
    flagship: true
  },
  {
    id: "seoul-yeouido", name: "여의도 바른영상의학과", region: "서울", district: "영등포구",
    address: "서울 영등포구 여의대로 일대 (여의도역 도보 3분)",
    modalities: ["MRI", "CT"],
    equipment: ["3T MRI · GE SIGNA Premier", "128채널 저선량 CT"],
    hours: "평일 07:30–20:00 · 토 08:00–13:00", weekend: true,
    features: ["직장인 조기·야간 검사", "주차 가능"]
  },
  {
    id: "seoul-jongno", name: "광화문 정밀검진센터", region: "서울", district: "종로구",
    address: "서울 종로구 세종대로 일대 (광화문역 도보 2분)",
    modalities: ["MRI", "CT", "PETCT"],
    equipment: ["3T MRI · Philips Ingenia Elition", "Dual-source CT", "PET-CT"],
    hours: "평일 08:00–18:00", weekend: false,
    features: ["대학병원 협진", "외국어 상담"]
  },
  {
    id: "seoul-songpa", name: "잠실 메디스캔의원", region: "서울", district: "송파구",
    address: "서울 송파구 올림픽로 일대 (잠실역 도보 4분)",
    modalities: ["MRI"],
    equipment: ["1.5T 와이드보어 MRI (70cm)", "오픈형 MRI"],
    hours: "평일 09:00–19:00 · 토 09:00–15:00", weekend: true,
    features: ["폐소공포증 케어", "주차 가능"]
  },
  {
    id: "gyeonggi-bundang", name: "분당 루멘 제휴 영상센터", region: "경기", district: "성남시 분당구",
    address: "경기 성남시 분당구 판교역로 일대 (판교역 도보 5분)",
    modalities: ["MRI", "CT"],
    equipment: ["3T MRI · Siemens MAGNETOM Skyra", "128채널 CT"],
    hours: "평일 08:00–20:00 · 토 08:00–14:00", weekend: true,
    features: ["주차 가능", "여성 전용 시간대"]
  },
  {
    id: "gyeonggi-suwon", name: "수원 정밀영상의학과", region: "경기", district: "수원시 영통구",
    address: "경기 수원시 영통구 광교중앙로 일대",
    modalities: ["MRI", "CT", "PETCT"],
    equipment: ["3T MRI", "PET-CT", "저선량 CT"],
    hours: "평일 08:00–18:00", weekend: false,
    features: ["주차 가능", "대학병원 협진"]
  },
  {
    id: "incheon-songdo", name: "송도 국제검진센터", region: "인천", district: "연수구",
    address: "인천 연수구 컨벤시아대로 일대",
    modalities: ["MRI", "CT"],
    equipment: ["3T MRI · GE SIGNA Architect", "저선량 CT"],
    hours: "평일 08:00–19:00 · 토 08:00–13:00", weekend: true,
    features: ["영어·중국어 상담", "주차 가능"]
  },
  {
    id: "daejeon-dunsan", name: "대전 둔산 영상의학센터", region: "대전", district: "서구",
    address: "대전 서구 둔산로 일대",
    modalities: ["MRI", "CT"],
    equipment: ["3T MRI", "128채널 CT"],
    hours: "평일 08:30–18:30", weekend: false,
    features: ["주차 가능"]
  },
  {
    id: "daegu-suseong", name: "대구 수성 정밀검진의원", region: "대구", district: "수성구",
    address: "대구 수성구 달구벌대로 일대",
    modalities: ["MRI", "CT", "PETCT"],
    equipment: ["3T MRI", "PET-CT", "Dual-source CT"],
    hours: "평일 08:00–18:00 · 토 08:00–12:00", weekend: true,
    features: ["주차 가능", "여성 전용 시간대"]
  },
  {
    id: "busan-haeundae", name: "해운대 루멘 제휴 이미징센터", region: "부산", district: "해운대구",
    address: "부산 해운대구 센텀중앙로 일대 (센텀시티역 인근)",
    modalities: ["MRI", "CT", "PETCT"],
    equipment: ["3T MRI · Siemens MAGNETOM Vida", "PET-CT", "256채널 CT"],
    hours: "평일 07:30–19:00 · 토 08:00–15:00", weekend: true,
    features: ["주차 가능", "영어·일본어 상담"]
  },
  {
    id: "gwangju-sangmu", name: "광주 상무 영상의학과", region: "광주", district: "서구",
    address: "광주 서구 상무중앙로 일대",
    modalities: ["MRI", "CT"],
    equipment: ["1.5T 와이드보어 MRI", "저선량 CT"],
    hours: "평일 09:00–18:00 · 토 09:00–13:00", weekend: true,
    features: ["폐소공포증 케어", "주차 가능"]
  }
];

const REGIONS = ["서울", "경기", "인천", "대전", "대구", "부산", "광주"];

const FAQS = [
  ["전신 MRI만으로 충분한가요?", "MRI는 방사선 없이 연부조직(뇌·간·췌장·신장·골반 등)을 잘 보지만, 폐와 관상동맥은 상대적으로 약합니다. 흡연력·가족력이 있다면 저선량 폐 CT나 관상동맥 석회화 CT를 함께 받는 것을 권장합니다."],
  ["MRI·CT·PET-CT는 어떻게 다른가요?", "MRI는 자기장을 이용해 방사선이 없고 연부조직 대조도가 뛰어납니다. CT는 짧은 시간에 폐·뼈·혈관을 선명하게 보며 소량의 방사선이 있습니다. PET-CT는 포도당 대사가 활발한 부위를 찾아 암 탐지에 강점이 있지만 방사선량이 가장 높습니다."],
  ["검사 결과는 언제, 어떻게 받나요?", "영상의학과 전문의 판독 후 영업일 기준 5–7일 이내 앱과 이메일로 리포트가 발송되며, 담당 의사와 1:1 결과 상담이 진행됩니다. 이상 소견 시 제휴 대학병원 진료 연계를 도와드립니다."],
  ["MRI를 받을 수 없는 경우가 있나요?", "심장박동기, 인공와우, 일부 금속 임플란트·클립이 있는 경우 MRI가 제한될 수 있습니다. 예약 과정의 사전 문진에서 확인하며, 필요 시 의료진이 개별 안내드립니다."],
  ["건강보험이 적용되나요?", "예방 목적의 검진은 비급여로 진행되며 실손보험 청구 대상이 아닌 경우가 많습니다. 정확한 비용은 병원별 비급여 고지 가격을 기준으로 안내됩니다."],
  ["예약 변경·취소는 어떻게 하나요?", "검사 2일 전까지 무료로 변경·취소할 수 있으며, 고객센터 또는 예약 확인 메일의 링크를 이용하시면 됩니다."]
];
