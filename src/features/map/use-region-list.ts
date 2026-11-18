import { useEffect, useState } from "react";
import { getRegions, type RegionList } from "../../api/map";

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
