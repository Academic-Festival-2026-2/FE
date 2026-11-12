import { COLOR_HEX } from "../photo-upload/color-analysis.ts";

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

  const sum = weights.reduce((total, value) => total + value, 0);
  return sum > 0 ? weights.map((value) => value / sum) : equal;
}
