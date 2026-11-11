// 프로필 이미지 키 (BE ProfileImage enum과 같은 값)
// 캐릭터를 추가하면 BE enum·DB CHECK와 src/assets/avatars 파일도 같이 추가

// 단색: 원 안에 닉네임 첫 글자
export const PROFILE_COLORS = [
  { key: "COLOR_ORANGE", label: "주황", color: "#ff8a3d", text: "#111827" },
  { key: "COLOR_SKY", label: "하늘", color: "#7fb0e0", text: "#111827" },
  // 어두운 바탕이라 흰 글자
  { key: "COLOR_NAVY", label: "남색", color: "#5e6a91", text: "#ffffff" },
  { key: "COLOR_GRAY", label: "회색", color: "#c9cbd3", text: "#111827" },
] as const;

// 캐릭터: src/assets/avatars/{키를 소문자·하이픈으로}.gif
export const PROFILE_CHARACTERS = [
  { key: "BUNNY_GRAY", label: "회색 토끼" },
  { key: "BUNNY_MOCHA", label: "모카 토끼" },
  { key: "BUNNY_STRAWBERRY", label: "딸기 토끼" },
  { key: "BUNNY_WHITE", label: "흰 토끼" },
  { key: "CAT_BLUEGRAY", label: "블루그레이 고양이" },
  { key: "CAT_CHEESE", label: "치즈 고양이" },
  { key: "CAT_CHOCO", label: "초코 고양이" },
  { key: "CAT_WHITE", label: "흰 고양이" },
  { key: "DINO_LAVENDER", label: "라벤더 공룡" },
  { key: "DINO_MINT", label: "민트 공룡" },
  { key: "DINO_PINK", label: "분홍 공룡" },
  { key: "DINO_SKY", label: "하늘 공룡" },
  { key: "DOG_CREAM", label: "크림 강아지" },
  { key: "DOG_GRAY", label: "회색 강아지" },
  { key: "DOG_SHIBA", label: "시바 강아지" },
  { key: "DOG_WHITE", label: "흰 강아지" },
] as const;

// 빌드 때 gif 16개를 묶어서 { 경로: URL } 로 가져옴
const gifs = import.meta.glob<string>("../assets/avatars/*.gif", {
  eager: true,
  import: "default",
});

// "CAT_CHEESE" → cat-cheese.gif의 URL, 캐릭터가 아니면 undefined
export function characterSrc(key: string | undefined) {
  if (!key) return undefined;
  return gifs[`../assets/avatars/${key.toLowerCase().replaceAll("_", "-")}.gif`];
}

// 단색 키의 배경·글자색, 모르는 값·값 없음은 주황
export function profileColor(key: string | undefined) {
  return PROFILE_COLORS.find((option) => option.key === key) ?? PROFILE_COLORS[0];
}
