import { useEffect, useState } from "react";
import {
  getBoundaries,
  getMapDongs,
  type BoundaryFeature,
  type Boundaries,
  type DongColor,
  type TimeBand, type TopDong,
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

type MapDongsState = {
  dongs: Map<string, DongColor>;
  topDongs: TopDong[];
  season: string | null;
};

const EMPTY_MAP_DONGS: MapDongsState = { dongs: new Map(), topDongs: [], season: null };

export function useDongColors(timeBand: TimeBand) {
  const [data, setData] = useState<MapDongsState>(EMPTY_MAP_DONGS);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMapDongs(timeBand)
    .then(({ dongs, topDongs, season }) => {
      if (cancelled) return;
      setData({ dongs: new Map(dongs.map((dong) => [dong.dongCode, dong])), topDongs, season });
      setError(null);
    })
    .catch(() => {
      if (cancelled) return;
      setData(EMPTY_MAP_DONGS);
      setError("동 색을 불러오지 못했어요.");
    });
    return () => {
      cancelled = true;
    };
  }, [timeBand]);

  return { ...data, error };
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

export function mixColor(from: string, to: string, ratio: number) {
  const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const start = parse(from);
  const end = parse(to);
  return `#${start
  .map((value, i) => Math.round(value + (end[i] - value) * ratio).toString(16).padStart(2, "0"))
  .join("")}`;
}

export const TIME_BANDS: { value: TimeBand; label: string; swatch: string[] }[] = [
  { value: "DAWN", label: "새벽", swatch: ["#8a86c8", "#a9a3d6", "#6f7fbf", "#c3b3dc"] },
  { value: "DAY", label: "낮", swatch: ["#8fb5d9", "#9cc28c", "#d6c58a", "#e6cf8f"] },
  { value: "SUNSET", label: "노을", swatch: ["#f28b4b", "#f5a96a", "#e07a5f", "#f2a38a"] },
  { value: "NIGHT", label: "밤", swatch: ["#3d4a80", "#2e3558", "#5a4f8c", "#6b64a8"] },
];

const SEASONS: Record<string, { name: string; months: string }> = {
  SPRING: { name: "봄", months: "3–5월" },
  SUMMER: { name: "여름", months: "6–8월" },
  AUTUMN: { name: "가을", months: "9–11월" },
  WINTER: { name: "겨울", months: "12–2월" },
};

export function bandLabel(value: TimeBand) {
  return TIME_BANDS.find((band) => band.value === value)?.label ?? "";
}

export function seasonOf(season: string | null) {
  return season ? SEASONS[season] : undefined;
}