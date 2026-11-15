// 순서는 BE ColorBins.HEX와 동일하며 API 저장 인덱스이므로 변경하면 안 됩니다.
export const COLOR_HEX = ["#D4E6F5", "#9CC8EC", "#5A8FD0", "#A9B6CC", "#B2A6D6", "#F2AEB8",
  "#F39A52", "#F7BD6E", "#5B5592", "#1E2850", "#3C8FB5", "#4FA7A3", "#2A5E78", "#5C9A55", "#36603D",
  "#A9CF72", "#C2AE72", "#EDD23A", "#E2783A", "#C9432F", "#F6C6D3", "#E27BA6", "#9B7BC8", "#EAE2D2",
  "#D9C7A6", "#A9573F", "#8A6245", "#A8DCCF", "#F8DD98", "#DA5A95", "#4F63D6", "#43BFC4", "#E8384F",
  "#7A3FA0", "#23262D", "#3E434E", "#6C7078", "#A2A5AA", "#C9CDD3", "#F0F2F4"] as const;
// 팔레트 표(지도 색 40 · 대상별 한 색)의 이름. COLOR_HEX와 같은 순서입니다.
export const COLOR_NAMES = ["연한 하늘", "하늘", "짙은 하늘", "새벽 회청 하늘", "보랏빛 새벽", "분홍 노을",
  "주황 노을", "금빛 노을", "저녁 남보라", "밤하늘", "바다", "강 · 호수", "짙은 물", "나무 초록", "짙은 숲",
  "잔디 연두", "갈대", "은행 노랑", "단풍 주황", "단풍 빨강", "벚꽃 분홍", "진달래 분홍", "보라 꽃", "흰 건물",
  "베이지 건물", "벽돌", "나무 · 흙", "민트 · 유리", "창문 불빛", "분홍 네온", "파란 조명", "청록 조명", "붉은 간판",
  "보라 야경", "먹색", "그림자", "아스팔트", "회색 건물", "안개", "구름"] as const;
export const SAMPLE_MAX_SIZE = 256;
// palette: 대표색 5개(첫 색 = 대표색), ratios: palette 각 색의 bins 비율, candidates: 사용자가 고를 대표색 후보(첫 후보 = 자동 대표색)
export type ColorAnalysis = { palette: string[]; bins: number[]; ratios: number[]; candidates: string[] };

// BE ColorBins와 같은 구분: 0~33 유채색, 34~39 무채색(먹색 → 구름)
const CHROMATIC_COUNT = 34;
// BE dominantColor: 유채색 합계가 이 비율 이상이면 유채색 중에서 대표색을 고름
const CHROMATIC_THRESHOLD = 0.15;
// 건물·땅 계열(흰 건물·베이지 건물·벽돌·나무 · 흙·민트 · 유리, 먹색~회색 건물). "가장 선명한 색" 후보에서 뺍니다.
const BACKGROUND = new Set([23, 24, 25, 26, 27, 34, 35, 36, 37]);
// 대표색이 유채색이어도 무채색(bins 합계)이 이 비율 이상이면 가장 넓은 무채색을 후보에 넣습니다(눈 덮인 풍경, 흐린 날 등).
const MOSTLY_ACHROMATIC = 0.5;
// 사진 평균 밝기(L)가 이보다 낮으면 어두운 사진(밤)으로 보고 불빛 기준으로 분류합니다.
const DARK_PHOTO_L = 25;
// 채도가 이보다 낮으면 무채색. 사진 색은 팔레트보다 훨씬 흐려서(단풍 채도 20~37, 단풍 빨강 66) 기준을 낮게 잡습니다.
const GRAY_CHROMA = 10;
// 노랑과 연두를 나누는 색상각(도)
const YELLOW_GREEN_HUE = 103;
// 색은 같은데 대상이 다를 수 있는 짝 (대표색 → 후보로 같이 보여 줄 색).
// 픽셀 색만으로는 단풍과 원목, 노을과 창문 불빛, 하늘과 조명 받은 벽을 구분할 수 없어서 사용자가 바로 고칠 수 있게 합니다.
const CONFUSABLE_PAIR: Partial<Record<number, number>> = {
  19: 26, // 단풍 빨강 → 나무 · 흙
  18: 26, // 단풍 주황 → 나무 · 흙
  25: 19, // 벽돌 → 단풍 빨강
  26: 18, // 나무 · 흙 → 단풍 주황
  7: 28, // 금빛 노을 → 창문 불빛
  28: 7, // 창문 불빛 → 금빛 노을
  6: 18, // 주황 노을 → 단풍 주황
  17: 28, // 은행 노랑 → 창문 불빛
  0: 38, // 연한 하늘 → 안개
  1: 3, // 하늘 → 새벽 회청 하늘 (흐린 새벽 하늘은 색으로 구분이 안 됨)
  2: 10, // 짙은 하늘 → 바다 (사진 속 하늘과 바다는 색으로 구분이 안 됨)
  3: 37, // 새벽 회청 하늘 → 회색 건물
  4: 37, // 보랏빛 새벽 → 회색 건물
};

function lab(r: number, g: number, b: number): number[] {
  const linear = [r, g, b].map((v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  const [red, green, blue] = linear;
  const transform = (v: number) => v > 216 / 24389 ? Math.cbrt(v) : (24389 / 27 * v + 16) / 116;
  const x = transform((red * 0.4124564 + green * 0.3575761 + blue * 0.1804375) / 0.95047);
  const y = transform(red * 0.2126729 + green * 0.7151522 + blue * 0.0721750);
  const z = transform((red * 0.0193339 + green * 0.1191920 + blue * 0.9503041) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

// 밝기로 무채색 6개 중 하나: 먹색 → 그림자 → 아스팔트 → 회색 건물 → 안개 → 구름
function grayByLightness(L: number): number {
  return L < 22 ? 34 : L < 38 ? 35 : L < 57 ? 36 : L < 75 ? 37 : L < 88 ? 38 : 39;
}

// 색상 규칙표: 가장 가까운 색 대신 색상(h) 구간마다 어느 대상 색을 쓸지 정하고, 밝기(L)·채도(C)로 나눕니다.
// 팔레트가 "대상별 한 색"이라 거리만으로는 단풍이 벽돌·나무 · 흙으로, 밤 조명이 나무 · 흙으로 몰리기 때문입니다.
export function classifyColor(L: number, a: number, b: number, darkPhoto: boolean): number {
  const C = Math.hypot(a, b);
  const h = (Math.atan2(b, a) * 180 / Math.PI + 360) % 360;
  if (L < 10) return 34;
  if (C < GRAY_CHROMA) return grayByLightness(L);
  // 분홍·빨강 경계
  if (h >= 345 || h < 15) {
    if (L >= 70) return C < 22 ? 20 : 5;
    if (darkPhoto && L >= 40) return 29;
    return L >= 45 ? 21 : 19;
  }
  // 빨강: 단풍 빨강, 채도 낮으면 벽돌, 밤이면 붉은 간판
  if (h < 48) {
    if (C < 15) return L < 30 ? grayByLightness(L) : 25;
    if (darkPhoto && L >= 45) return 32;
    if (L >= 75) return 5;
    return 19;
  }
  // 주황: 단풍 주황, 아주 밝으면 주황 노을, 채도 낮으면 나무 · 흙(밝으면 베이지 건물), 밤이면 창문 불빛
  if (h < 68) {
    if (C < 15) return L >= 55 ? 24 : L < 30 ? grayByLightness(L) : 26;
    if (darkPhoto) return L >= 60 ? 28 : L >= 35 ? 18 : grayByLightness(L);
    return L >= 68 ? 6 : 18;
  }
  // 금빛: 밝으면 금빛 노을, 중간은 은행 노랑, 어두우면 나무 · 흙
  if (h < 85) {
    if (C < 15) return L >= 55 ? 24 : L < 30 ? grayByLightness(L) : 26;
    if (darkPhoto) return L >= 50 ? 28 : L >= 30 ? 7 : grayByLightness(L);
    if (L >= 70) return 7;
    return L >= 45 ? 17 : 26;
  }
  // 노랑: 은행 노랑, 밝고 연하면 창문 불빛, 흐리면 갈대
  if (h < YELLOW_GREEN_HUE) {
    if (C < 15) return L >= 80 ? 23 : L >= 65 ? 24 : grayByLightness(L);
    if (darkPhoto && L >= 50) return 28;
    if (darkPhoto && L < 30) return grayByLightness(L);
    if (L >= 80 && C < 35) return 28;
    return C >= 25 ? 17 : 16;
  }
  // 연두·초록: 밝기로 잔디 연두 → 나무 초록 → 짙은 숲
  if (h < 135) {
    if (C < 15 && L >= 55) return 16;
    return L >= 60 ? 15 : L >= 40 ? 13 : 14;
  }
  if (h < 170) return L >= 65 ? 15 : L >= 45 ? 13 : 14;
  // 청록: 민트 · 유리 → 강 · 호수 → 짙은 물, 밤이면 청록 조명
  if (h < 215) {
    if (darkPhoto && L >= 50) return 31;
    if (C < 15) return L >= 70 ? 27 : 11;
    return L >= 75 ? 27 : L >= 45 ? 11 : 12;
  }
  // 파랑: 밝기로 연한 하늘 → 하늘 → 짙은 하늘 → 밤하늘, 밤의 선명한 파랑은 파란 조명
  // 새벽 회청 하늘·바다는 사진 속 하늘과 색으로 구분이 안 돼서(자동 분류하면 하늘 표가 갈림)
  // 자동 분류하지 않고 하늘·짙은 하늘의 짝 후보로 둠 (CONFUSABLE_PAIR)
  if (h < 285) {
    if (C < 12) return grayByLightness(L);
    if (darkPhoto && L >= 40 && C >= 40) return 30;
    if (L >= 80) return 0;
    if (L >= 62) return 1;
    if (L >= 38) return 2;
    return 9;
  }
  // 보라
  if (h < 320) {
    if (darkPhoto && C >= 40) return 33;
    return L >= 62 ? 4 : L >= 45 ? 22 : L >= 28 ? 8 : 9;
  }
  // 자홍
  if (L >= 70) return 20;
  return darkPhoto || C >= 40 ? 29 : 21;
}

// BE ColorBins.dominantColor와 같은 규칙: 유채색 합계 15% 이상이면 유채색 중, 아니면 무채색 중 가장 많은 색 (동점은 작은 인덱스)
export function dominantIndex(bins: number[]): number {
  const total = bins.reduce((sum, v) => sum + v, 0);
  const chromatic = bins.slice(0, CHROMATIC_COUNT).reduce((sum, v) => sum + v, 0);
  const start = total > 0 && chromatic / total >= CHROMATIC_THRESHOLD ? 0 : CHROMATIC_COUNT;
  const end = start === 0 ? CHROMATIC_COUNT : bins.length;
  let best = start;
  for (let i = start + 1; i < end; i++) if (bins[i] > bins[best]) best = i;
  return best;
}

// 대표색 5개: 첫 색은 대표색, 나머지는 비율 순(동점은 작은 인덱스). 5개가 안 되면 대표색으로 채웁니다.
function toAnalysis(bins: number[], candidates: string[]): ColorAnalysis {
  const first = dominantIndex(bins);
  const rest = bins.map((value, index) => ({ value, index })).filter((e) => e.value > 0 && e.index !== first)
    .sort((x, y) => y.value - x.value || x.index - y.index).slice(0, 4).map((e) => e.index);
  const top = [first, ...rest];
  const palette: string[] = top.map((index) => COLOR_HEX[index]);
  const ratios = top.map((index) => bins[index]);
  while (palette.length < 5) { palette.push(palette[0]); ratios.push(0); }
  return { palette, bins, ratios, candidates };
}

// width·height를 모르면 한 줄짜리 이미지로 봅니다(위치·주변 픽셀 가중치가 약해짐).
export function analyzePixels(pixels: Uint8ClampedArray, width = pixels.length / 4, height = 1): ColorAnalysis {
  if (!pixels.length || pixels.length % 4) throw new Error("색상 분석에 필요한 이미지 정보가 없어요.");
  const n = pixels.length / 4;
  if (width * height !== n) { width = n; height = 1; }
  const L = new Float32Array(n), A = new Float32Array(n), B = new Float32Array(n), chroma = new Float32Array(n);
  const alpha = new Float32Array(n);
  let sumL = 0, sumA = 0, sumB = 0, total = 0;
  for (let i = 0; i < n; i++) {
    alpha[i] = pixels[i * 4 + 3] / 255;
    const [l, a, b] = lab(pixels[i * 4], pixels[i * 4 + 1], pixels[i * 4 + 2]);
    L[i] = l; A[i] = a; B[i] = b; chroma[i] = Math.hypot(a, b);
    if (!alpha[i]) continue;
    sumL += l * alpha[i]; sumA += a * alpha[i]; sumB += b * alpha[i]; total += alpha[i];
  }
  if (!total) throw new Error("투명한 픽셀만 있는 사진은 분석할 수 없어요.");
  const meanL = sumL / total, meanA = sumA / total, meanB = sumB / total;
  const darkPhoto = meanL < DARK_PHOTO_L;
  const colorOf = new Int8Array(n);
  for (let i = 0; i < n; i++) colorOf[i] = classifyColor(L[i], A[i], B[i], darkPhoto);

  // 평평함(주변 5×5 밝기 표준편차)과 눈에 띄는 정도(주변 3×3 평균색이 사진 평균색에서 먼 정도)
  const texture = new Float32Array(n), salience = new Float32Array(n);
  let salienceMax = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let s = 0, s2 = 0, c = 0, nl = 0, na = 0, nb = 0, nc = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const yy = y + dy, xx = x + dx;
      if (yy < 0 || xx < 0 || yy >= height || xx >= width) continue;
      const j = yy * width + xx;
      s += L[j]; s2 += L[j] * L[j]; c++;
      if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) { nl += L[j]; na += A[j]; nb += B[j]; nc++; }
    }
    const i = y * width + x;
    texture[i] = Math.sqrt(Math.max(0, s2 / c - (s / c) ** 2));
    salience[i] = Math.hypot(nl / nc - meanL, na / nc - meanA, nb / nc - meanB);
    if (salience[i] > salienceMax) salienceMax = salience[i];
  }
  // 사진 테두리를 많이 차지하는 색은 배경일 가능성이 높아서 덜 셉니다(테두리 40% 이상이면 0.3배).
  const edge = Math.max(2, Math.round(Math.min(width, height) * 0.06));
  const border = Array<number>(40).fill(0);
  let borderTotal = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (x >= edge && y >= edge && x < width - edge && y < height - edge) continue;
    const i = y * width + x;
    border[colorOf[i]] += alpha[i]; borderTotal += alpha[i];
  }
  const borderWeight = border.map((count) => 1 - 0.7 * Math.min(1, borderTotal ? count / borderTotal / 0.4 : 0));

  const counts = Array<number>(40).fill(0), chromaSum = Array<number>(40).fill(0), pixelCount = Array<number>(40).fill(0);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x;
    if (!alpha[i]) continue;
    const dx = width > 1 ? (x / (width - 1) - 0.5) * 2 : 0, dy = height > 1 ? (y / (height - 1) - 0.5) * 2 : 0;
    const center = 0.4 + 0.6 * Math.exp(-((dx * dx + dy * dy) / 2) / (2 * 0.35 * 0.35)); // 가운데일수록
    const vivid = 0.6 + 0.9 * Math.min(chroma[i], 60) / 60; // 선명할수록
    const bright = darkPhoto ? 1 : Math.min(1.2, Math.max(1, (L[i] - 20) / 40)); // 밝은 픽셀은 조금 더
    const flat = 0.25 + 0.75 * Math.min(1, texture[i] / 6); // 하늘·벽·바닥처럼 매끈하면 덜
    const standout = darkPhoto ? 1 : 0.3 + 1.2 * (salienceMax ? salience[i] / salienceMax : 0); // 사진 평균색과 다를수록
    const color = colorOf[i];
    counts[color] += alpha[i] * center * vivid * bright * flat * standout * borderWeight[color];
    chromaSum[color] += chroma[i]; pixelCount[color]++;
  }
  const sum = counts.reduce((acc, v) => acc + v, 0);
  const bins = counts.map((count) => count / sum);
  const ranked = bins.map((value, index) => ({ value, index })).sort((x, y) => y.value - x.value || x.index - y.index);
  // 누적 반올림 오차는 최다색에만 보정합니다.
  bins[ranked[0].index] += 1 - bins.reduce((acc, v) => acc + v, 0);

  // 후보 3개(겹치면 건너뜀). 기본은 자동 대표색 → 다음으로 비율 큰 색(5% 이상) → 가장 선명한 유채색(2% 이상, 건물·땅 계열 제외).
  // 아래 둘 중 하나라도 있으면 자동 대표색 → 짝 → 넓은 무채색 → 선명한 색 → 다음 색 순서로 채웁니다.
  //  - 짝: 대표색과 색은 같은데 대상이 다를 수 있는 색(CONFUSABLE_PAIR). 사진에 거의 없어도 넣습니다.
  //  - 넓은 무채색: 대표색이 유채색인데 사진 대부분이 무채색이면 가장 넓게 차지한(가중치 없는 픽셀 수) 무채색.
  //    눈처럼 넓은 무채색이 밝기별로 여러 칸에 나뉘면 한 칸씩은 유채색 대표색에 밀려 후보에서 빠지기 때문입니다.
  const first = dominantIndex(bins);
  const next = ranked.find((e) => e.value >= 0.05 && e.index !== first)?.index;
  const meanChroma = (i: number) => pixelCount[i] ? chromaSum[i] / pixelCount[i] : 0;
  const vividPick = [...Array(CHROMATIC_COUNT).keys()]
    .filter((i) => bins[i] >= 0.02 && i !== first && i !== next && !BACKGROUND.has(i))
    .sort((x, y) => meanChroma(y) - meanChroma(x) || x - y)[0];
  const pair = CONFUSABLE_PAIR[first];
  const achromatic = bins.slice(CHROMATIC_COUNT).reduce((acc, v) => acc + v, 0);
  let widest: number | undefined;
  // 짝이 이미 무채색(하늘 → 안개 등)이면 무채색을 또 넣지 않고 그 자리를 선명한 색에 양보합니다.
  if (first < CHROMATIC_COUNT && achromatic >= MOSTLY_ACHROMATIC && !(pair !== undefined && pair >= CHROMATIC_COUNT)) {
    widest = CHROMATIC_COUNT;
    for (let i = CHROMATIC_COUNT + 1; i < 40; i++) if (pixelCount[i] > pixelCount[widest]) widest = i;
    if (!pixelCount[widest]) widest = undefined;
  }
  const order = pair === undefined && widest === undefined ? [first, next, vividPick] : [first, pair, widest, vividPick, next];
  const picks = [...new Set(order.filter((i): i is number => i !== undefined))].slice(0, 3);
  return toAnalysis(bins, picks.map((i) => COLOR_HEX[i]));
}

// 사용자가 고른 후보를 대표색으로: 고른 색 비율을 올리고(나머지는 같은 비율로 줄여 합 1 유지)
// BE dominantColor가 그 색을 고르는 가장 작은 만큼만 섞습니다. 자동 대표색을 고르면 원래 분석 그대로입니다.
export function chooseRepresentative(analysis: ColorAnalysis, hex: string): ColorAnalysis {
  const index = COLOR_HEX.findIndex((c) => c === hex);
  if (index < 0 || dominantIndex(analysis.bins) === index) return analysis;
  for (let step = 1; step <= 20; step++) {
    const t = Math.min(1, step * 0.05 + 0.05); // 경계에서 뒤집히지 않게 한 칸 여유
    const bins = analysis.bins.map((v, i) => v * (1 - t) + (i === index ? t : 0));
    if (dominantIndex(bins) === index) return toAnalysis(bins, analysis.candidates);
  }
  return toAnalysis(COLOR_HEX.map((_, i) => (i === index ? 1 : 0)), analysis.candidates);
}

export async function analyzePhoto(file: File): Promise<ColorAnalysis> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, SAMPLE_MAX_SIZE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    // 브라우저마다 결과가 덜 달라지게 색 공간을 sRGB로 고정합니다.
    const ctx = canvas.getContext("2d", { willReadFrequently: true, colorSpace: "srgb" });
    if (!ctx) throw new Error("사진 색상을 분석할 수 없는 브라우저예요.");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height, { colorSpace: "srgb" });
    return analyzePixels(data, canvas.width, canvas.height);
  } finally { bitmap.close(); }
}
