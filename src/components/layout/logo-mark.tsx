import { BAND_PIXEL } from "../../utils/time-band";

// 픽셀 로고 마크 (2×2 둥근 사각형: 새벽·낮 / 노을·밤 시간대 색)
// 헤더, 로그인 안내 팝업 등 로고가 들어가는 곳은 모두 이 컴포넌트를 쓴다.
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden>
      <rect x="0" y="0" width="14.4" height="14.4" rx="1.15" fill={BAND_PIXEL.DAWN} />
      <rect x="15.6" y="0" width="14.4" height="14.4" rx="1.15" fill={BAND_PIXEL.DAY} />
      <rect x="0" y="15.6" width="14.4" height="14.4" rx="1.15" fill={BAND_PIXEL.SUNSET} />
      <rect x="15.6" y="15.6" width="14.4" height="14.4" rx="1.15" fill={BAND_PIXEL.NIGHT} />
    </svg>
  );
}
