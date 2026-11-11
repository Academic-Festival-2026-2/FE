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

// TODO: 운영 배포일과 팀 공용 메일로 교체. 자리표시가 남은 채로 main에 머지하지 말 것
export const TERMS_EFFECTIVE_DATE = "2026년 11월 16일";
export const CONTACT_EMAIL = "dean8638@naver.com";
