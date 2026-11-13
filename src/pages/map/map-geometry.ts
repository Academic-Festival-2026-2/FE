import type { BoundaryFeature, Boundaries, Region } from "../../api/map";

// 경기도 전체를 한 좌표계로 그린다. 지역마다 따로 맞추지 않아서 이웃 지역 경계가 그대로 이어진다.
// 원점(왼쪽 위)은 경기도를 넉넉히 덮는 [경도 125.8, 위도 38.6], 오른쪽 아래는 [128.2, 36.5]
const ORIGIN_LNG = 125.8;
const ORIGIN_LAT = 38.6;
const END_LNG = 128.2;
const END_LAT = 36.5;
// 위도 1도 = 6000 단위 (부천 한 시가 약 550 단위). 경도는 위도 37.5° 기준으로 줄여 모양이 눌리지 않게
const UNITS_PER_DEG = 6000;
const X_SCALE = Math.cos((37.5 * Math.PI) / 180);

// 가장 많이 축소했을 때 view 크기 = 첫 화면의 몇 배까지 (부천 기준 시 3~4개 정도가 보임)
export const MAX_VIEW_SCALE = 3;

export const WORLD_WIDTH = (END_LNG - ORIGIN_LNG) * X_SCALE * UNITS_PER_DEG;
export const WORLD_HEIGHT = (ORIGIN_LAT - END_LAT) * UNITS_PER_DEG;

// SVG viewBox (정사각형)
export type View = { x: number; y: number; size: number };

export type DongShape = {
  dongCode: string;
  name: string;
  path: string;
  label: [number, number];
  bounds: [number, number, number, number];
  // 동의 위도·경도 범위(도). 동 상세(카카오맵)에서 동이 그려질 크기를 계산할 때 씀
  latSpan: number;
  lngSpan: number;
  area: number;
};

export function project([lng, lat]: number[]): [number, number] {
  return [(lng - ORIGIN_LNG) * X_SCALE * UNITS_PER_DEG, (ORIGIN_LAT - lat) * UNITS_PER_DEG];
}

export function unproject([x, y]: number[]): [number, number] {
  return [x / (X_SCALE * UNITS_PER_DEG) + ORIGIN_LNG, ORIGIN_LAT - y / UNITS_PER_DEG];
}

// 경위도 사각형(bbox = [최소 경도, 최소 위도, 최대 경도, 최대 위도])이 꽉 차게 보이는 정사각형 view.
// padding은 한 변의 비율 (0.04 = 지금 부천 첫 화면과 같은 여백)
export function fitView([minLng, minLat, maxLng, maxLat]: number[], padding = 0.04): View {
  const [x1, y1] = project([minLng, maxLat]);
  const [x2, y2] = project([maxLng, minLat]);
  const size = Math.max(x2 - x1, y2 - y1) / (1 - padding * 2);
  return { x: (x1 + x2) / 2 - size / 2, y: (y1 + y2) / 2 - size / 2, size };
}

// 화면(view)과 겹치는 지역 코드. 지도 카드는 가로가 더 넓어서 정사각형 view 바깥도 보이고,
// 드래그하면 바로 보이도록 view 한 변의 margin배만큼 바깥까지 미리 고른다
export function regionsInView(regions: Region[], view: View, margin = 0.25): string[] {
  const pad = view.size * margin;
  const left = view.x - pad;
  const top = view.y - pad;
  const right = view.x + view.size + pad;
  const bottom = view.y + view.size + pad;
  return regions
  .filter(({ bbox: [minLng, minLat, maxLng, maxLat] }) => {
    const [x1, y1] = project([minLng, maxLat]);
    const [x2, y2] = project([maxLng, minLat]);
    return x1 < right && x2 > left && y1 < bottom && y2 > top;
  })
  .map((region) => region.regionCode);
}

function extent(values: number[]): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return [min, max];
}

function ringArea(ring: [number, number][]) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

export function toShapes(boundaries: Boundaries): DongShape[] {
  return boundaries.features.map((feature) => {
    const lonLats = feature.geometry.coordinates.flat(2);
    const [dongMinLng, dongMaxLng] = extent(lonLats.map(([lng]) => lng));
    const [dongMinLat, dongMaxLat] = extent(lonLats.map(([, lat]) => lat));
    const rings = feature.geometry.coordinates.flat().map((ring) => ring.map(project));
    const [minX, maxX] = extent(rings.flat().map(([x]) => x));
    const [minY, maxY] = extent(rings.flat().map(([, y]) => y));
    const path = rings
    .map((ring) => `M${ring.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L")}Z`)
    .join("");

    return {
      dongCode: feature.properties.dongCode,
      name: feature.properties.name,
      path,
      label: project(labelPoint(feature)),
      bounds: [minX, minY, maxX, maxY],
      latSpan: dongMaxLat - dongMinLat,
      lngSpan: dongMaxLng - dongMinLng,
      area: rings.reduce((sum, ring) => sum + ringArea(ring), 0),
    };
  });
}

// 동 이름을 띄울 자리: 가장 큰 조각 외곽 링의 넓이 가중 무게중심 [경도, 위도]
export function labelPoint(feature: BoundaryFeature): [number, number] {
  let best = feature.geometry.coordinates[0][0];
  let bestArea = 0;
  let bestCx = 0;
  let bestCy = 0;

  for (const polygon of feature.geometry.coordinates) {
    const ring = polygon[0];
    let area = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[i + 1];
      const cross = x1 * y2 - x2 * y1;
      area += cross;
      cx += (x1 + x2) * cross;
      cy += (y1 + y2) * cross;
    }
    if (Math.abs(area) > Math.abs(bestArea)) {
      best = ring;
      bestArea = area;
      bestCx = cx;
      bestCy = cy;
    }
  }

  if (bestArea === 0) return [best[0][0], best[0][1]];
  return [bestCx / (3 * bestArea), bestCy / (3 * bestArea)];
}

export function bboxOf(boundaries: Boundaries): [number, number, number, number] {
  const points = boundaries.features.flatMap((feature) => feature.geometry.coordinates.flat(2));
  const [minLng, maxLng] = extent(points.map(([lng]) => lng));
  const [minLat, maxLat] = extent(points.map(([, lat]) => lat));
  return [minLng, minLat, maxLng, maxLat];
}

function inRing(ring: number[][], x: number, y: number) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// 점([경도, 위도])이 들어 있는 지역 코드. 받아 둔 경계에서만 찾고, 없으면 null (바다·서울 등 경기도 밖)
export function regionAt(regions: Boundaries[], [lng, lat]: number[]): string | null {
  for (const region of regions) {
    for (const feature of region.features) {
      for (const [outer, ...holes] of feature.geometry.coordinates) {
        if (inRing(outer, lng, lat) && !holes.some((hole) => inRing(hole, lng, lat))) {
          return region.regionCode;
        }
      }
    }
  }
  return null;
}

// 지역 이름을 띄울 자리 (화면 좌표): 동 이름 자리들을 동 넓이로 가중 평균
export function regionLabel(shapes: DongShape[]): [number, number] {
  let area = 0;
  let x = 0;
  let y = 0;
  for (const shape of shapes) {
    area += shape.area;
    x += shape.label[0] * shape.area;
    y += shape.label[1] * shape.area;
  }
  return area ? [x / area, y / area] : [0, 0];
}