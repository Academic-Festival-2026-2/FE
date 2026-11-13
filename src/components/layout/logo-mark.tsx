// 픽셀 로고 마크 (2×2 둥근 사각형: 라벤더·하늘 / 주황·남색)
// 헤더, 로그인 안내 팝업 등 로고가 들어가는 곳은 모두 이 컴포넌트를 쓴다.
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden>
      <rect x="0" y="0" width="14.4" height="14.4" rx="1.15" fill="#c4b7e9" />
      <rect x="15.6" y="0" width="14.4" height="14.4" rx="1.15" fill="#8ab4e9" />
      <rect x="0" y="15.6" width="14.4" height="14.4" rx="1.15" fill="#ee8156" />
      <rect x="15.6" y="15.6" width="14.4" height="14.4" rx="1.15" fill="#2d2670" />
    </svg>
  );
}
