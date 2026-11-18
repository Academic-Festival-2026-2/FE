import type { SeasonType } from "../api/map";

export const LAST_SEASON_KEY = "pixel:last-season";

const SEASONS: Record<string, { name: string; months: string }> = {
  SPRING: { name: "봄", months: "3–5월" },
  SUMMER: { name: "여름", months: "6–8월" },
  AUTUMN: { name: "가을", months: "9–11월" },
  WINTER: { name: "겨울", months: "12–2월" },
};

// 계절 선택 목록 (봄 → 겨울 순서)
export const SEASON_OPTIONS = Object.entries(SEASONS).map(([value, info]) => ({
  value: value as SeasonType,
  ...info,
}));

export function seasonOf(season: string | null) {
  return season ? SEASONS[season] : undefined;
}

export function parseSeason(value: unknown): SeasonType | undefined {
  if (value === "SPRING" || value === "SUMMER" || value === "AUTUMN" || value === "WINTER")
    return value;
  return undefined;
}

export function currentSeason(date: Date = new Date()): SeasonType {
  const month = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      month: "numeric",
    }).format(date),
  );
  if (month >= 3 && month <= 5) return "SPRING";
  if (month >= 6 && month <= 8) return "SUMMER";
  if (month >= 9 && month <= 11) return "AUTUMN";
  return "WINTER";
}

export function chooseSeason(
  urlSeason: unknown,
  savedSeason: unknown,
  date: Date = new Date(),
): SeasonType {
  return parseSeason(urlSeason) ?? parseSeason(savedSeason) ?? currentSeason(date);
}

export function preferredSeason(urlSeason?: unknown): SeasonType {
  let savedSeason: unknown;
  try {
    savedSeason =
      typeof window === "undefined" ? undefined : window.localStorage.getItem(LAST_SEASON_KEY);
  } catch {
    savedSeason = undefined;
  }
  return chooseSeason(urlSeason, savedSeason);
}

export function rememberSeason(season: SeasonType): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LAST_SEASON_KEY, season);
    }
  } catch {
    // 비공개 브라우징 등 저장이 제한된 경우에도 현재 화면 선택은 유지
  }
}
