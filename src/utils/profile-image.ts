// 프로필 이미지 키 (BE ProfileImage enum과 같은 값)
// 캐릭터를 추가하면 BE enum·DB CHECK와 src/assets/avatars 파일도 같이 추가

// 단색: 색만 채운 원
export const PROFILE_COLORS = [
  { key: "COLOR_ORANGE", label: "주황", color: "#ff8a3d" },
  { key: "COLOR_SKY", label: "하늘", color: "#7fb0e0" },
  { key: "COLOR_NAVY", label: "남색", color: "#5e6a91" },
  { key: "COLOR_GRAY", label: "회색", color: "#c9cbd3" },
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

// 빌드 때 gif 16개의 { 경로: URL } 목록을 만듦
// ?no-inline: gif가 4KB보다 작아서 기본값이면 base64로 JS에 박혀 16개(약 85KB)를
// 헤더가 있는 모든 화면에서 받게 됨 → 파일로 두고 화면에 보이는 것만 받게 함
const gifs = import.meta.glob<string>("../assets/avatars/*.gif", {
  eager: true,
  query: "?no-inline",
  import: "default",
});

// "CAT_CHEESE" → cat-cheese.gif의 URL, 캐릭터가 아니면 undefined
export function characterSrc(key: string | undefined) {
  if (!key) return undefined;
  return gifs[`../assets/avatars/${key.toLowerCase().replaceAll("_", "-")}.gif`];
}

// 단색 키의 색, 모르는 값·값 없음은 주황
export function profileColor(key: string | undefined) {
  return (PROFILE_COLORS.find((option) => option.key === key) ?? PROFILE_COLORS[0]).color;
}

// 팝업 제목·안내용 한글 이름
export function profileLabel(key: string | undefined) {
  return [...PROFILE_COLORS, ...PROFILE_CHARACTERS].find((option) => option.key === key)?.label;
}
