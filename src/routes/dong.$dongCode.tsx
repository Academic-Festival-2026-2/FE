import { createFileRoute } from "@tanstack/react-router";
import type { SeasonType, TimeBand } from "../api/map";
import { parseSeason } from "../utils/season";
import { DongPage } from "../pages/dong/dong-page";
import { parseTimeBand } from "../utils/time-band";

type DongSearch = {
  timeBand: TimeBand;
  season?: SeasonType;
  mode?: "mine";
};

export const Route = createFileRoute("/dong/$dongCode")({
  validateSearch: (search: Record<string, unknown>): DongSearch => ({
    timeBand: parseTimeBand(search.timeBand),
    season: parseSeason(search.season),
    mode: search.mode === "mine" ? "mine" : undefined,
  }),
  component: DongPage,
});
