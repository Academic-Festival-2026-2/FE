import { useEffect, useState } from "react";
import {
  getBoundaries,
  getMapDongs,
  type BoundaryFeature,
  type Boundaries,
  type DongColor,
  type TimeBand,
} from "../../api/map";

export const PAGE_BG = "#f7f5f0";
export const EMPTY_FILL = "#e4dfd5";

export const KAKAO_UNAVAILABLE = typeof kakao === "undefined";
export const KAKAO_ERROR = "지도를 불러오지 못했어요.";

const TIME_BAND_VALUES: TimeBand[] = ["DAWN", "DAY", "SUNSET", "NIGHT"];

export function parseTimeBand(value: unknown): TimeBand {
  return TIME_BAND_VALUES.includes(value as TimeBand) ? (value as TimeBand) : "SUNSET";
}

export function useBoundaries() {
  const [boundaries, setBoundaries] = useState<Boundaries | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getBoundaries()
      .then((result) => {
        if (!cancelled) setBoundaries(result);
      })
      .catch(() => {
        if (!cancelled) setError("동 경계를 불러오지 못했어요.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { boundaries, error };
}

export function useDongColors(timeBand: TimeBand) {
  const [dongs, setDongs] = useState(new Map<string, DongColor>());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMapDongs(timeBand)
      .then(({ dongs: list }) => {
        if (cancelled) return;
        setDongs(new Map(list.map((dong) => [dong.dongCode, dong])));
        setError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setDongs(new Map());
        setError("동 색을 불러오지 못했어요.");
      });
    return () => {
      cancelled = true;
    };
  }, [timeBand]);

  return { dongs, error };
}

export function toKakaoPath(rings: number[][][]) {
  return rings.map((ring) => ring.map(([lng, lat]) => new kakao.maps.LatLng(lat, lng)));
}

export function labelPoint(feature: BoundaryFeature): [number, number] {
  let best = feature.geometry.coordinates[0][0];
  let bestArea = 0;
  let bestCx = 0;
  let bestCy = 0;

  for (const polygon of feature.geometry.coordinates) {
    const ring = polygon[0];
    let area = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[i + 1];
      const cross = x1 * y2 - x2 * y1;
      area += cross;
      cx += (x1 + x2) * cross;
      cy += (y1 + y2) * cross;
    }
    if (Math.abs(area) > Math.abs(bestArea)) {
      best = ring;
      bestArea = area;
      bestCx = cx;
      bestCy = cy;
    }
  }

  if (bestArea === 0) return [best[0][0], best[0][1]];
  return [bestCx / (3 * bestArea), bestCy / (3 * bestArea)];
}
