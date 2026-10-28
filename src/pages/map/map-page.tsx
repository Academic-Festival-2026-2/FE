import { useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { TimeBand } from "../../api/map";
import {
  KAKAO_ERROR,
  KAKAO_UNAVAILABLE,
  PAGE_BG,
  useBoundaries,
  useDongColors,
} from "./map-data";
import { DongCard, ErrorBanner, TimeBandBar } from "./map-ui";
import { useCoveredMap } from "./use-covered-map";

export function MapPage() {
  const { timeBand } = useSearch({ from: "/map" });
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const { boundaries, error: boundaryError } = useBoundaries();
  const { dongs, error: colorError } = useDongColors(timeBand);

  useCoveredMap(containerRef, boundaries, dongs, {
    onHover: setHoveredCode,
    onSelect: (dongCode) =>
      navigate({ to: "/dong/$dongCode", params: { dongCode }, search: { timeBand } }),
  });

  function changeTimeBand(value: TimeBand) {
    navigate({ to: "/map", search: { timeBand: value }, replace: true });
  }

  return (
    <div className="relative h-screen w-full" style={{ backgroundColor: PAGE_BG }}>
      <div ref={containerRef} className="h-full w-full" />

      <div className="absolute left-4 top-4 z-10">
        <TimeBandBar value={timeBand} onChange={changeTimeBand} />
      </div>
      <div className="absolute bottom-6 left-4 z-10">
        <DongCard dong={hoveredCode ? dongs.get(hoveredCode) : undefined} />
      </div>
      <div className="absolute bottom-6 right-4 z-10">
        <ErrorBanner message={KAKAO_UNAVAILABLE ? KAKAO_ERROR : (boundaryError ?? colorError)} />
      </div>
    </div>
  );
}
