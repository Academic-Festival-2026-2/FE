// MVP 임시 알고리즘입니다. 팀 최종 합의 후 이 모듈에서 교체합니다.
// 순서는 BE ColorBins.HEX와 동일하며 API 저장 인덱스이므로 변경하면 안 됩니다.
export const COLOR_HEX = ["#D4E6F5", "#9CC8EC", "#5A8FD0", "#A9B6CC", "#B2A6D6", "#F2AEB8",
  "#F39A52", "#F7BD6E", "#5B5592", "#1E2850", "#3C8FB5", "#4FA7A3", "#2A5E78", "#5C9A55", "#36603D",
  "#A9CF72", "#C2AE72", "#EDD23A", "#E2783A", "#C9432F", "#F6C6D3", "#E27BA6", "#9B7BC8", "#EAE2D2",
  "#D9C7A6", "#A9573F", "#8A6245", "#A8DCCF", "#F8DD98", "#DA5A95", "#4F63D6", "#43BFC4", "#E8384F",
  "#7A3FA0", "#23262D", "#3E434E", "#6C7078", "#A2A5AA", "#C9CDD3", "#F0F2F4"] as const;
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
    const value = lab(pixels[i], pixels[i + 1], pixels[i + 2]);
    let best = 0, distance = Infinity;
    for (let j = 0; j < COLOR_HEX.length; j++) {
      // 40색 중 Lab 거리로 가장 가까운 색을 고릅니다. 동점은 작은 인덱스입니다.
      const d = value.reduce((sum, v, k) => sum + (v - references[j][k]) ** 2, 0);
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
