// OS·브라우저의 "동작 줄이기"가 켜져 있는지. 켜져 있으면 애니메이션 없이 바로 바꿈
export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
