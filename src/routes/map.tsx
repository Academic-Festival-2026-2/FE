import { createFileRoute } from "@tanstack/react-router";
import type { TimeBand } from "../api/map";
import { parseTimeBand } from "../pages/map/map-data";
import { MapPage } from "../pages/map/map-page";

type MapSearch = {
  timeBand: TimeBand;
};

export const Route = createFileRoute("/map")({
  validateSearch: (search: Record<string, unknown>): MapSearch => ({
    timeBand: parseTimeBand(search.timeBand),
  }),
  component: MapPage,
});
