// 동 대표색을 지도에 칠할 색으로 (채도·밝기를 정해진 범위로 맞춤)

const TONE_MAX_SATURATION = 0.55;
const TONE_MIN_LIGHTNESS = 0.5;
const TONE_MAX_LIGHTNESS = 0.84;

export function toneColor(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue = (hue * 60 + 360) % 360;
  }

  const s = Math.min(saturation, TONE_MAX_SATURATION);
  const l = Math.min(
    TONE_MAX_LIGHTNESS,
    Math.max(TONE_MIN_LIGHTNESS, 0.66 + (lightness - 0.5) * 0.6),
  );
  return `hsl(${Math.round(hue)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
}
