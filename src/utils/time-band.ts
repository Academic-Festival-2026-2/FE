import type { TimeBand } from "../api/map";

// 현재 시각(브라우저 기준)에 맞는 시간대. 구간은 BE PhotoService.resolveTimeBand와 같음
export function currentTimeBand(date = new Date()): TimeBand {
  const hour = date.getHours();
  if (hour >= 5 && hour < 8) return "DAWN";
  if (hour >= 8 && hour < 16) return "DAY";
  if (hour >= 16 && hour < 19) return "SUNSET";
  return "NIGHT"; // 19시~다음 날 5시
}
