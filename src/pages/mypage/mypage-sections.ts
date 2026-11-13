// 마이페이지 영역 id (요약 카드 숫자를 누르면 이 영역으로 스크롤)
export const MYPAGE_SECTION = {
  photos: "mypage-photos",
  myMap: "mypage-my-map",
  badges: "mypage-badges",
} as const;

// 영역으로 부드럽게 스크롤하고 제목으로 포커스 이동 (OS "동작 줄이기"면 바로 이동)
export function scrollToSection(id: string) {
  const section = document.getElementById(id);
  if (!section) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  section.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  // preventScroll: 포커스 때문에 스크롤이 한 번 더 튀지 않게
  section.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
}
