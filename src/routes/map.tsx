import { createFileRoute } from "@tanstack/react-router";
import type { SeasonType, TimeBand } from "../api/map";
import { parseSeason } from "../utils/season";
import { parseTimeBand } from "../pages/map/map-data";
import { MapPage } from "../pages/map/map-page";

type MapSearch = {
  timeBand: TimeBand;
  season?: SeasonType;
  mode?: "mine";
  // 화면 가운데 지역 코드 (4자리). 새로고침·동 상세에서 돌아올 때 그 지역으로 열림
  region?: number;
};

export const Route = createFileRoute("/map")({
  validateSearch: (search: Record<string, unknown>): MapSearch => ({
    timeBand: parseTimeBand(search.timeBand),
    season: parseSeason(search.season),
    region: /^\d{4}$/.test(String(search.region)) ? Number(search.region) : undefined,
    mode: search.mode === "mine" ? "mine" : undefined,
  }),

  component: MapPage,
});
