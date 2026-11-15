import { createFileRoute } from "@tanstack/react-router";
import type { TimeBand } from "../api/map";
import { parseTimeBand } from "../pages/map/map-data";
import { SharedMapPage } from "../pages/shared/shared-map-page";

type SharedSearch = {
  timeBand: TimeBand;
};

export const Route = createFileRoute("/shared/$shareKey")({
  validateSearch: (search: Record<string, unknown>): SharedSearch => ({
    timeBand: parseTimeBand(search.timeBand),
  }),
  component: SharedMapPage,
});
