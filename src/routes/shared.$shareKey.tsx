import { createFileRoute } from "@tanstack/react-router";
import type { SeasonType, TimeBand } from "../api/map";
import { parseSeason } from "../utils/season";
import { parseTimeBand } from "../pages/map/map-data";
import { SharedMapPage } from "../pages/shared/shared-map-page";

type SharedSearch = {
  timeBand: TimeBand;
  season?: SeasonType;
};

export const Route = createFileRoute("/shared/$shareKey")({
  validateSearch: (search: Record<string, unknown>): SharedSearch => ({
    timeBand: parseTimeBand(search.timeBand),
    season: parseSeason(search.season),
  }),
  component: SharedMapPage,
});
