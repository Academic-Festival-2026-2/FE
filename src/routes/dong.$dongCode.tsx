import { createFileRoute } from "@tanstack/react-router";
import type { TimeBand } from "../api/map";
import { DongPage } from "../pages/dong/dong-page";
import { parseTimeBand } from "../pages/map/map-data";

type DongSearch = {
  timeBand: TimeBand;
  mode?: "mine";
};

export const Route = createFileRoute("/dong/$dongCode")({
  validateSearch: (search: Record<string, unknown>): DongSearch => ({
    timeBand: parseTimeBand(search.timeBand),
    mode: search.mode === "mine" ? "mine" : undefined,
  }),
  component: DongPage,
});
