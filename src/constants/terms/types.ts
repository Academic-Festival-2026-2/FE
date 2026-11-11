// 약관 본문 구조. body 한 줄이 문단 하나(번호·글머리표는 문자열에 포함)
export type TermSection = {
  heading: string;
  body: string[];
};

export type TermContent = {
  title: string;
  sections: TermSection[];
  // 부칙에 들어갈 시행일
  effectiveDate: string;
};

// 시행일은 약관이 운영에 나가는 날. 약관을 바꾸면 새 시행일로 교체 (이용약관 제3조: 시행 7일 전 공지)
export const TERMS_EFFECTIVE_DATE = "2026년 11월 16일";
export const CONTACT_EMAIL = "dean8638@naver.com";
