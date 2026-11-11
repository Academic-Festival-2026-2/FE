// MVP 임시 알고리즘입니다. 팀 최종 합의 후 이 모듈에서 교체합니다.
// 순서는 BE ColorBins.HEX와 동일하며 API 저장 인덱스이므로 변경하면 안 됩니다.
export const COLOR_HEX = ["#861318", "#E31C24", "#F17E83", "#863213", "#E3511C", "#F19D7E", "#864A13", "#E37B1C", "#F1B57E", "#866413", "#E3A91C", "#F1CF7E", "#868113", "#E3DB1C", "#F1EC7E", "#608613", "#A1E31C", "#CBF17E", "#13861D", "#1CE32D", "#7EF188", "#13867C", "#1CE3D2", "#7EF1E7", "#135186", "#1C88E3", "#7EBCF1", "#131886", "#1C24E3", "#7E83F1", "#561386", "#901CE3", "#C17EF1", "#861360", "#E31CA1", "#F17ECB", "#1C1C1C", "#555555", "#9E9E9E", "#E6E6E6"] as const;
export const ACHROMATIC_SATURATION = 0.15;
export const SAMPLE_MAX_SIZE = 256;
export type ColorAnalysis = { palette: string[]; bins: number[]; ratios: number[] };

function lab(r: number, g: number, b: number): number[] {
  const linear = [r, g, b].map((v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  const [red, green, blue] = linear;
  const transform = (v: number) => v > 216 / 24389 ? Math.cbrt(v) : (24389 / 27 * v + 16) / 116;
  const x = transform((red * 0.4124564 + green * 0.3575761 + blue * 0.1804375) / 0.95047);
  const y = transform(red * 0.2126729 + green * 0.7151522 + blue * 0.0721750);
  const z = transform((red * 0.0193339 + green * 0.1191920 + blue * 0.9503041) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
const references = COLOR_HEX.map((hex) => lab(...[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]));

export function analyzePixels(pixels: Uint8ClampedArray): ColorAnalysis {
  if (!pixels.length || pixels.length % 4) throw new Error("색상 분석에 필요한 이미지 정보가 없어요.");
  const counts = Array<number>(40).fill(0);
  let total = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3] / 255;
    if (!alpha) continue;
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const max = Math.max(r, g, b);
    const gray = max === 0 || (max - Math.min(r, g, b)) / max < ACHROMATIC_SATURATION;
    const value = lab(r, g, b);
    let best = gray ? 36 : 0, distance = Infinity;
    for (let j = gray ? 36 : 0; j < (gray ? 40 : 36); j++) {
      // 무채색은 밝기, 유채색은 Lab 유클리드 거리로 분류합니다. 동점은 작은 인덱스입니다.
      const d = value.reduce((sum, v, k) => sum + (gray && k > 0 ? 0 : (v - references[j][k]) ** 2), 0);
      if (d < distance) { best = j; distance = d; }
    }
    counts[best] += alpha;
    total += alpha;
  }
  if (!total) throw new Error("투명한 픽셀만 있는 사진은 분석할 수 없어요.");
  const bins = counts.map((count) => count / total);
  const ranked = counts.map((count, index) => ({ count, index })).filter((entry) => entry.count > 0).sort((a, b) => b.count - a.count || a.index - b.index);
  // 누적 반올림 오차는 최다색에만 보정합니다.
  bins[ranked[0].index] += 1 - bins.reduce((sum, v) => sum + v, 0);
  const top = ranked.slice(0, 5);
  const palette: string[] = top.map(({ index }) => COLOR_HEX[index]);
  const ratios = top.map(({ index }) => bins[index]);
  while (palette.length < 5) { palette.push(palette[0]); ratios.push(0); }
  return { bins, palette, ratios };
}

export async function analyzePhoto(file: File): Promise<ColorAnalysis> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, SAMPLE_MAX_SIZE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("사진 색상을 분석할 수 없는 브라우저예요.");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return analyzePixels(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
  } finally { bitmap.close(); }
}
