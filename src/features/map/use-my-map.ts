import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "../../api/client";
import type { DongColor, SeasonType, TimeBand } from "../../api/map";
import { getMyMap, getSharedMap, type MyMapCell } from "../../api/mymap";
import { isSessionExpired, useExpireSession } from "../../hooks/use-expire-session";
import { useAuthStore } from "../../stores/auth-store";

// 나의 지도·공유받은 지도 칸 목록에서 한 시간대 칸만 골라 지도용 동 색으로 바꿈
function cellsToDongs(cells: MyMapCell[] | undefined, timeBand: TimeBand) {
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
}

// 나의 지도: 보이는 지역마다 내 칸을 받음 (지역 하나에 4개 시간대가 한 번에 옴).
// 로그인한 사람(토큰)이 바뀌면 받은 것을 버리고 새로 받음
export function useMyMap(
  enabled: boolean,
  timeBand: TimeBand,
  regionCodes: string[],
  season: SeasonType,
) {
  const accessToken = useAuthStore((state) => state.tokens?.accessToken);
  const activeTokenRef = useRef(accessToken);

  useEffect(() => {
    activeTokenRef.current = accessToken;
  }, [accessToken]);

  const expireSession = useExpireSession();
  const key = regionCodes.join(",");
  const [loaded, setLoaded] = useState<{ token: string; cells: Map<string, MyMapCell[]> } | null>(
    null,
  );
  const [failedKeys, setFailedKeys] = useState<Set<string>>(() => new Set());
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
      const k = `${accessToken}:${season}:${code}`;
      if (requestedRef.current.has(k)) continue;
      requestedRef.current.add(k);
      getMyMap({ regionCode: code, season })
        .then((data) => {
          if (!aliveRef.current || activeTokenRef.current !== accessToken) return;
          if (data.season !== season) {
            throw new Error("나의 지도 응답 계절이 일치하지 않습니다.");
          }
          setLoaded((prev) => {
            const base =
              prev && prev.token === accessToken ? prev.cells : new Map<string, MyMapCell[]>();
            return {
              token: accessToken,
              cells: new Map(base).set(`${season}:${code}`, data.cells),
            };
          });
          setFailedKeys((prev) => {
            if (!prev.has(k)) return prev;
            const next = new Set(prev);
            next.delete(k);
            return next;
          });
        })
        .catch((err) => {
          requestedRef.current.delete(k);
          if (!aliveRef.current || activeTokenRef.current !== accessToken) return;
          if (isSessionExpired(err)) expireSession();
          else setFailedKeys((prev) => new Set(prev).add(k));
        });
    }
  }, [enabled, accessToken, key, season, expireSession]);

  const cellsByRegion = loaded && loaded.token === accessToken ? loaded.cells : null;

  // 지역 하나의 내 칸을 지도용 동 색으로 바꿈 (시간대 하나만)
  function dongsOf(regionCode: string | null) {
    return cellsToDongs(
      regionCode ? cellsByRegion?.get(`${season}:${regionCode}`) : undefined,
      timeBand,
    );
  }

  const codes = key ? key.split(",") : [];
  // 보이는 지역을 하나로 합친 것 (지도 칠하기용). 받은 칸·시간대가 그대로면 같은 Map을 돌려줘서 지도가 동 겹을 다시 만들지 않게
  const dongs = useMemo(
    () =>
      new Map(
        (key ? key.split(",") : []).flatMap((code) => [
          ...cellsToDongs(cellsByRegion?.get(`${season}:${code}`), timeBand),
        ]),
      ),
    [key, cellsByRegion, season, timeBand],
  );
  const first = codes[0];
  const firstCells = first ? cellsByRegion?.get(`${season}:${first}`) : undefined;
  const error =
    first && failedKeys.has(`${accessToken}:${season}:${first}`)
      ? "나의 지도를 불러오지 못했어요."
      : null;

  return {
    dongs,
    dongsOf,
    empty: Boolean(firstCells) && !firstCells?.some((cell) => cell.filled),
    loading: enabled && Boolean(first) && !firstCells && !error,
    error,
  };
}

// 공유받은 지도 (로그인 없음). useMyMap과 같은 방식으로 보이는 지역마다 받고, 응답을 지역별로 모음
// 공유가 꺼졌거나 없는 키(404)면 notFound
export function useSharedMap(
  shareKey: string,
  timeBand: TimeBand,
  regionCodes: string[],
  season: SeasonType,
) {
  const key = regionCodes.join(",");
  const [cells, setCells] = useState<Map<string, MyMapCell[]>>(new Map());
  const [owner, setOwner] = useState<{ nickname: string; profileImage: string } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [failedKeys, setFailedKeys] = useState<Set<string>>(() => new Set());
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
      const requestKey = `${season}:${code}`;
      if (requestedRef.current.has(requestKey)) continue;
      requestedRef.current.add(requestKey);
      getSharedMap(shareKey, code, season)
        .then((data) => {
          if (!aliveRef.current) return;
          if (data.map.season !== season) {
            throw new Error("공유 지도 응답 계절이 일치하지 않습니다.");
          }
          setOwner({ nickname: data.nickname, profileImage: data.profileImage });
          setCells((prev) => new Map(prev).set(`${season}:${code}`, data.map.cells));
          setFailedKeys((prev) => {
            if (!prev.has(requestKey)) return prev;
            const next = new Set(prev);
            next.delete(requestKey);
            return next;
          });
        })
        .catch((err) => {
          requestedRef.current.delete(requestKey);
          if (!aliveRef.current) return;
          if (err instanceof ApiError && err.code === "MYMAP404_1") setNotFound(true);
          else setFailedKeys((prev) => new Set(prev).add(requestKey));
        });
    }
  }, [shareKey, key, season]);

  // 지역 하나의 칸을 지도용 동 색으로 바꿈 (시간대 하나만)
  function dongsOf(regionCode: string | null) {
    return cellsToDongs(regionCode ? cells.get(`${season}:${regionCode}`) : undefined, timeBand);
  }
  const codes = key ? key.split(",") : [];
  // 보이는 지역을 하나로 합친 것 (지도 칠하기용). 받은 칸·시간대가 그대로면 같은 Map을 돌려줘서 지도가 동 겹을 다시 만들지 않게
  const dongs = useMemo(
    () =>
      new Map(
        (key ? key.split(",") : []).flatMap((code) => [
          ...cellsToDongs(cells.get(`${season}:${code}`), timeBand),
        ]),
      ),
    [key, cells, season, timeBand],
  );
  const first = codes[0];
  const error =
    first && failedKeys.has(`${season}:${first}`) ? "공유 지도를 불러오지 못했어요." : null;

  return {
    owner,
    season,
    dongs,
    dongsOf,
    notFound,
    error,
    loading: Boolean(first) && !cells.has(`${season}:${first}`) && !error && !notFound,
  };
}
