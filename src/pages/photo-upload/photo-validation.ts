import type { BoundaryFeature, TimeBand } from "../../api/map";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export async function validateImage(file: File): Promise<void> {
  if (file.size === 0) throw new Error("빈 파일은 올릴 수 없어요.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("사진은 한 장당 10MB 이하로 선택해 주세요.");
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b);
  if (!jpeg && !png) throw new Error("JPEG 또는 PNG 사진만 올릴 수 있어요. HEIC는 변환 후 선택해 주세요.");
}

// 브라우저 시간대로 변환하지 않고 백엔드와 같은 촬영 시각 문자열을 사용합니다.
export function parseLocalTime(value: string): string | undefined {
  const match = /^(\d{4})[-:](\d{2})[-:](\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return;
  const [, y, m, d, h, min, sec = "00"] = match;
  const date = new Date(Date.UTC(+y, +m - 1, +d, +h, +min, +sec));
  if (date.getUTCFullYear() !== +y || date.getUTCMonth() !== +m - 1 || date.getUTCDate() !== +d || +h > 23 || +min > 59 || +sec > 59) return;
  return `${y}-${m}-${d}T${h}:${min}:${sec}`;
}

export function timeBand(value: string): TimeBand | undefined {
  const valid = parseLocalTime(value);
  if (!valid) return;
  const hour = Number(valid.slice(11, 13));
  return hour >= 5 && hour < 8 ? "DAWN" : hour >= 8 && hour < 16 ? "DAY" : hour >= 16 && hour < 19 ? "SUNSET" : "NIGHT";
}

function inRing(lng: number, lat: number, ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// 화면의 위치 안내에만 사용합니다. 행정동·EXIF 검증의 최종 판정은 서버가 합니다.
export function findDong(features: BoundaryFeature[], latitude: number, longitude: number) {
  return features.find((feature) => feature.geometry.coordinates.some(([outer, ...holes]) =>
    inRing(longitude, latitude, outer) && !holes.some((ring) => inRing(longitude, latitude, ring))));
}

export function validateColors(palette: string[], bins: number[]) {
  return palette.length === 5 && palette.every((color) => /^#[0-9A-F]{6}$/.test(color)) &&
    bins.length === 40 && bins.every((value) => Number.isFinite(value) && value >= 0 && value <= 1) &&
    Math.abs(bins.reduce((sum, value) => sum + value, 0) - 1) <= 0.02;
}
