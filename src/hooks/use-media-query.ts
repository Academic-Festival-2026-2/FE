import { useCallback, useSyncExternalStore } from "react";

// 미디어 쿼리가 맞는지 (화면 폭, 마우스 유무 등). 조건이 바뀌면 다시 그림
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}
