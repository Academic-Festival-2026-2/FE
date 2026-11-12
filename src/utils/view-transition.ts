// 지도 → 동 상세 화면 전환 (View Transitions API)
// 1) 지도 화면(svg-map): 지도가 화면 전체로 커지며 누른 동을 화면 한가운데로 끌어와 확대.
//    끝나는 순간 동 크기·위치가 동 상세에서 그려질 동과 같음 (kakao-fit.ts)
// 2) 여기: 동 상세로 넘어갈 때 아주 짧게(index.css html.vt-dong, 100ms)만 겹쳐서
//    카카오맵 타일이 뜨기 전 빈 화면이 번쩍이지 않게 함

const DONG_CLASS = "vt-dong";
// index.css 애니메이션 길이(100ms)보다 넉넉하게 두고 클래스를 뗀다
const CLEANUP_MS = 500;

// 전환을 써도 되면 true. 미지원 브라우저이거나 OS "동작 줄이기"가 켜져 있으면 false → 바로 이동
export function prepareDongTransition() {
  if (typeof document === "undefined" || !("startViewTransition" in document)) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;

  const root = document.documentElement;
  root.classList.add(DONG_CLASS);
  window.setTimeout(() => root.classList.remove(DONG_CLASS), CLEANUP_MS);
  return true;
}
