import { useEffect, useMemo, useRef, useState } from "react";
import { getMyMap, getSharedMap, type MyMapCell } from "../../api/mymap";
import { isSessionExpired, useExpireSession } from "../../hooks/use-expire-session";
import { useAuthStore } from "../../stores/auth-store";
import { ApiError } from "../../api/client";
import { currentTimeBand } from "../../utils/time-band";
import {
  getBoundaries,
  getMapDongs,
  getRegions,
  type Boundaries,
  type RegionList,
  type DongColor,
  type TimeBand,
  type TopDong,
} from "../../api/map";

// 지역 목록을 받기 전·동 상세의 기본 지역 (BE Region.DEFAULT_CODE와 같음)
export const DEFAULT_REGION_CODE = "3105";

// 동 상세·업로드 위치 선택 지도에서 고른 동 바깥을 덮는 큰 사각형 [위도, 경도].
// 경기도 전체를 덮는 범위 (map-geometry.ts의 원점·끝과 같음)
export const MASK_FRAME_POINTS: [number, number][] = [
  [36.5, 125.8],
  [36.5, 128.2],
  [38.6, 128.2],
  [38.6, 125.8],
];

// 동 상세 지도에서 고른 동 바깥을 덮는 색 (지도 화면 빈 동 기본색 EMPTY_FILL과 같은 쿨톤 회색)
export const PAGE_BG = "#e2e6ed";
// 사진이 없는 동의 기본 색 (살짝 쿨톤 회색)
export const EMPTY_FILL = "#e2e6ed";

// 동 상태 문구 (OK는 표시 안 함). 동 상세 제목 패널에서 씀
export const STATUS_LABEL = {
  OK: "",
  INSUFFICIENT: "데이터 부족",
  EMPTY: "사진 없음",
} as const;

export const KAKAO_UNAVAILABLE = typeof kakao === "undefined";
export const KAKAO_ERROR = "지도를 불러오지 못했어요.";

const TIME_BAND_VALUES: TimeBand[] = ["DAWN", "DAY", "SUNSET", "NIGHT"];

export function parseTimeBand(value: unknown): TimeBand {
  return TIME_BAND_VALUES.includes(value as TimeBand) ? (value as TimeBand) : currentTimeBand();
}

// 지역 목록(약 3.5KB)은 탭이 열려 있는 동안 한 번만 받는다
let regionListCache: RegionList | null = null;
let regionListRequest: Promise<RegionList> | null = null;

export function useRegionList() {
  const [regionList, setRegionList] = useState<RegionList | null>(regionListCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (regionListCache) return;
    let cancelled = false;
    regionListRequest ??= getRegions().then(
      (result) => (regionListCache = result),
      (err: unknown) => {
        regionListRequest = null;
        throw err;
      },
    );
    regionListRequest
      .then((result) => !cancelled && setRegionList(result))
      .catch(() => !cancelled && setError("지역 목록을 불러오지 못했어요."));
    return () => {
      cancelled = true;
    };
  }, []);

  return { regionList, error };
}

// 동 경계는 화면을 옮겨도 바뀌지 않으므로 지역마다 한 번 받으면 탭이 열려 있는 동안 다시 쓴다
const boundariesCache = new Map<string, Boundaries>();
const boundariesRequests = new Map<string, Promise<Boundaries>>();

function loadBoundaries(regionCode: string) {
  let request = boundariesRequests.get(regionCode);
  if (!request) {
    request = getBoundaries(regionCode).then(
      (result) => {
        boundariesCache.set(regionCode, result);
        return result;
      },
      (error: unknown) => {
        // 실패하면 다음에 다시 시도할 수 있게 비움
        boundariesRequests.delete(regionCode);
        throw error;
      },
    );
    boundariesRequests.set(regionCode, request);
  }
  return request;
}

// 여러 지역의 경계. 받은 지역부터 바로 돌려주고, 아직 안 온 지역은 빠져 있다
export function useRegionBoundaries(regionCodes: string[]) {
  const key = regionCodes.join(",");
  const [, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    for (const code of key ? key.split(",") : []) {
      if (boundariesCache.has(code)) continue;
      loadBoundaries(code)
        .then(() => !cancelled && setVersion((v) => v + 1))
        .catch(() => !cancelled && setError("동 경계를 불러오지 못했어요."));
    }
    return () => {
      cancelled = true;
    };
  }, [key]);

  // 받은 지역만 골라 키로 만들고, 키가 같으면 같은 배열을 돌려줘서 지도가 모양을 다시 계산하지 않게
  const loadedKey = (key ? key.split(",") : []).filter((code) => boundariesCache.has(code)).join(",");
  const regions = useMemo(
    () => (loadedKey ? loadedKey.split(",").map((code) => boundariesCache.get(code) as Boundaries) : []),
    [loadedKey],
  );
  return { regions, error };
}

// 지역 하나 (동 상세·업로드 화면용)
export function useBoundaries(regionCode: string = DEFAULT_REGION_CODE) {
  const { regions, error } = useRegionBoundaries(useMemo(() => [regionCode], [regionCode]));
  return { boundaries: regions[0] ?? null, error };
}
type RegionColors = { dongs: Map<string, DongColor>; topDongs: TopDong[]; season: string | null };

// 마지막으로 받은 지역·시간대별 동 색. 화면을 다시 열면 이 값을 먼저 보여 주고 바로 새로 받아 바꿈
const lastDongColors = new Map<string, RegionColors>();
const colorKey = (regionCode: string, band: TimeBand) => `${regionCode}:${band}`;

// 보이는 지역들의 동 색. 첫 지역(화면 가운데)은 나머지 시간대도 미리 받아 탭을 바꾸면 바로 바뀜
export function useDongColors(timeBand: TimeBand, regionCodes: string[]) {
  const key = regionCodes.join(",");
  const [cache, setCache] = useState(() => new Map(lastDongColors));
  const [errors, setErrors] = useState(() => new Map<string, string>());
  const requestedRef = useRef(new Set<string>());
  const aliveRef = useRef(false);

  useEffect(() => {
    const requested = requestedRef.current;
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      // 화면을 떠나면 다음에 다시 열 때 새로 받도록 비움
      requested.clear();
    };
  }, []);

  useEffect(() => {
    const requested = requestedRef.current;
    const codes = key ? key.split(",") : [];
    const jobs: [string, TimeBand][] = codes.map((code) => [code, timeBand]);
    if (codes[0]) {
      for (const band of TIME_BAND_VALUES) if (band !== timeBand) jobs.push([codes[0], band]);
    }
    for (const [code, band] of jobs) {
      const k = colorKey(code, band);
      if (requested.has(k)) continue;
      requested.add(k);
      getMapDongs(band, code)
        .then(({ dongs, topDongs, season }) => {
          const state: RegionColors = {
            dongs: new Map(dongs.map((dong) => [dong.dongCode, dong])),
            topDongs,
            season,
          };
          lastDongColors.set(k, state);
          if (!aliveRef.current) return;
          setCache((prev) => new Map(prev).set(k, state));
          setErrors((prev) => {
            if (!prev.has(k)) return prev;
            const next = new Map(prev);
            next.delete(k);
            return next;
          });
        })
        .catch(() => {
          // 실패한 것은 다음에 다시 요청
          requested.delete(k);
          if (!aliveRef.current) return;
          setErrors((prev) => new Map(prev).set(k, "동 색을 불러오지 못했어요."));
        });
    }
  }, [timeBand, key]);

  // 보이는 지역 동 색을 하나로 합침 (지도 칠하기용)
  const dongs = useMemo(() => {
    const merged = new Map<string, DongColor>();
    for (const code of key ? key.split(",") : []) {
      for (const [dongCode, dong] of cache.get(colorKey(code, timeBand))?.dongs ?? []) {
        merged.set(dongCode, dong);
      }
    }
    return merged;
  }, [cache, key, timeBand]);

  const first = key.split(",")[0];
  const firstColors = first ? cache.get(colorKey(first, timeBand)) : undefined;
  const error = first ? (errors.get(colorKey(first, timeBand)) ?? null) : null;
  return {
    dongs,
    // 지역 하나의 동 색 (제목의 칠해진 동 수, Top 3)
    colorsOf: (regionCode: string) => cache.get(colorKey(regionCode, timeBand)),
    season: firstColors?.season ?? null,
    error,
    loading: Boolean(first) && !firstColors && !error,
  };
}

export function toKakaoPath(rings: number[][][]) {
  return rings.map((ring) => ring.map(([lng, lat]) => new kakao.maps.LatLng(lat, lng)));
}

// 나의 지도: 보이는 지역마다 내 칸을 받음 (지역 하나에 4개 시간대가 한 번에 옴).
// 로그인한 사람(토큰)이 바뀌면 받은 것을 버리고 새로 받음
export function useMyMap(enabled: boolean, timeBand: TimeBand, regionCodes: string[]) {
  const accessToken = useAuthStore((state) => state.tokens?.accessToken);
  const expireSession = useExpireSession();
  const key = regionCodes.join(",");
  const [loaded, setLoaded] = useState<{ token: string; cells: Map<string, MyMapCell[]> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 이미 요청한 "토큰:지역" (받는 중에 같은 지역을 또 요청하지 않게)
  const requestedRef = useRef(new Set<string>());

  // 화면을 떠났는지. 보이는 지역이 바뀌어도 받는 중인 응답은 버리지 않고 저장한다
  // (버리면 requestedRef에 "요청함"만 남아 그 지역을 다시 받지 않음). 저장할 때 토큰을 확인하므로 안전
  const aliveRef = useRef(false);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !accessToken) return;
    for (const code of key ? key.split(",") : []) {
      const k = `${accessToken}:${code}`;
      if (requestedRef.current.has(k)) continue;
      requestedRef.current.add(k);
      getMyMap({ regionCode: code })
        .then((data) => {
          if (!aliveRef.current) return;
          setLoaded((prev) => {
            const base = prev && prev.token === accessToken ? prev.cells : new Map<string, MyMapCell[]>();
            return { token: accessToken, cells: new Map(base).set(code, data.cells) };
          });
          setError(null);
        })
        .catch((err) => {
          requestedRef.current.delete(k);
          if (!aliveRef.current) return;
          if (isSessionExpired(err)) expireSession();
          else setError("나의 지도를 불러오지 못했어요.");
        });
    }
  }, [enabled, accessToken, key, expireSession]);



  const cellsByRegion = loaded && loaded.token === accessToken ? loaded.cells : null;

  // 지역 하나의 내 칸을 지도용 동 색으로 바꿈 (시간대 하나만)
  function dongsOf(regionCode: string | null) {
    const result = new Map<string, DongColor>();
    for (const cell of (regionCode && cellsByRegion?.get(regionCode)) || []) {
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
  }

  const codes = key ? key.split(",") : [];
  // 보이는 지역을 하나로 합친 것 (지도 칠하기용)
  const dongs = new Map(codes.flatMap((code) => [...dongsOf(code)]));
  const first = codes[0];

  return {
    dongs,
    dongsOf,
    loading: enabled && Boolean(first) && !cellsByRegion?.has(first) && !error,
    error,
  };
}

// 공유받은 지도 (로그인 없음). useMyMap과 같은 방식으로 보이는 지역마다 받고, 응답을 지역별로 모음
// 공유가 꺼졌거나 없는 키(404)면 notFound
export function useSharedMap(shareKey: string, timeBand: TimeBand, regionCodes: string[]) {
  const key = regionCodes.join(",");
  const [cells, setCells] = useState<Map<string, MyMapCell[]>>(new Map());
  const [owner, setOwner] = useState<{ nickname: string; profileImage: string } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [season, setSeason] = useState<string | null>(null);
  // 이미 요청한 지역 (받는 중에 같은 지역을 또 요청하지 않게)
  const requestedRef = useRef(new Set<string>());

  const aliveRef = useRef(false);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    for (const code of key ? key.split(",") : []) {
      if (requestedRef.current.has(code)) continue;
      requestedRef.current.add(code);
      getSharedMap(shareKey, code)
        .then((data) => {
          if (!aliveRef.current) return;
          setOwner({ nickname: data.nickname, profileImage: data.profileImage });
          setSeason(data.map.season);
          setCells((prev) => new Map(prev).set(code, data.map.cells));
          setError(null);
        })
        .catch((err) => {
          requestedRef.current.delete(code);
          if (!aliveRef.current) return;
          if (err instanceof ApiError && err.code === "MYMAP404_1") setNotFound(true);
          else setError("공유 지도를 불러오지 못했어요.");
        });
    }
  }, [shareKey, key]);

  // 지역 하나의 칸을 지도용 동 색으로 바꿈 (시간대 하나만)
  function dongsOf(regionCode: string | null) {
    const result = new Map<string, DongColor>();
    for (const cell of (regionCode && cells.get(regionCode)) || []) {
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
  }
  const codes = key ? key.split(",") : [];
  // 보이는 지역을 하나로 합친 것 (지도 칠하기용)
  const dongs = new Map(codes.flatMap((code) => [...dongsOf(code)]));
  const first = codes[0];

  return {
    owner,
    season,
    dongs,
    dongsOf,
    notFound,
    error,
    loading: Boolean(first) && !cells.has(first) && !error && !notFound,
  };
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

// 시간대를 나타내는 작은 색 칸 (로고 4색과 같음: logo-mark.tsx). 지도 아래 시간대 바, 사진 카드 시간대 표시
export const BAND_PIXEL: Record<TimeBand, string> = {
  DAWN: "#c4b7e9",
  DAY: "#8ab4e9",
  SUNSET: "#ee8156",
  NIGHT: "#2d2670",
};

export function bandLabel(value: TimeBand) {
  return TIME_BANDS.find((band) => band.value === value)?.label ?? "";
}

// 계절 선택 목록 (봄 → 겨울 순서)
export const SEASON_OPTIONS = Object.entries(SEASONS).map(([value, info]) => ({ value, ...info }));

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
