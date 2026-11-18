import { useEffect, useMemo, useState } from "react";
import { getBoundaries, type Boundaries } from "../../api/map";
import { DEFAULT_REGION_CODE } from "./map-constants";

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
  // 받지 못한 지역 코드 (업로드 화면이 필요한 지역의 실패인지 구분하는 데 씀)
  const [failed, setFailed] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    for (const code of key ? key.split(",") : []) {
      if (boundariesCache.has(code)) continue;
      loadBoundaries(code)
        .then(() => {
          if (cancelled) return;
          setVersion((v) => v + 1);
          // 전에 실패했다가 다시 받아 성공하면 실패 목록에서 뺌
          setFailed((codes) => (codes.includes(code) ? codes.filter((c) => c !== code) : codes));
        })
        .catch(() => {
          if (cancelled) return;
          setError("동 경계를 불러오지 못했어요.");
          setFailed((codes) => (codes.includes(code) ? codes : [...codes, code]));
        });
    }
    return () => {
      cancelled = true;
    };
  }, [key]);

  // 받은 지역만 골라 키로 만들고, 키가 같으면 같은 배열을 돌려줘서 지도가 모양을 다시 계산하지 않게
  const loadedKey = (key ? key.split(",") : [])
    .filter((code) => boundariesCache.has(code))
    .join(",");
  const regions = useMemo(
    () =>
      loadedKey ? loadedKey.split(",").map((code) => boundariesCache.get(code) as Boundaries) : [],
    [loadedKey],
  );
  return { regions, error, failed };
}

// 지역 하나 (동 상세·업로드 화면용)
export function useBoundaries(regionCode: string = DEFAULT_REGION_CODE) {
  const { regions, error } = useRegionBoundaries(useMemo(() => [regionCode], [regionCode]));
  return { boundaries: regions[0] ?? null, error };
}
