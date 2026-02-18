export const initialCategoryRules = [
  // 식비 > 배달
  { keyword: "쿠팡이츠", categoryL1: "식비", categoryL2: "배달", categoryL3: "배달앱", priority: 10 },
  { keyword: "배달", categoryL1: "식비", categoryL2: "배달", categoryL3: "", priority: 10 },

  // 식비 > 식료품
  { keyword: "하나로마트", categoryL1: "식비", categoryL2: "식료품", categoryL3: "마트", priority: 10 },
  { keyword: "마트", categoryL1: "식비", categoryL2: "식료품", categoryL3: "마트", priority: 9 },

  // 식비 > 카페/음료
  { keyword: "커피", categoryL1: "식비", categoryL2: "카페/음료", categoryL3: "커피", priority: 10 },
  { keyword: "카페", categoryL1: "식비", categoryL2: "카페/음료", categoryL3: "커피", priority: 10 },
  { keyword: "컴포즈", categoryL1: "식비", categoryL2: "카페/음료", categoryL3: "커피", priority: 10 },

  // 식비 > 외식
  { keyword: "식당", categoryL1: "식비", categoryL2: "외식", categoryL3: "", priority: 9 },
  { keyword: "음식", categoryL1: "식비", categoryL2: "외식", categoryL3: "", priority: 9 },

  // 쇼핑 > 생활용품
  { keyword: "다이소", categoryL1: "쇼핑", categoryL2: "생활용품", categoryL3: "다이소", priority: 10 },

  // 교통 > 대중교통
  { keyword: "철도공사", categoryL1: "교통", categoryL2: "대중교통", categoryL3: "기차", priority: 10 },
  { keyword: "버스", categoryL1: "교통", categoryL2: "대중교통", categoryL3: "버스", priority: 10 },

  // 교통 > 자동차
  { keyword: "고속도로", categoryL1: "교통", categoryL2: "자동차", categoryL3: "하이패스", priority: 10 },
  { keyword: "하이패스", categoryL1: "교통", categoryL2: "자동차", categoryL3: "하이패스", priority: 10 },
  { keyword: "주유", categoryL1: "교통", categoryL2: "자동차", categoryL3: "주유", priority: 10 },
  { keyword: "기름", categoryL1: "교통", categoryL2: "자동차", categoryL3: "주유", priority: 10 },

  // 교통 > 택시
  { keyword: "택시", categoryL1: "교통", categoryL2: "택시", categoryL3: "", priority: 10 },

  // 보험
  { keyword: "보험", categoryL1: "보험", categoryL2: "", categoryL3: "", priority: 10 },
  { keyword: "KB손해", categoryL1: "보험", categoryL2: "손해보험", categoryL3: "", priority: 10 },
  { keyword: "롯데손해", categoryL1: "보험", categoryL2: "손해보험", categoryL3: "", priority: 10 },
  { keyword: "한화손해", categoryL1: "보험", categoryL2: "손해보험", categoryL3: "", priority: 10 },
  { keyword: "삼성화재", categoryL1: "보험", categoryL2: "손해보험", categoryL3: "", priority: 10 },
  { keyword: "캐롯", categoryL1: "보험", categoryL2: "손해보험", categoryL3: "자동차보험", priority: 10 },

  // 통신 > 휴대폰
  { keyword: "KT", categoryL1: "통신", categoryL2: "휴대폰", categoryL3: "KT", priority: 10 },
  { keyword: "LGU+", categoryL1: "통신", categoryL2: "휴대폰", categoryL3: "LGU+", priority: 10 },
  { keyword: "SKT", categoryL1: "통신", categoryL2: "휴대폰", categoryL3: "SKT", priority: 10 },

  // 통신 > 구독서비스
  { keyword: "유튜브프리미엄", categoryL1: "통신", categoryL2: "구독서비스", categoryL3: "유튜브", priority: 10 },

  // 의료
  { keyword: "의원", categoryL1: "의료", categoryL2: "진료", categoryL3: "의원", priority: 10 },
  { keyword: "병원", categoryL1: "의료", categoryL2: "진료", categoryL3: "병원", priority: 10 },
  { keyword: "약국", categoryL1: "의료", categoryL2: "약국", categoryL3: "", priority: 10 },
  { keyword: "진료", categoryL1: "의료", categoryL2: "진료", categoryL3: "", priority: 10 },

  // 쇼핑 > 온라인쇼핑
  { keyword: "쿠팡", categoryL1: "쇼핑", categoryL2: "온라인쇼핑", categoryL3: "쿠팡", priority: 9 },
  { keyword: "네이버", categoryL1: "쇼핑", categoryL2: "온라인쇼핑", categoryL3: "네이버", priority: 9 },
  { keyword: "아마존", categoryL1: "쇼핑", categoryL2: "온라인쇼핑", categoryL3: "해외직구", priority: 10 },

  // 여가/문화
  { keyword: "메가박스", categoryL1: "여가/문화", categoryL2: "영화/공연", categoryL3: "영화", priority: 10 },

  // 기부
  { keyword: "재단", categoryL1: "기부", categoryL2: "", categoryL3: "", priority: 10 },
  { keyword: "후원", categoryL1: "기부", categoryL2: "정기후원", categoryL3: "", priority: 10 },
  { keyword: "자선", categoryL1: "기부", categoryL2: "", categoryL3: "", priority: 10 },

  // 금융
  { keyword: "연회비", categoryL1: "금융", categoryL2: "연회비", categoryL3: "", priority: 10 },
];
