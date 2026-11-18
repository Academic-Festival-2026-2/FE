import type { TimeBand } from "../api/map";

// 시간대 순서 (새벽 → 밤). 지도 아래 시간대 바, 색 미리 받기, 전환 방향이 이 순서를 씀
export const TIME_BAND_VALUES: TimeBand[] = ["DAWN", "DAY", "SUNSET", "NIGHT"];

// 시간대 이름과 시각 구간. 구간은 BE PhotoService.resolveTimeBand와 같음
export const TIME_BANDS: { value: TimeBand; label: string; range: string }[] = [
  { value: "DAWN", label: "새벽", range: "05–08" },
  { value: "DAY", label: "낮", range: "08–16" },
  { value: "SUNSET", label: "노을", range: "16–19" },
  { value: "NIGHT", label: "밤", range: "19–05" },
];

// 시간대를 나타내는 작은 색 칸 = 로고 4색 (logo-mark.tsx, 로딩 픽셀, 배지 그림도 같은 색)
export const BAND_PIXEL: Record<TimeBand, string> = {
  DAWN: "#c4b7e9",
  DAY: "#8ab4e9",
  SUNSET: "#ee8156",
  NIGHT: "#2d2670",
};

export function bandLabel(value: TimeBand) {
  return TIME_BANDS.find((band) => band.value === value)?.label ?? "";
}

// 현재 시각(브라우저 기준)에 맞는 시간대. 구간은 BE PhotoService.resolveTimeBand와 같음
export function currentTimeBand(date = new Date()): TimeBand {
  const hour = date.getHours();
  if (hour >= 5 && hour < 8) return "DAWN";
  if (hour >= 8 && hour < 16) return "DAY";
  if (hour >= 16 && hour < 19) return "SUNSET";
  return "NIGHT"; // 19시~다음 날 5시
}

// 주소의 시간대 값. 모르는 값이면 지금 시각의 시간대
export function parseTimeBand(value: unknown): TimeBand {
  return TIME_BAND_VALUES.includes(value as TimeBand) ? (value as TimeBand) : currentTimeBand();
}
