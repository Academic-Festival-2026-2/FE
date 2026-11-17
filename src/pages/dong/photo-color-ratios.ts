import { COLOR_HEX } from "../photo-upload/color-analysis.ts";

// 첫 색(사용자가 고른 대표색)의 막대 최소 폭: 나머지 색 합의 이 비율
const FIRST_COLOR_MIN_SHARE = 0.1;

// bins는 전체 사진의 40개 색상 구간 비율입니다.
// 팝업의 5색 막대는 그중 선택된 색상끼리의 상대 비율로 채웁니다.
export function getPhotoColorRatios(palette: string[], bins?: number[] | null): number[] {
  const equal = palette.map(() => 1 / palette.length);
  if (!palette.length || !bins || bins.length !== COLOR_HEX.length) return equal;
  if (bins.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) return equal;
  if (Math.abs(bins.reduce((sum, value) => sum + value, 0) - 1) > 0.02) return equal;

  const used = new Set<number>();
  const weights: number[] = [];
  for (const color of palette) {
    const index = COLOR_HEX.findIndex((hex) => hex === color.toUpperCase());
    if (index === -1) return equal;
    weights.push(used.has(index) ? 0 : bins[index]);
    used.add(index);
  }

  // 첫 색은 사용자가 고른 대표색(사진 점 색)이라, 분포에 거의 없는 색(예: 짝 후보)이어도 막대에 보이게 최소 폭을 줌
  const others = weights.slice(1).reduce((total, value) => total + value, 0);
  if (others > 0 && weights[0] < others * FIRST_COLOR_MIN_SHARE)
    weights[0] = others * FIRST_COLOR_MIN_SHARE;
  const sum = weights.reduce((total, value) => total + value, 0);
  return sum > 0 ? weights.map((value) => value / sum) : equal;
}
