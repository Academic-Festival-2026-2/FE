// 관리자 계정이 데모용으로 올린 사진의 출처 (동 상세 왼쪽 아래 ⓘ에서 보여 줌)
// 사진을 더 올리면 출처도 같이 추가. CC 라이선스는 아래 링크 목록에도 추가

// 데모 사진을 올린 관리자 계정 닉네임
export const ADMIN_NICKNAME = "PIXEL";

// CC 라이선스 이름 → 라이선스 안내 페이지 (한국어)
export const CC_LICENSE_URL = {
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/deed.ko",
  "CC BY-SA 1.0": "https://creativecommons.org/licenses/by-sa/1.0/deed.ko",
  "CC BY-SA 3.0": "https://creativecommons.org/licenses/by-sa/3.0/deed.ko",
  "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/deed.ko",
} as const;

type CcLicense = keyof typeof CC_LICENSE_URL;

type PhotoCredit = {
  // 사진을 가져온 곳 (공공누리 사진은 유형까지)
  source: string;
  // 같은 곳의 사진을 올린 사람과 라이선스 (위키미디어 공용)
  authors?: { name: string; license: CcLicense }[];
};

export const PHOTO_CREDITS: PhotoCredit[] = [
  {
    source: "위키미디어 공용",
    authors: [
      { name: "Narubaru7", license: "CC BY 4.0" },
      { name: "메이", license: "CC BY-SA 1.0" },
      { name: "Sukso96100", license: "CC BY-SA 4.0" },
      { name: "ChongDae", license: "CC BY-SA 3.0" },
      { name: "Motoko C. K.", license: "CC BY 4.0" },
    ],
  },
  { source: "경기도, 공공누리 제1유형" },
];
