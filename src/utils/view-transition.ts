// 지도 → 동 상세 화면 전환 (View Transitions API)
// 1) 지도 화면(svg-map): 지도가 화면 전체로 커지며 누른 동을 화면 한가운데로 끌어와 확대.
//    끝나는 순간 동 크기·위치가 동 상세에서 그려질 동과 같음 (kakao-fit.ts)
// 2) 여기: 동 상세로 넘어갈 때 아주 짧게(index.css html.vt-dong, 100ms)만 겹쳐서
//    카카오맵 타일이 뜨기 전 빈 화면이 번쩍이지 않게 함

const DONG_CLASS = "vt-dong";
// index.css 애니메이션 길이(100ms)보다 넉넉하게 두고 클래스를 뗀다
const CLEANUP_MS = 500;

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// 전환을 쓸 수 있으면 true (부수 효과 없음). 미지원 브라우저이거나 OS "동작 줄이기"면 false
export function canUseDongTransition() {
  return typeof document !== "undefined" && "startViewTransition" in document && !reducedMotion();
}

// 전환을 써도 되면 html에 클래스를 붙이고 true. 아니면 false → 바로 이동
export function prepareDongTransition() {
  if (!canUseDongTransition()) return false;

  const root = document.documentElement;
  root.classList.add(DONG_CLASS);
  window.setTimeout(() => root.classList.remove(DONG_CLASS), CLEANUP_MS);
  return true;
}

// 동 상세 → 지도로 돌아올 때: 동 상세가 떠나면서 동 코드를 남기고, 곧바로 열린 지도 화면이 읽어서
// 그 동에서 줄어드는 애니메이션으로 시작함. 링크·뒤로 가기 모두 같은 방식.
// 오래된 값으로 엉뚱하게 시작하지 않도록 잠깐(1.5초)만 유효
const RETURN_VALID_MS = 1500;
let returnFrom: { dongCode: string; at: number } | null = null;

export function markReturnFrom(dongCode: string) {
  returnFrom = { dongCode, at: Date.now() };
}

// 지우지 않고 읽음 (개발 모드에서 화면이 두 번 그려져도 같은 값을 받도록). 시간이 지나면 저절로 무효
export function peekReturnFrom(): string | null {
  if (!returnFrom || reducedMotion()) return null;
  if (Date.now() - returnFrom.at > RETURN_VALID_MS) {
    returnFrom = null;
    return null;
  }
  return returnFrom.dongCode;
}
