export const initialCategoryRules = [
  // ──────────────────────────────────────────
  // 식자재 > 마트
  // ──────────────────────────────────────────
  { keyword: "코스트코", categoryL1: "식자재", categoryL2: "마트", categoryL3: "코스트코", priority: 10 },
  { keyword: "이마트", categoryL1: "식자재", categoryL2: "마트", categoryL3: "이마트", priority: 10 },
  { keyword: "홈플러스", categoryL1: "식자재", categoryL2: "마트", categoryL3: "홈플러스", priority: 10 },
  { keyword: "롯데마트", categoryL1: "식자재", categoryL2: "마트", categoryL3: "롯데마트", priority: 10 },
  { keyword: "하나로마트", categoryL1: "식자재", categoryL2: "마트", categoryL3: "하나로마트", priority: 10 },
  { keyword: "농협마트", categoryL1: "식자재", categoryL2: "마트", categoryL3: "하나로마트", priority: 10 },
  { keyword: "트레이더스", categoryL1: "식자재", categoryL2: "마트", categoryL3: "이마트", priority: 10 },
  { keyword: "노브랜드", categoryL1: "식자재", categoryL2: "마트", categoryL3: "이마트", priority: 10 },
  { keyword: "마트", categoryL1: "식자재", categoryL2: "마트", categoryL3: "기타마트", priority: 7 },

  // 식자재 > 온라인식품
  { keyword: "쿠팡프레시", categoryL1: "식자재", categoryL2: "온라인식품", categoryL3: "쿠팡프레시", priority: 11 },
  { keyword: "마켓컬리", categoryL1: "식자재", categoryL2: "온라인식품", categoryL3: "마켓컬리", priority: 10 },
  { keyword: "컬리", categoryL1: "식자재", categoryL2: "온라인식품", categoryL3: "마켓컬리", priority: 10 },
  { keyword: "오아시스마켓", categoryL1: "식자재", categoryL2: "온라인식품", categoryL3: "", priority: 10 },
  { keyword: "SSG프레시", categoryL1: "식자재", categoryL2: "온라인식품", categoryL3: "", priority: 10 },

  // 식자재 > 전통시장
  { keyword: "전통시장", categoryL1: "식자재", categoryL2: "전통시장", categoryL3: "", priority: 10 },
  { keyword: "재래시장", categoryL1: "식자재", categoryL2: "전통시장", categoryL3: "", priority: 10 },

  // 식자재 > 편의점
  { keyword: "GS25", categoryL1: "식자재", categoryL2: "편의점", categoryL3: "GS25", priority: 10 },
  { keyword: "지에스25", categoryL1: "식자재", categoryL2: "편의점", categoryL3: "GS25", priority: 10 },
  { keyword: "CU ", categoryL1: "식자재", categoryL2: "편의점", categoryL3: "CU", priority: 10 },
  { keyword: "씨유", categoryL1: "식자재", categoryL2: "편의점", categoryL3: "CU", priority: 10 },
  { keyword: "세븐일레븐", categoryL1: "식자재", categoryL2: "편의점", categoryL3: "세븐일레븐", priority: 10 },
  { keyword: "이마트24", categoryL1: "식자재", categoryL2: "편의점", categoryL3: "이마트24", priority: 10 },
  { keyword: "미니스톱", categoryL1: "식자재", categoryL2: "편의점", categoryL3: "", priority: 10 },
  { keyword: "편의점", categoryL1: "식자재", categoryL2: "편의점", categoryL3: "", priority: 7 },

  // ──────────────────────────────────────────
  // 외식비 > 한식
  // ──────────────────────────────────────────
  { keyword: "아워홈", categoryL1: "외식비", categoryL2: "한식", categoryL3: "구내식당", priority: 10 },
  { keyword: "에드워드코리아", categoryL1: "외식비", categoryL2: "한식", categoryL3: "구내식당", priority: 10 },
  { keyword: "구내식당", categoryL1: "외식비", categoryL2: "한식", categoryL3: "구내식당", priority: 10 },
  { keyword: "식당", categoryL1: "외식비", categoryL2: "한식", categoryL3: "일반한식", priority: 7 },
  { keyword: "한식", categoryL1: "외식비", categoryL2: "한식", categoryL3: "일반한식", priority: 8 },
  { keyword: "김밥", categoryL1: "외식비", categoryL2: "한식", categoryL3: "분식", priority: 10 },
  { keyword: "분식", categoryL1: "외식비", categoryL2: "한식", categoryL3: "분식", priority: 10 },
  { keyword: "떡볶이", categoryL1: "외식비", categoryL2: "한식", categoryL3: "분식", priority: 10 },
  { keyword: "김가네", categoryL1: "외식비", categoryL2: "한식", categoryL3: "분식", priority: 10 },
  { keyword: "음식", categoryL1: "외식비", categoryL2: "한식", categoryL3: "", priority: 6 },

  // 외식비 > 중식
  { keyword: "짬뽕", categoryL1: "외식비", categoryL2: "중식", categoryL3: "", priority: 10 },
  { keyword: "짜장", categoryL1: "외식비", categoryL2: "중식", categoryL3: "", priority: 10 },
  { keyword: "중화", categoryL1: "외식비", categoryL2: "중식", categoryL3: "", priority: 9 },
  { keyword: "중국집", categoryL1: "외식비", categoryL2: "중식", categoryL3: "", priority: 10 },

  // 외식비 > 일식
  { keyword: "스시", categoryL1: "외식비", categoryL2: "일식", categoryL3: "", priority: 10 },
  { keyword: "초밥", categoryL1: "외식비", categoryL2: "일식", categoryL3: "", priority: 10 },
  { keyword: "라멘", categoryL1: "외식비", categoryL2: "일식", categoryL3: "", priority: 10 },
  { keyword: "돈카츠", categoryL1: "외식비", categoryL2: "일식", categoryL3: "", priority: 10 },
  { keyword: "우동", categoryL1: "외식비", categoryL2: "일식", categoryL3: "", priority: 9 },

  // 외식비 > 패스트푸드
  { keyword: "맥도날드", categoryL1: "외식비", categoryL2: "패스트푸드", categoryL3: "맥도날드", priority: 10 },
  { keyword: "한국맥도날드", categoryL1: "외식비", categoryL2: "패스트푸드", categoryL3: "맥도날드", priority: 11 },
  { keyword: "버거킹", categoryL1: "외식비", categoryL2: "패스트푸드", categoryL3: "버거킹", priority: 10 },
  { keyword: "롯데리아", categoryL1: "외식비", categoryL2: "패스트푸드", categoryL3: "롯데리아", priority: 10 },
  { keyword: "KFC", categoryL1: "외식비", categoryL2: "패스트푸드", categoryL3: "KFC", priority: 10 },
  { keyword: "맘스터치", categoryL1: "외식비", categoryL2: "패스트푸드", categoryL3: "", priority: 10 },
  { keyword: "서브웨이", categoryL1: "외식비", categoryL2: "패스트푸드", categoryL3: "", priority: 10 },

  // 외식비 > 카페/음료
  { keyword: "스타벅스", categoryL1: "외식비", categoryL2: "카페/음료", categoryL3: "스타벅스", priority: 10 },
  { keyword: "컴포즈", categoryL1: "외식비", categoryL2: "카페/음료", categoryL3: "컴포즈", priority: 10 },
  { keyword: "메가커피", categoryL1: "외식비", categoryL2: "카페/음료", categoryL3: "메가커피", priority: 10 },
  { keyword: "메가엠지씨", categoryL1: "외식비", categoryL2: "카페/음료", categoryL3: "메가커피", priority: 10 },
  { keyword: "빽다방", categoryL1: "외식비", categoryL2: "카페/음료", categoryL3: "빽다방", priority: 10 },
  { keyword: "투썸", categoryL1: "외식비", categoryL2: "카페/음료", categoryL3: "기타카페", priority: 10 },
  { keyword: "이디야", categoryL1: "외식비", categoryL2: "카페/음료", categoryL3: "기타카페", priority: 10 },
  { keyword: "할리스", categoryL1: "외식비", categoryL2: "카페/음료", categoryL3: "기타카페", priority: 10 },
  { keyword: "탐앤탐스", categoryL1: "외식비", categoryL2: "카페/음료", categoryL3: "기타카페", priority: 10 },
  { keyword: "폴바셋", categoryL1: "외식비", categoryL2: "카페/음료", categoryL3: "기타카페", priority: 10 },
  { keyword: "블루보틀", categoryL1: "외식비", categoryL2: "카페/음료", categoryL3: "기타카페", priority: 10 },
  { keyword: "커피빈", categoryL1: "외식비", categoryL2: "카페/음료", categoryL3: "기타카페", priority: 10 },
  { keyword: "커피", categoryL1: "외식비", categoryL2: "카페/음료", categoryL3: "기타카페", priority: 8 },
  { keyword: "카페", categoryL1: "외식비", categoryL2: "카페/음료", categoryL3: "기타카페", priority: 8 },

  // 외식비 > 배달
  { keyword: "배달의민족", categoryL1: "외식비", categoryL2: "배달", categoryL3: "배달의민족", priority: 10 },
  { keyword: "우아한형제", categoryL1: "외식비", categoryL2: "배달", categoryL3: "배달의민족", priority: 10 },
  { keyword: "쿠팡이츠", categoryL1: "외식비", categoryL2: "배달", categoryL3: "쿠팡이츠", priority: 11 },
  { keyword: "요기요", categoryL1: "외식비", categoryL2: "배달", categoryL3: "요기요", priority: 10 },
  { keyword: "배달", categoryL1: "외식비", categoryL2: "배달", categoryL3: "", priority: 7 },

  // 외식비 > 베이커리
  { keyword: "파리바게뜨", categoryL1: "외식비", categoryL2: "베이커리", categoryL3: "파리바게뜨", priority: 10 },
  { keyword: "뚜레쥬르", categoryL1: "외식비", categoryL2: "베이커리", categoryL3: "뚜레쥬르", priority: 10 },
  { keyword: "성심당", categoryL1: "외식비", categoryL2: "베이커리", categoryL3: "성심당", priority: 10 },
  { keyword: "베이커리", categoryL1: "외식비", categoryL2: "베이커리", categoryL3: "", priority: 9 },
  { keyword: "빵집", categoryL1: "외식비", categoryL2: "베이커리", categoryL3: "", priority: 9 },
  { keyword: "던킨", categoryL1: "외식비", categoryL2: "베이커리", categoryL3: "", priority: 10 },
  { keyword: "크리스피크림", categoryL1: "외식비", categoryL2: "베이커리", categoryL3: "", priority: 10 },

  // ──────────────────────────────────────────
  // 생활용품
  // ──────────────────────────────────────────
  { keyword: "다이소", categoryL1: "생활용품", categoryL2: "다이소", categoryL3: "", priority: 10 },
  { keyword: "아성다이소", categoryL1: "생활용품", categoryL2: "다이소", categoryL3: "", priority: 11 },

  // ──────────────────────────────────────────
  // 공과금
  // ──────────────────────────────────────────
  { keyword: "한국전력", categoryL1: "공과금", categoryL2: "전기", categoryL3: "", priority: 10 },
  { keyword: "전기요금", categoryL1: "공과금", categoryL2: "전기", categoryL3: "", priority: 10 },
  { keyword: "수도요금", categoryL1: "공과금", categoryL2: "수도", categoryL3: "", priority: 10 },
  { keyword: "상하수도", categoryL1: "공과금", categoryL2: "수도", categoryL3: "", priority: 10 },
  { keyword: "도시가스", categoryL1: "공과금", categoryL2: "가스", categoryL3: "", priority: 10 },
  { keyword: "가스공사", categoryL1: "공과금", categoryL2: "가스", categoryL3: "", priority: 10 },
  { keyword: "KT", categoryL1: "공과금", categoryL2: "통신", categoryL3: "KT", priority: 10 },
  { keyword: "LGU+", categoryL1: "공과금", categoryL2: "통신", categoryL3: "LGU+", priority: 10 },
  { keyword: "LG유플러스", categoryL1: "공과금", categoryL2: "통신", categoryL3: "LGU+", priority: 10 },
  { keyword: "SKT", categoryL1: "공과금", categoryL2: "통신", categoryL3: "SKT", priority: 10 },
  { keyword: "SK텔레콤", categoryL1: "공과금", categoryL2: "통신", categoryL3: "SKT", priority: 10 },
  { keyword: "SK브로드밴드", categoryL1: "공과금", categoryL2: "인터넷", categoryL3: "", priority: 10 },
  { keyword: "KT인터넷", categoryL1: "공과금", categoryL2: "인터넷", categoryL3: "", priority: 10 },
  { keyword: "LG인터넷", categoryL1: "공과금", categoryL2: "인터넷", categoryL3: "", priority: 10 },

  // ──────────────────────────────────────────
  // 구독
  // ──────────────────────────────────────────
  { keyword: "넷플릭스", categoryL1: "구독", categoryL2: "OTT", categoryL3: "넷플릭스", priority: 10 },
  { keyword: "NETFLIX", categoryL1: "구독", categoryL2: "OTT", categoryL3: "넷플릭스", priority: 10 },
  { keyword: "디즈니플러스", categoryL1: "구독", categoryL2: "OTT", categoryL3: "디즈니플러스", priority: 10 },
  { keyword: "DISNEY", categoryL1: "구독", categoryL2: "OTT", categoryL3: "디즈니플러스", priority: 10 },
  { keyword: "왓챠", categoryL1: "구독", categoryL2: "OTT", categoryL3: "왓챠", priority: 10 },
  { keyword: "웨이브", categoryL1: "구독", categoryL2: "OTT", categoryL3: "웨이브", priority: 10 },
  { keyword: "WAVVE", categoryL1: "구독", categoryL2: "OTT", categoryL3: "웨이브", priority: 10 },
  { keyword: "쿠팡플레이", categoryL1: "구독", categoryL2: "OTT", categoryL3: "쿠팡플레이", priority: 11 },
  { keyword: "티빙", categoryL1: "구독", categoryL2: "OTT", categoryL3: "", priority: 10 },
  { keyword: "유튜브프리미엄", categoryL1: "구독", categoryL2: "유튜브프리미엄", categoryL3: "", priority: 10 },
  { keyword: "YOUTUBE", categoryL1: "구독", categoryL2: "유튜브프리미엄", categoryL3: "", priority: 10 },
  { keyword: "GOOGLE YOUTUBE", categoryL1: "구독", categoryL2: "유튜브프리미엄", categoryL3: "", priority: 11 },
  { keyword: "멜론", categoryL1: "구독", categoryL2: "음악", categoryL3: "멜론", priority: 10 },
  { keyword: "스포티파이", categoryL1: "구독", categoryL2: "음악", categoryL3: "스포티파이", priority: 10 },
  { keyword: "SPOTIFY", categoryL1: "구독", categoryL2: "음악", categoryL3: "스포티파이", priority: 10 },
  { keyword: "애플뮤직", categoryL1: "구독", categoryL2: "음악", categoryL3: "애플뮤직", priority: 10 },
  { keyword: "APPLE MUSIC", categoryL1: "구독", categoryL2: "음악", categoryL3: "애플뮤직", priority: 10 },
  { keyword: "ICLOUD", categoryL1: "구독", categoryL2: "클라우드", categoryL3: "iCloud", priority: 10 },
  { keyword: "구글원", categoryL1: "구독", categoryL2: "클라우드", categoryL3: "구글원", priority: 10 },
  { keyword: "GOOGLE ONE", categoryL1: "구독", categoryL2: "클라우드", categoryL3: "구글원", priority: 10 },
  { keyword: "드롭박스", categoryL1: "구독", categoryL2: "클라우드", categoryL3: "드롭박스", priority: 10 },
  { keyword: "DROPBOX", categoryL1: "구독", categoryL2: "클라우드", categoryL3: "드롭박스", priority: 10 },
  { keyword: "쿠팡로켓와우", categoryL1: "구독", categoryL2: "멤버십", categoryL3: "쿠팡로켓와우", priority: 11 },
  { keyword: "로켓와우", categoryL1: "구독", categoryL2: "멤버십", categoryL3: "쿠팡로켓와우", priority: 11 },
  { keyword: "네이버플러스", categoryL1: "구독", categoryL2: "멤버십", categoryL3: "네이버플러스", priority: 10 },
  { keyword: "APPLE.COM", categoryL1: "구독", categoryL2: "앱구독", categoryL3: "앱스토어", priority: 10 },
  { keyword: "KCP - APPLE", categoryL1: "구독", categoryL2: "앱구독", categoryL3: "앱스토어", priority: 11 },
  { keyword: "GOOGLE PLAY", categoryL1: "구독", categoryL2: "앱구독", categoryL3: "구글플레이", priority: 10 },
  { keyword: "구글플레이", categoryL1: "구독", categoryL2: "앱구독", categoryL3: "구글플레이", priority: 10 },

  // ──────────────────────────────────────────
  // 교육
  // ──────────────────────────────────────────
  { keyword: "학원", categoryL1: "교육", categoryL2: "", categoryL3: "", priority: 9 },
  { keyword: "학습지", categoryL1: "교육", categoryL2: "", categoryL3: "", priority: 9 },
  { keyword: "교보문고", categoryL1: "교육", categoryL2: "도서", categoryL3: "서점", priority: 10 },
  { keyword: "영풍문고", categoryL1: "교육", categoryL2: "도서", categoryL3: "서점", priority: 10 },
  { keyword: "알라딘", categoryL1: "교육", categoryL2: "도서", categoryL3: "서점", priority: 10 },
  { keyword: "예스24", categoryL1: "교육", categoryL2: "도서", categoryL3: "서점", priority: 10 },
  { keyword: "YES24", categoryL1: "교육", categoryL2: "도서", categoryL3: "서점", priority: 10 },
  { keyword: "리디북스", categoryL1: "교육", categoryL2: "도서", categoryL3: "전자책", priority: 10 },
  { keyword: "밀리의서재", categoryL1: "교육", categoryL2: "도서", categoryL3: "전자책", priority: 10 },
  { keyword: "클래스101", categoryL1: "교육", categoryL2: "온라인강의", categoryL3: "", priority: 10 },
  { keyword: "인프런", categoryL1: "교육", categoryL2: "온라인강의", categoryL3: "", priority: 10 },
  { keyword: "패스트캠퍼스", categoryL1: "교육", categoryL2: "온라인강의", categoryL3: "", priority: 10 },

  // ──────────────────────────────────────────
  // 보험
  // ──────────────────────────────────────────
  { keyword: "보험", categoryL1: "보험", categoryL2: "", categoryL3: "", priority: 8 },
  { keyword: "삼성생명", categoryL1: "보험", categoryL2: "생명보험", categoryL3: "", priority: 10 },
  { keyword: "한화생명", categoryL1: "보험", categoryL2: "생명보험", categoryL3: "", priority: 10 },
  { keyword: "교보생명", categoryL1: "보험", categoryL2: "생명보험", categoryL3: "", priority: 10 },
  { keyword: "메트라이프", categoryL1: "보험", categoryL2: "생명보험", categoryL3: "", priority: 10 },
  { keyword: "KB손해", categoryL1: "보험", categoryL2: "손해보험", categoryL3: "", priority: 10 },
  { keyword: "롯데손해", categoryL1: "보험", categoryL2: "손해보험", categoryL3: "", priority: 10 },
  { keyword: "한화손해", categoryL1: "보험", categoryL2: "손해보험", categoryL3: "", priority: 10 },
  { keyword: "삼성화재", categoryL1: "보험", categoryL2: "손해보험", categoryL3: "", priority: 10 },
  { keyword: "현대해상", categoryL1: "보험", categoryL2: "손해보험", categoryL3: "", priority: 10 },
  { keyword: "DB손해", categoryL1: "보험", categoryL2: "손해보험", categoryL3: "", priority: 10 },
  { keyword: "캐롯", categoryL1: "보험", categoryL2: "손해보험", categoryL3: "자동차보험", priority: 10 },
  { keyword: "실손", categoryL1: "보험", categoryL2: "건강보험", categoryL3: "실손", priority: 10 },

  // ──────────────────────────────────────────
  // 교통
  // ──────────────────────────────────────────
  { keyword: "철도공사", categoryL1: "교통", categoryL2: "대중교통", categoryL3: "기차", priority: 10 },
  { keyword: "코레일", categoryL1: "교통", categoryL2: "대중교통", categoryL3: "기차", priority: 10 },
  { keyword: "SRT", categoryL1: "교통", categoryL2: "대중교통", categoryL3: "기차", priority: 10 },
  { keyword: "KTX", categoryL1: "교통", categoryL2: "대중교통", categoryL3: "기차", priority: 10 },
  { keyword: "버스", categoryL1: "교통", categoryL2: "대중교통", categoryL3: "버스", priority: 9 },
  { keyword: "지하철", categoryL1: "교통", categoryL2: "대중교통", categoryL3: "지하철", priority: 10 },
  { keyword: "메트로", categoryL1: "교통", categoryL2: "대중교통", categoryL3: "지하철", priority: 9 },
  { keyword: "고속도로", categoryL1: "교통", categoryL2: "자동차", categoryL3: "하이패스", priority: 10 },
  { keyword: "하이패스", categoryL1: "교통", categoryL2: "자동차", categoryL3: "하이패스", priority: 10 },
  { keyword: "도로공사", categoryL1: "교통", categoryL2: "자동차", categoryL3: "하이패스", priority: 10 },
  { keyword: "주유", categoryL1: "교통", categoryL2: "자동차", categoryL3: "주유", priority: 10 },
  { keyword: "SK에너지", categoryL1: "교통", categoryL2: "자동차", categoryL3: "주유", priority: 10 },
  { keyword: "GS칼텍스", categoryL1: "교통", categoryL2: "자동차", categoryL3: "주유", priority: 10 },
  { keyword: "현대오일", categoryL1: "교통", categoryL2: "자동차", categoryL3: "주유", priority: 10 },
  { keyword: "S-OIL", categoryL1: "교통", categoryL2: "자동차", categoryL3: "주유", priority: 10 },
  { keyword: "에스오일", categoryL1: "교통", categoryL2: "자동차", categoryL3: "주유", priority: 10 },
  { keyword: "기름", categoryL1: "교통", categoryL2: "자동차", categoryL3: "주유", priority: 8 },
  { keyword: "주차", categoryL1: "교통", categoryL2: "자동차", categoryL3: "주차", priority: 10 },
  { keyword: "파킹", categoryL1: "교통", categoryL2: "자동차", categoryL3: "주차", priority: 10 },
  { keyword: "세차", categoryL1: "교통", categoryL2: "자동차", categoryL3: "세차", priority: 10 },
  { keyword: "정비", categoryL1: "교통", categoryL2: "자동차", categoryL3: "정비", priority: 9 },
  { keyword: "오토오아시스", categoryL1: "교통", categoryL2: "자동차", categoryL3: "정비", priority: 10 },
  { keyword: "택시", categoryL1: "교통", categoryL2: "택시", categoryL3: "", priority: 10 },
  { keyword: "카카오택시", categoryL1: "교통", categoryL2: "택시", categoryL3: "카카오택시", priority: 10 },
  { keyword: "카카오T", categoryL1: "교통", categoryL2: "택시", categoryL3: "카카오택시", priority: 10 },
  { keyword: "타다", categoryL1: "교통", categoryL2: "택시", categoryL3: "", priority: 10 },

  // ──────────────────────────────────────────
  // 의료
  // ──────────────────────────────────────────
  { keyword: "의원", categoryL1: "의료", categoryL2: "병원", categoryL3: "의원", priority: 10 },
  { keyword: "병원", categoryL1: "의료", categoryL2: "병원", categoryL3: "종합병원", priority: 9 },
  { keyword: "한의원", categoryL1: "의료", categoryL2: "병원", categoryL3: "한의원", priority: 10 },
  { keyword: "치과", categoryL1: "의료", categoryL2: "병원", categoryL3: "치과", priority: 10 },
  { keyword: "안과", categoryL1: "의료", categoryL2: "병원", categoryL3: "안과", priority: 10 },
  { keyword: "이비인후과", categoryL1: "의료", categoryL2: "병원", categoryL3: "", priority: 10 },
  { keyword: "피부과", categoryL1: "의료", categoryL2: "병원", categoryL3: "", priority: 10 },
  { keyword: "진료", categoryL1: "의료", categoryL2: "병원", categoryL3: "", priority: 8 },
  { keyword: "약국", categoryL1: "의료", categoryL2: "약국", categoryL3: "", priority: 10 },
  { keyword: "올리브영", categoryL1: "의료", categoryL2: "약국", categoryL3: "", priority: 9 },

  // ──────────────────────────────────────────
  // 취미
  // ──────────────────────────────────────────
  { keyword: "헬스", categoryL1: "취미", categoryL2: "운동/헬스", categoryL3: "헬스장", priority: 10 },
  { keyword: "피트니스", categoryL1: "취미", categoryL2: "운동/헬스", categoryL3: "헬스장", priority: 10 },
  { keyword: "수영장", categoryL1: "취미", categoryL2: "운동/헬스", categoryL3: "수영", priority: 10 },
  { keyword: "필라테스", categoryL1: "취미", categoryL2: "운동/헬스", categoryL3: "필라테스", priority: 10 },
  { keyword: "요가", categoryL1: "취미", categoryL2: "운동/헬스", categoryL3: "요가", priority: 10 },
  { keyword: "골프", categoryL1: "취미", categoryL2: "골프", categoryL3: "", priority: 10 },
  { keyword: "스크린골프", categoryL1: "취미", categoryL2: "골프", categoryL3: "", priority: 10 },
  { keyword: "메가박스", categoryL1: "취미", categoryL2: "기타취미", categoryL3: "", priority: 10 },
  { keyword: "CGV", categoryL1: "취미", categoryL2: "기타취미", categoryL3: "", priority: 10 },
  { keyword: "롯데시네마", categoryL1: "취미", categoryL2: "기타취미", categoryL3: "", priority: 10 },
  { keyword: "게임", categoryL1: "취미", categoryL2: "게임", categoryL3: "", priority: 9 },
  { keyword: "닌텐도", categoryL1: "취미", categoryL2: "게임", categoryL3: "", priority: 10 },
  { keyword: "STEAM", categoryL1: "취미", categoryL2: "게임", categoryL3: "", priority: 10 },
  { keyword: "자전거", categoryL1: "취미", categoryL2: "자전거", categoryL3: "", priority: 10 },

  // ──────────────────────────────────────────
  // 쇼핑
  // ──────────────────────────────────────────
  { keyword: "쿠팡", categoryL1: "쇼핑", categoryL2: "온라인", categoryL3: "쿠팡", priority: 8 },
  { keyword: "네이버쇼핑", categoryL1: "쇼핑", categoryL2: "온라인", categoryL3: "네이버", priority: 10 },
  { keyword: "네이버페이", categoryL1: "쇼핑", categoryL2: "온라인", categoryL3: "네이버", priority: 8 },
  { keyword: "아마존", categoryL1: "쇼핑", categoryL2: "온라인", categoryL3: "해외직구", priority: 10 },
  { keyword: "AMAZON", categoryL1: "쇼핑", categoryL2: "온라인", categoryL3: "해외직구", priority: 10 },
  { keyword: "알리익스프레스", categoryL1: "쇼핑", categoryL2: "온라인", categoryL3: "해외직구", priority: 10 },
  { keyword: "ALIEXPRESS", categoryL1: "쇼핑", categoryL2: "온라인", categoryL3: "해외직구", priority: 10 },
  { keyword: "테무", categoryL1: "쇼핑", categoryL2: "온라인", categoryL3: "해외직구", priority: 10 },
  { keyword: "TEMU", categoryL1: "쇼핑", categoryL2: "온라인", categoryL3: "해외직구", priority: 10 },
  { keyword: "11번가", categoryL1: "쇼핑", categoryL2: "온라인", categoryL3: "", priority: 10 },
  { keyword: "G마켓", categoryL1: "쇼핑", categoryL2: "온라인", categoryL3: "", priority: 10 },
  { keyword: "옥션", categoryL1: "쇼핑", categoryL2: "온라인", categoryL3: "", priority: 10 },
  { keyword: "위메프", categoryL1: "쇼핑", categoryL2: "온라인", categoryL3: "", priority: 10 },
  { keyword: "티몬", categoryL1: "쇼핑", categoryL2: "온라인", categoryL3: "", priority: 10 },
  { keyword: "SSG", categoryL1: "쇼핑", categoryL2: "온라인", categoryL3: "", priority: 9 },
  { keyword: "백화점", categoryL1: "쇼핑", categoryL2: "백화점", categoryL3: "", priority: 9 },
  { keyword: "현대백화점", categoryL1: "쇼핑", categoryL2: "백화점", categoryL3: "", priority: 10 },
  { keyword: "롯데백화점", categoryL1: "쇼핑", categoryL2: "백화점", categoryL3: "", priority: 10 },
  { keyword: "신세계", categoryL1: "쇼핑", categoryL2: "백화점", categoryL3: "", priority: 10 },
  { keyword: "유니클로", categoryL1: "쇼핑", categoryL2: "의류/패션", categoryL3: "의류", priority: 10 },
  { keyword: "UNIQLO", categoryL1: "쇼핑", categoryL2: "의류/패션", categoryL3: "의류", priority: 10 },
  { keyword: "자라", categoryL1: "쇼핑", categoryL2: "의류/패션", categoryL3: "의류", priority: 10 },
  { keyword: "ZARA", categoryL1: "쇼핑", categoryL2: "의류/패션", categoryL3: "의류", priority: 10 },
  { keyword: "무신사", categoryL1: "쇼핑", categoryL2: "의류/패션", categoryL3: "의류", priority: 10 },
  { keyword: "나이키", categoryL1: "쇼핑", categoryL2: "의류/패션", categoryL3: "신발", priority: 10 },
  { keyword: "NIKE", categoryL1: "쇼핑", categoryL2: "의류/패션", categoryL3: "신발", priority: 10 },
  { keyword: "아디다스", categoryL1: "쇼핑", categoryL2: "의류/패션", categoryL3: "신발", priority: 10 },

  // ──────────────────────────────────────────
  // 금융
  // ──────────────────────────────────────────
  { keyword: "연회비", categoryL1: "금융", categoryL2: "연회비", categoryL3: "", priority: 10 },
  { keyword: "이자", categoryL1: "금융", categoryL2: "이자", categoryL3: "", priority: 8 },
  { keyword: "소득세", categoryL1: "금융", categoryL2: "세금", categoryL3: "소득세", priority: 10 },
  { keyword: "재산세", categoryL1: "금융", categoryL2: "세금", categoryL3: "재산세", priority: 10 },
  { keyword: "국세", categoryL1: "금융", categoryL2: "세금", categoryL3: "", priority: 10 },
  { keyword: "지방세", categoryL1: "금융", categoryL2: "세금", categoryL3: "", priority: 10 },
  { keyword: "수수료", categoryL1: "금융", categoryL2: "수수료", categoryL3: "", priority: 8 },

  // ──────────────────────────────────────────
  // 기부
  // ──────────────────────────────────────────
  { keyword: "재단", categoryL1: "기부", categoryL2: "", categoryL3: "", priority: 9 },
  { keyword: "후원", categoryL1: "기부", categoryL2: "정기후원", categoryL3: "", priority: 10 },
  { keyword: "자선", categoryL1: "기부", categoryL2: "", categoryL3: "", priority: 10 },
  { keyword: "유니세프", categoryL1: "기부", categoryL2: "정기후원", categoryL3: "", priority: 10 },
  { keyword: "월드비전", categoryL1: "기부", categoryL2: "정기후원", categoryL3: "", priority: 10 },
  { keyword: "기부", categoryL1: "기부", categoryL2: "", categoryL3: "", priority: 8 },

  // ──────────────────────────────────────────
  // 추가 가맹점 매핑 (미분류 감소용)
  // ──────────────────────────────────────────
  // 가스
  { keyword: "가스", categoryL1: "공과금", categoryL2: "가스", categoryL3: "", priority: 8 },

  // 자동차 관련
  { keyword: "현대자동차", categoryL1: "교통", categoryL2: "자동차", categoryL3: "정비", priority: 10 },
  { keyword: "일렉링크", categoryL1: "교통", categoryL2: "자동차", categoryL3: "주유", priority: 10 },
  { keyword: "카카오모빌리티", categoryL1: "교통", categoryL2: "택시", categoryL3: "카카오택시", priority: 10 },

  // 외식
  { keyword: "프레디쉬", categoryL1: "식자재", categoryL2: "온라인식품", categoryL3: "", priority: 10 },
  { keyword: "뚜쥬루", categoryL1: "외식비", categoryL2: "베이커리", categoryL3: "", priority: 10 },
  { keyword: "참포크", categoryL1: "외식비", categoryL2: "한식", categoryL3: "", priority: 10 },
  { keyword: "무주향", categoryL1: "외식비", categoryL2: "한식", categoryL3: "", priority: 10 },
  { keyword: "아양짚", categoryL1: "외식비", categoryL2: "한식", categoryL3: "", priority: 10 },
  { keyword: "저스트칠링", categoryL1: "외식비", categoryL2: "카페/음료", categoryL3: "기타카페", priority: 10 },
  { keyword: "오늘도달콤", categoryL1: "외식비", categoryL2: "카페/음료", categoryL3: "기타카페", priority: 10 },
  { keyword: "달콤", categoryL1: "외식비", categoryL2: "카페/음료", categoryL3: "기타카페", priority: 7 },
  { keyword: "뭉쳐라아이스", categoryL1: "외식비", categoryL2: "카페/음료", categoryL3: "", priority: 10 },
  { keyword: "메가MG", categoryL1: "외식비", categoryL2: "카페/음료", categoryL3: "메가커피", priority: 10 },
  { keyword: "휴게소", categoryL1: "외식비", categoryL2: "한식", categoryL3: "", priority: 9 },

  // 여행
  { keyword: "AGODA", categoryL1: "여행", categoryL2: "숙박", categoryL3: "", priority: 10 },
  { keyword: "아고다", categoryL1: "여행", categoryL2: "숙박", categoryL3: "", priority: 10 },
  { keyword: "에어비앤비", categoryL1: "여행", categoryL2: "숙박", categoryL3: "에어비앤비", priority: 10 },
  { keyword: "AIRBNB", categoryL1: "여행", categoryL2: "숙박", categoryL3: "에어비앤비", priority: 10 },
  { keyword: "호텔", categoryL1: "여행", categoryL2: "숙박", categoryL3: "호텔", priority: 8 },
  { keyword: "펜션", categoryL1: "여행", categoryL2: "숙박", categoryL3: "펜션", priority: 9 },
  { keyword: "야놀자", categoryL1: "여행", categoryL2: "숙박", categoryL3: "", priority: 10 },
  { keyword: "여기어때", categoryL1: "여행", categoryL2: "숙박", categoryL3: "", priority: 10 },

  // 쇼핑 추가
  { keyword: "갤러리아", categoryL1: "쇼핑", categoryL2: "백화점", categoryL3: "", priority: 10 },
  { keyword: "비바리퍼블리", categoryL1: "쇼핑", categoryL2: "온라인", categoryL3: "", priority: 10 },
  { keyword: "TOPTEN", categoryL1: "쇼핑", categoryL2: "의류/패션", categoryL3: "의류", priority: 10 },
  { keyword: "탑텐", categoryL1: "쇼핑", categoryL2: "의류/패션", categoryL3: "의류", priority: 10 },
  { keyword: "모다이노칩", categoryL1: "쇼핑", categoryL2: "의류/패션", categoryL3: "의류", priority: 10 },
  { keyword: "엘에스네트웍스", categoryL1: "쇼핑", categoryL2: "온라인", categoryL3: "", priority: 9 },
  { keyword: "발트페이", categoryL1: "쇼핑", categoryL2: "온라인", categoryL3: "", priority: 8 },

  // 구독 추가
  { keyword: "CURSOR", categoryL1: "구독", categoryL2: "앱구독", categoryL3: "", priority: 10 },
  { keyword: "페이코", categoryL1: "쇼핑", categoryL2: "온라인", categoryL3: "", priority: 8 },
  { keyword: "네이버파이낸셜", categoryL1: "쇼핑", categoryL2: "온라인", categoryL3: "네이버", priority: 9 },
  { keyword: "오마이뉴스", categoryL1: "구독", categoryL2: "앱구독", categoryL3: "", priority: 10 },
  { keyword: "카카오 -", categoryL1: "쇼핑", categoryL2: "온라인", categoryL3: "", priority: 6 },

  // 프로모션/할인
  { keyword: "할인 프로모션", categoryL1: "금융", categoryL2: "수수료", categoryL3: "", priority: 10 },
];
