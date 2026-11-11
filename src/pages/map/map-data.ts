import { useEffect, useMemo, useRef, useState } from "react";
import { getMyMap, type MyMapCell } from "../../api/mymap";
import { isSessionExpired, useExpireSession } from "../../hooks/use-expire-session";
import { useAuthStore } from "../../stores/auth-store";
import { currentTimeBand } from "../../utils/time-band";
import {
  getBoundaries,
  getMapDongs,
  type BoundaryFeature,
  type Boundaries,
  type DongColor,
  type TimeBand,
  type TopDong,
} from "../../api/map";

export const PAGE_BG = "#f7f5f0";
export const EMPTY_FILL = "#e4dfd5";

export const KAKAO_UNAVAILABLE = typeof kakao === "undefined";
export const KAKAO_ERROR = "지도를 불러오지 못했어요.";

const TIME_BAND_VALUES: TimeBand[] = ["DAWN", "DAY", "SUNSET", "NIGHT"];

export function parseTimeBand(value: unknown): TimeBand {
  return TIME_BAND_VALUES.includes(value as TimeBand) ? (value as TimeBand) : currentTimeBand();
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
  timeBand: TimeBand | null;
  dongs: Map<string, DongColor>;
  topDongs: TopDong[];
  season: string | null;
};

const EMPTY_MAP_DONGS: MapDongsState = {
  timeBand: null,
  dongs: new Map(),
  topDongs: [],
  season: null,
};

// 시간대별 동 색을 화면이 열려 있는 동안 저장해 둠.
// 지금 시간대를 먼저 받고 나머지 3개 시간대도 바로 미리 받아 두어서, 탭을 바꾸면 기다리지 않고 바로 바뀜.
// 저장은 화면(컴포넌트) 단위라 업로드 후 지도로 돌아오면 다시 새로 받음
export function useDongColors(timeBand: TimeBand) {
  const [cache, setCache] = useState<Partial<Record<TimeBand, MapDongsState>>>({});
  const [errors, setErrors] = useState<Partial<Record<TimeBand, string>>>({});
  // 이미 요청했거나 받은 시간대 (effect 안에서만 사용)
  const requestedRef = useRef(new Set<TimeBand>());
  const aliveRef = useRef(false);

  useEffect(() => {
    const requested = requestedRef.current;
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      // 화면을 떠나면 다음에 다시 열 때 새로 받도록 비움 (개발 모드 StrictMode 재실행도 대비)
      requested.clear();
    };
  }, []);

  useEffect(() => {
    const requested = requestedRef.current;
    const order = [timeBand, ...TIME_BAND_VALUES.filter((band) => band !== timeBand)];
    for (const band of order) {
      if (requested.has(band)) continue;
      requested.add(band);
      getMapDongs(band)
        .then(({ dongs, topDongs, season }) => {
          if (!aliveRef.current) return;
          setCache((prev) => ({
            ...prev,
            [band]: {
              timeBand: band,
              dongs: new Map(dongs.map((dong) => [dong.dongCode, dong])),
              topDongs,
              season,
            },
          }));
          setErrors((prev) => ({ ...prev, [band]: undefined }));
        })
        .catch(() => {
          // 실패한 시간대는 다음에 그 탭을 누를 때 다시 요청
          requested.delete(band);
          if (!aliveRef.current) return;
          setErrors((prev) => ({ ...prev, [band]: "동 색을 불러오지 못했어요." }));
        });
    }
  }, [timeBand]);

  const data = cache[timeBand];
  const error = errors[timeBand] ?? null;
  return {
    ...(data ?? { ...EMPTY_MAP_DONGS, timeBand }),
    error,
    loading: !data && !error,
  };
}

export function toKakaoPath(rings: number[][][]) {
  return rings.map((ring) => ring.map(([lng, lat]) => new kakao.maps.LatLng(lat, lng)));
}

export function useMyMap(enabled: boolean, timeBand: TimeBand) {
  const accessToken = useAuthStore((state) => state.tokens?.accessToken);
  const expireSession = useExpireSession();
  const [loaded, setLoaded] = useState<{ token: string; cells: MyMapCell[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !accessToken) return;
    let cancelled = false;
    getMyMap()
      .then((data) => {
        if (cancelled) return;
        setLoaded({ token: accessToken, cells: data.cells });
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        if (isSessionExpired(err)) expireSession();
        else setError("내 지도를 불러오지 못했어요.");
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, accessToken, expireSession]);

  const cells = loaded && loaded.token === accessToken ? loaded.cells : null;

  const dongs = useMemo(() => {
    const result = new Map<string, DongColor>();
    for (const cell of cells ?? []) {
      if (cell.timeBand !== timeBand) continue;
      result.set(cell.dongCode, {
        dongCode: cell.dongCode,
        name: cell.name,
        dominantColor: cell.filled ? cell.myColor : null,
        photoCount: cell.myPhotoCount,
        status: cell.filled ? "OK" : "EMPTY",
        colorRatio: cell.myColor ? [{ hex: cell.myColor, ratio: 1 }] : [],
      });
    }
    return result;
  }, [cells, timeBand]);

  const filledCount = (cells ?? []).filter(
    (cell) => cell.timeBand === timeBand && cell.filled,
  ).length;

  return { dongs, filledCount, loading: enabled && cells === null && !error, error };
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

const TONE_MAX_SATURATION = 0.55;
const TONE_MIN_LIGHTNESS = 0.5;
const TONE_MAX_LIGHTNESS = 0.84;

export function toneColor(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue = (hue * 60 + 360) % 360;
  }

  const s = Math.min(saturation, TONE_MAX_SATURATION);
  const l = Math.min(
    TONE_MAX_LIGHTNESS,
    Math.max(TONE_MIN_LIGHTNESS, 0.66 + (lightness - 0.5) * 0.6),
  );
  return `hsl(${Math.round(hue)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
}
