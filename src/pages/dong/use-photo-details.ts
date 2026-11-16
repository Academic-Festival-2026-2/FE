import { useCallback, useEffect, useRef, useState } from "react";
import { getPhotoDetail, type PhotoDetail } from "../../api/photo";
import { detailTtl } from "./photo-detail-ttl";

// 내 사진 상세(authRequest)와 공유 지도 상세(optionalAuthRequest)는 따로 기억
function cacheKey(photoId: number, mine: boolean) {
  return `${mine ? "mine" : "shared"}:${photoId}`;
}

function without<T>(map: ReadonlyMap<string, T>, key: string) {
  const next = new Map(map);
  next.delete(key);
  return next;
}

// 사진 여러 장을 넘겨 보는 화면(동 화면 사진 카드, 좋아요한 사진 크게 보기)의 상세를 사진 번호별로 기억
// 받은 사진은 원본 주소가 만료되기 전까지 넘겼다 돌아와도 다시 받지 않음 (이 훅을 쓰는 컴포넌트가 사라지면 같이 지워짐)
// 만료가 가까워진 상세는 보고 있는 동안은 그대로 두고, 다른 사진에서 넘어올 때 다시 받음 (받는 동안 로딩)
// 실패한 사진은 기억하지 않음 → 넘겼다 돌아오면 다시 받는 동안 로딩으로 보임
//
// preload가 켜져 있으면(크게 보기가 열려 있을 때) 바로 옆 사진 1장씩의 상세와 원본 이미지를 미리 받아 둠
// 원본은 4000px 수준으로 커서, 지금 사진 이미지를 다 받은 뒤에 옆 사진을 받음 (지금 사진이 먼저 뜨게)
export function usePhotoDetails(
  photoIds: number[],
  index: number,
  { mine = false, preload = false }: { mine?: boolean; preload?: boolean } = {},
) {
  const photoId = photoIds[index];
  const prevId = photoIds[index - 1] as number | undefined;
  const nextId = photoIds[index + 1] as number | undefined;
  const key = cacheKey(photoId, mine);

  // 화면에 그릴 상세 (state, 만료된 것도 보고 있는 사진이면 남아 있음)
  // 만료 전이라 다시 쓸 수 있는 상세 (ref, effect 안에서만 읽음) / 받는 중인 요청
  const [details, setDetails] = useState<ReadonlyMap<string, PhotoDetail>>(() => new Map());
  const [expired, setExpired] = useState<ReadonlySet<string>>(() => new Set());
  const freshRef = useRef(new Map<string, PhotoDetail>());
  const requestsRef = useRef(new Map<string, Promise<PhotoDetail>>());
  const timersRef = useRef(new Set<number>());
  const [failedId, setFailedId] = useState<number | null>(null);

  // 다른 사진으로 넘기면 실패 표시를 지움 (실패한 사진으로 돌아오면 다시 받는 동안 로딩으로 보이게)
  // 넘어온 사진의 상세가 만료됐으면 버림 → 아래 effect가 다시 받는 동안 로딩 (만료된 주소로 사진을 그리지 않게)
  const [shownKey, setShownKey] = useState(key);
  if (shownKey !== key) {
    setShownKey(key);
    setFailedId(null);
    if (expired.has(key)) {
      setDetails((current) => without(current, key));
      setExpired((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, []);

  // 같은 사진을 받는 중이면 그 요청을 같이 씀 (미리 받는 중인 옆 사진으로 넘겨도 다시 보내지 않음)
  const load = useCallback(
    (id: number) => {
      const requestKey = cacheKey(id, mine);
      const fresh = freshRef.current.get(requestKey);
      if (fresh) return Promise.resolve(fresh);
      let request = requestsRef.current.get(requestKey);
      if (!request) {
        request = getPhotoDetail(id, mine);
        requestsRef.current.set(requestKey, request);
        request
          .then((detail) => {
            freshRef.current.set(requestKey, detail);
            setDetails((current) => new Map(current).set(requestKey, detail));
            setExpired((current) => {
              if (!current.has(requestKey)) return current;
              const next = new Set(current);
              next.delete(requestKey);
              return next;
            });
            // 만료되면 다시 쓰지 않음 (화면에 그리던 상세는 남겨 둠, 다음에 넘어올 때 버림)
            const timer = window.setTimeout(() => {
              timersRef.current.delete(timer);
              if (freshRef.current.get(requestKey) !== detail) return;
              freshRef.current.delete(requestKey);
              setExpired((current) => new Set(current).add(requestKey));
            }, detailTtl(detail));
            timersRef.current.add(timer);
          })
          .catch(() => {})
          .finally(() => requestsRef.current.delete(requestKey));
      }
      return request;
    },
    [mine],
  );

  // 지금 사진 상세 (만료돼 버린 뒤에도 다시 받도록 화면에 있는지를 같이 봄)
  const hasCurrent = details.has(key);
  useEffect(() => {
    if (hasCurrent) return;
    let cancelled = false;
    load(photoId).catch(() => {
      if (!cancelled) setFailedId(photoId);
    });
    return () => {
      cancelled = true;
    };
  }, [photoId, hasCurrent, load]);

  // 옆 사진 상세 미리 받기 (실패는 무시, 그 사진으로 넘기면 다시 받음)
  useEffect(() => {
    if (!preload) return;
    for (const id of [nextId, prevId]) {
      if (id !== undefined) load(id).catch(() => {});
    }
  }, [preload, prevId, nextId, load]);

  // 만료된 옆 사진 주소는 미리 받지 않음 (그 사진으로 넘기면 상세부터 다시 받음)
  const neighborUrl = (id: number | undefined) => {
    if (id === undefined) return null;
    const neighborKey = cacheKey(id, mine);
    return expired.has(neighborKey) ? null : (details.get(neighborKey)?.imageUrl ?? null);
  };
  const current = details.get(key) ?? null;
  const readyImageUrls = usePreloadedImages(
    preload ? (current?.imageUrl ?? null) : null,
    preload ? [neighborUrl(nextId), neighborUrl(prevId)] : [],
    preload && (current !== null || failedId === photoId),
  );

  return { photo: current, failed: failedId === photoId, readyImageUrls };
}

type PreloadEntry = {
  image: HTMLImageElement;
  done: Promise<void>;
  settle: () => void;
  loaded: boolean;
};

// 놓아주는 이미지 정리: 이벤트를 떼고 기다리는 쪽을 끝냄
// 아직 받는 중이면 src를 비워 받기를 멈춤 (원본이 커서 넘겨 버린 사진까지 끝까지 받지 않게)
// 다 받은 이미지는 브라우저 캐시에 남도록 src를 그대로 둠
function disposePreload(entry: PreloadEntry) {
  entry.image.onload = null;
  entry.image.onerror = null;
  if (!entry.loaded) entry.image.src = "";
  entry.settle();
}

// 원본 이미지를 화면에 붙이지 않고 미리 받아 둠. 다 받은 주소를 돌려줘 크게 보기가 페이드 없이 바로 보여 줌
// currentUrl을 다 받은(또는 실패한) 뒤에 neighborUrls를 받음. 지금·옆 사진이 아닌 이미지는 놓아줌
function usePreloadedImages(
  currentUrl: string | null,
  neighborUrls: (string | null)[],
  enabled: boolean,
) {
  // 받는 중이거나 받은 이미지 (Image를 잡아 둬야 받는 도중 정리되지 않음) → 다 받으면(실패해도) 끝나는 Promise
  const imagesRef = useRef(new Map<string, PreloadEntry>());
  const [readyUrls, setReadyUrls] = useState<ReadonlySet<string>>(() => new Set());
  const [firstNeighbor = null, secondNeighbor = null] = neighborUrls;

  // 놓아줄 이미지(지금·옆 사진이 아닌 주소)는 다 받았다고 보지 않음
  // 브라우저 캐시에서 빠졌을 수 있어서, 그 사진으로 돌아오면 다시 받는 동안 로딩으로 보이게 (아래 effect가 Image도 놓아줌)
  const keepUrls = [currentUrl, firstNeighbor, secondNeighbor];
  if ([...readyUrls].some((url) => !keepUrls.includes(url))) {
    setReadyUrls(new Set([...readyUrls].filter((url) => keepUrls.includes(url))));
  }

  // 같은 주소는 한 번만 받음 (effect가 다시 돌아도 Image·이벤트를 새로 만들지 않음)
  const preloadImage = useCallback((url: string) => {
    const existing = imagesRef.current.get(url);
    if (existing) return existing.done;
    const image = new Image();
    let settle = () => {};
    const done = new Promise<void>((resolve) => {
      settle = resolve;
    });
    const entry: PreloadEntry = { image, done, settle, loaded: false };
    image.onload = () => {
      entry.loaded = true;
      setReadyUrls((current) => (current.has(url) ? current : new Set(current).add(url)));
      settle();
    };
    image.onerror = () => settle();
    image.src = url;
    imagesRef.current.set(url, entry);
    return done;
  }, []);

  // 화면이 사라지면 받는 중인 이미지를 모두 멈춤
  useEffect(() => {
    const images = imagesRef.current;
    return () => {
      for (const entry of images.values()) disposePreload(entry);
      images.clear();
    };
  }, []);

  useEffect(() => {
    const keep = new Set([currentUrl, firstNeighbor, secondNeighbor]);
    for (const [url, entry] of imagesRef.current) {
      if (keep.has(url)) continue;
      disposePreload(entry);
      imagesRef.current.delete(url);
    }
    if (!enabled) return;

    let cancelled = false;
    (currentUrl ? preloadImage(currentUrl) : Promise.resolve()).then(() => {
      if (cancelled) return;
      for (const url of [firstNeighbor, secondNeighbor]) {
        if (url) void preloadImage(url);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, currentUrl, firstNeighbor, secondNeighbor, preloadImage]);

  return readyUrls;
}
