// 카카오 지도 도우미 (동 상세 지도·업로드 위치 선택 창)

// 동 상세·업로드 위치 선택 지도에서 고른 동 바깥을 덮는 큰 사각형 [위도, 경도].
// 경기도 전체를 덮는 범위 (map-geometry.ts의 원점·끝과 같음)
const MASK_FRAME_POINTS: [number, number][] = [
  [36.5, 125.8],
  [36.5, 128.2],
  [38.6, 128.2],
  [38.6, 125.8],
];

export const KAKAO_UNAVAILABLE = typeof kakao === "undefined";
export const KAKAO_ERROR = "지도를 불러오지 못했어요.";

export function toKakaoPath(rings: number[][][]) {
  return rings.map((ring) => ring.map(([lng, lat]) => new kakao.maps.LatLng(lat, lng)));
}

// 구멍(동) 방향을 바깥 사각형과 반대로 맞추기 위한 부호 있는 넓이
function signedArea(path: kakao.maps.LatLng[]) {
  let area = 0;
  for (let i = 0; i < path.length; i++) {
    const a = path[i];
    const b = path[(i + 1) % path.length];
    area += a.getLng() * b.getLat() - b.getLng() * a.getLat();
  }
  return area;
}

// 고른 동 바깥을 덮는 카카오 다각형 경로: 큰 사각형(MASK_FRAME_POINTS)에 동 외곽선을 구멍으로 뚫음
// (동 상세 지도·업로드 위치 선택 창). outlines: 동 조각마다 바깥 링
export function maskPath(outlines: kakao.maps.LatLng[][]) {
  const frame = MASK_FRAME_POINTS.map(([lat, lng]) => new kakao.maps.LatLng(lat, lng));
  const frameSign = Math.sign(signedArea(frame));
  const holes = outlines.map((outline) =>
    Math.sign(signedArea(outline)) === frameSign ? [...outline].reverse() : outline,
  );
  return [frame, ...holes];
}
