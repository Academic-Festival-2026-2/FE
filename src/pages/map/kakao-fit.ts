// 동 상세(카카오맵)가 동을 화면에 어떻게 맞출지 미리 계산
// 지도 화면에서 동을 누르면 이 결과에 맞춰 확대해 두어서, 동 상세로 넘어갈 때 동 모양이 그대로 겹치게 함.
//
// 카카오맵 실측(부천 기준): 1단계에서 위도 1도 = 443,900px, 단계가 하나 오를 때마다 절반.
// 경도 1도는 위도 1도의 0.7968배. setBounds는 여백을 뺀 화면에 동이 다 들어가는 가장 가까운 단계를 고름
// (37개 동 모두 실제 setBounds 결과와 단계가 같고, 동 가운데가 화면 가운데에서 1px 이내).

const PX_PER_DEG_LAT_LEVEL1 = 443900;
const LNG_TO_LAT_RATIO = 0.7968;

// 동 상세 setBounds 여백과 최대 단계 (dong-page.tsx도 이 값을 씀)
export const DONG_FIT_PADDING = 40;
export const DONG_MAX_LEVEL = 8;

// latSpan·lngSpan: 동의 위도·경도 범위(도), width·height: 동 상세 지도 크기(px)
// 반환: 동 상세에서 동의 세로 길이(px)
export function predictDongHeightPx(latSpan: number, lngSpan: number, width: number, height: number) {
  const availableWidth = width - DONG_FIT_PADDING * 2;
  const availableHeight = height - DONG_FIT_PADDING * 2;
  let pxPerDegLat = PX_PER_DEG_LAT_LEVEL1;
  for (let level = 1; level < DONG_MAX_LEVEL; level++) {
    const fits =
      latSpan * pxPerDegLat <= availableHeight &&
      lngSpan * pxPerDegLat * LNG_TO_LAT_RATIO <= availableWidth;
    if (fits) break;
    pxPerDegLat /= 2;
  }
  return latSpan * pxPerDegLat;
}
