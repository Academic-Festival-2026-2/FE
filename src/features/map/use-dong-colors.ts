import { useEffect, useMemo, useRef, useState } from "react";
import {
  getMapDongs,
  type DongColor,
  type SeasonType,
  type TimeBand,
  type TopDong,
} from "../../api/map";
import { TIME_BAND_VALUES } from "../../utils/time-band";

type RegionColors = { dongs: Map<string, DongColor>; topDongs: TopDong[]; season: string | null };

// 마지막으로 받은 지역·시간대별 동 색. 화면을 다시 열면 이 값을 먼저 보여 주고 바로 새로 받아 바꿈
const lastDongColors = new Map<string, RegionColors>();
const colorKey = (regionCode: string, band: TimeBand, season: SeasonType) =>
  `${regionCode}:${band}:${season}`;

// 보이는 지역들의 동 색. 첫 지역(화면 가운데)은 나머지 시간대도 미리 받아 탭을 바꾸면 바로 바뀜
export function useDongColors(timeBand: TimeBand, regionCodes: string[], season: SeasonType) {
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
      const k = colorKey(code, band, season);
      if (requested.has(k)) continue;
      requested.add(k);
      getMapDongs(band, code, season)
        .then(({ dongs, topDongs, season: responseSeason }) => {
          if (responseSeason !== season) {
            throw new Error("요청한 계절과 응답 계절이 다릅니다.");
          }
          const state: RegionColors = {
            dongs: new Map(dongs.map((dong) => [dong.dongCode, dong])),
            topDongs,
            season: responseSeason,
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
  }, [timeBand, key, season]);

  // 보이는 지역 동 색을 하나로 합침 (지도 칠하기용)
  const dongs = useMemo(() => {
    const merged = new Map<string, DongColor>();
    for (const code of key ? key.split(",") : []) {
      for (const [dongCode, dong] of cache.get(colorKey(code, timeBand, season))?.dongs ?? []) {
        merged.set(dongCode, dong);
      }
    }
    return merged;
  }, [cache, key, timeBand, season]);

  const first = key.split(",")[0];
  const firstColors = first ? cache.get(colorKey(first, timeBand, season)) : undefined;
  const error = first ? (errors.get(colorKey(first, timeBand, season)) ?? null) : null;
  return {
    dongs,
    // 지역 하나의 동 색 (제목의 칠해진 동 수, Top 3)
    colorsOf: (regionCode: string) => cache.get(colorKey(regionCode, timeBand, season)),
    season: firstColors?.season ?? null,
    error,
    loading: Boolean(first) && !firstColors && !error,
  };
}
