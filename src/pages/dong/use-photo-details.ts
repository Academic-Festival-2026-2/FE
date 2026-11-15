import { useCallback, useEffect, useRef, useState } from "react";
import { getPhotoDetail, type PhotoDetail } from "../../api/photo";

// 내 사진 상세(authRequest)와 공유 지도 상세(optionalAuthRequest)는 따로 기억
function cacheKey(photoId: number, mine: boolean) {
  return `${mine ? "mine" : "shared"}:${photoId}`;
}

// 사진 여러 장을 넘겨 보는 화면(동 화면 사진 카드, 좋아요한 사진 크게 보기)의 상세를 사진 번호별로 기억
// 한 번 받은 사진은 넘겼다 돌아와도 다시 받지 않음 (이 훅을 쓰는 컴포넌트가 사라지면 같이 지워짐)
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

  // 화면에 그릴 상세 (state) / 이미 받았거나 받는 중인지 확인용 (ref, effect 안에서만 읽음)
  const [details, setDetails] = useState<ReadonlyMap<string, PhotoDetail>>(new Map());
  const detailsRef = useRef(new Map<string, PhotoDetail>());
  const requestsRef = useRef(new Map<string, Promise<PhotoDetail>>());
  const [failedId, setFailedId] = useState<number | null>(null);

  // 다른 사진으로 넘기면 실패 표시를 지움 (실패한 사진으로 돌아오면 다시 받는 동안 로딩으로 보이게)
  const [shownId, setShownId] = useState(photoId);
  if (shownId !== photoId) {
    setShownId(photoId);
    setFailedId(null);
  }

  // 같은 사진을 받는 중이면 그 요청을 같이 씀 (미리 받는 중인 옆 사진으로 넘겨도 다시 보내지 않음)
  const load = useCallback(
    (id: number) => {
      const key = cacheKey(id, mine);
      const cached = detailsRef.current.get(key);
      if (cached) return Promise.resolve(cached);
      let request = requestsRef.current.get(key);
      if (!request) {
        request = getPhotoDetail(id, mine);
        requestsRef.current.set(key, request);
        request
          .then((detail) => {
            detailsRef.current.set(key, detail);
            setDetails((current) => new Map(current).set(key, detail));
          })
          .catch(() => {})
          .finally(() => requestsRef.current.delete(key));
      }
      return request;
    },
    [mine],
  );

  // 지금 사진 상세
  useEffect(() => {
    let cancelled = false;
    load(photoId).catch(() => {
      if (!cancelled) setFailedId(photoId);
    });
    return () => {
      cancelled = true;
    };
  }, [photoId, load]);

  // 옆 사진 상세 미리 받기 (실패는 무시, 그 사진으로 넘기면 다시 받음)
  useEffect(() => {
    if (!preload) return;
    for (const id of [nextId, prevId]) {
      if (id !== undefined) load(id).catch(() => {});
    }
  }, [preload, prevId, nextId, load]);

  const current = details.get(cacheKey(photoId, mine)) ?? null;
  const prevUrl = prevId === undefined ? null : details.get(cacheKey(prevId, mine))?.imageUrl;
  const nextUrl = nextId === undefined ? null : details.get(cacheKey(nextId, mine))?.imageUrl;
  const readyImageUrls = usePreloadedImages(
    preload ? (current?.imageUrl ?? null) : null,
    preload ? [nextUrl ?? null, prevUrl ?? null] : [],
    preload && (current !== null || failedId === photoId),
  );

  return { photo: current, failed: failedId === photoId, readyImageUrls };
}

// 원본 이미지를 화면에 붙이지 않고 미리 받아 둠. 다 받은 주소를 돌려줘 크게 보기가 페이드 없이 바로 보여 줌
// currentUrl을 다 받은(또는 실패한) 뒤에 neighborUrls를 받음. 지금·옆 사진이 아닌 이미지는 놓아줌
function usePreloadedImages(
  currentUrl: string | null,
  neighborUrls: (string | null)[],
  enabled: boolean,
) {
  const imagesRef = useRef(new Map<string, HTMLImageElement>());
  const [readyUrls, setReadyUrls] = useState<ReadonlySet<string>>(new Set());
  const [firstNeighbor = null, secondNeighbor = null] = neighborUrls;

  const preloadImage = useCallback((url: string) => {
    let image = imagesRef.current.get(url);
    if (!image) {
      image = new Image();
      image.src = url;
      imagesRef.current.set(url, image);
    }
    const target = image;
    return new Promise<void>((resolve) => {
      const markReady = () => {
        setReadyUrls((current) => (current.has(url) ? current : new Set(current).add(url)));
        resolve();
      };
      if (target.complete) {
        if (target.naturalWidth > 0) markReady();
        else resolve();
        return;
      }
      target.addEventListener("load", markReady, { once: true });
      target.addEventListener("error", () => resolve(), { once: true });
    });
  }, []);

  useEffect(() => {
    const keep = new Set([currentUrl, firstNeighbor, secondNeighbor]);
    for (const url of imagesRef.current.keys()) {
      if (!keep.has(url)) imagesRef.current.delete(url);
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
