import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams, useRouter, useSearch } from "@tanstack/react-router";
import { getDongDetail, type DongPoint } from "../../api/dong";
import type { TimeBand } from "../../api/map";
import { getMyDongPhotos } from "../../api/mymap";
import { isSessionExpired, useExpireSession } from "../../hooks/use-expire-session";
import { useAuthStore } from "../../stores/auth-store";
import {
  bandLabel,
  EMPTY_FILL,
  KAKAO_ERROR,
  KAKAO_UNAVAILABLE,
  MASK_FRAME_POINTS,
  PAGE_BG,
  seasonOf,
  useRegionList,
  STATUS_LABEL,
  toKakaoPath,
  useBoundaries,
  useDongColors,
  useMyMap,
} from "../map/map-data";
import { ErrorBanner, GLASS, TimeBandBar } from "../map/map-ui";
import { cn } from "../../utils/cn";
import { DONG_FIT_PADDING, DONG_MAX_LEVEL } from "../map/kakao-fit";
import { MapLoading } from "../map/map-loading";
import { canUseDongTransition, markReturnFrom, prepareDongTransition } from "../../utils/view-transition";
import { PhotoCard } from "./photo-card";
import { labelPoint } from "../map/map-geometry";

const SELECTED_STROKE = "#1a1a1a";
const DONG_TINT_OPACITY = 0.14;
// 지도 화면(svg-map)의 확대·축소 버튼과 같은 모양
const ZOOM_BUTTON =
  "grid size-8 place-items-center rounded-lg text-ink-sub transition-colors hover:bg-white/60 hover:text-ink";

function signedArea(path: kakao.maps.LatLng[]) {
  let area = 0;
  for (let i = 0; i < path.length; i++) {
    const a = path[i];
    const b = path[(i + 1) % path.length];
    area += a.getLng() * b.getLat() - b.getLng() * a.getLat();
  }
  return area;
}

type LocatedPoint = DongPoint & { lat: number; lng: number };
// 고른 사진 묶음. anchor가 있으면 데스크톱에서 그 픽셀 위에 말풍선으로 띄움 (위치 없는 사진은 null)
type Selection = { points: DongPoint[]; anchor: { key: string; lat: number; lng: number } | null };

// 말풍선을 픽셀에서 오른쪽 위로 띄우는 거리 (말풍선 왼쪽 아래 모서리 기준, px)
const BUBBLE_OFFSET = 28;

// 고른 픽셀 강조 (조금 크게 + 남색 테두리)
const PIXEL_SELECTED = ["scale-150", "ring-2", "ring-navy", "z-10"];

// 데스크톱(sm 이상)인지. 말풍선은 데스크톱에서만, 모바일은 아래 카드
const DESKTOP_QUERY = "(min-width: 640px)";
function subscribeDesktop(onChange: () => void) {
  const media = window.matchMedia(DESKTOP_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
function useIsDesktop() {
  return useSyncExternalStore(subscribeDesktop, () => window.matchMedia(DESKTOP_QUERY).matches);
}

function pixelElement(color: string, count: number) {
  const pixel = document.createElement("div");
  pixel.className =
    "relative h-4 w-4 cursor-pointer rounded-[3px] border-2 border-white shadow transition-transform";
  pixel.style.backgroundColor = color;
  if (count > 1) {
    const badge = document.createElement("span");
    badge.className =
      "absolute -top-2 -right-4 rounded-full bg-navy px-1 text-[10px] leading-4 font-bold text-white";
    badge.textContent = `+${count - 1}`;
    pixel.appendChild(badge);
  }
  return pixel;
}

function useDongPoints(dongCode: string, timeBand: TimeBand, mine: boolean) {
  const key = `${dongCode}:${timeBand}:${mine ? "mine" : "shared"}`;
  const expireSession = useExpireSession();
  const [loaded, setLoaded] = useState<{ key: string; points: DongPoint[] } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const request = mine ? getMyDongPhotos(dongCode, timeBand) : getDongDetail(dongCode, timeBand);
    request
      .then((data) => {
        if (cancelled) return;
        setLoaded({ key, points: data.points });
      })
      .catch((err) => {
        if (cancelled) return;
        if (isSessionExpired(err)) expireSession();
        else setFailedKey(key);
      });
    return () => {
      cancelled = true;
    };
  }, [key, dongCode, timeBand, mine, expireSession]);

  return {
    points: loaded && loaded.key === key ? loaded.points : null,
    error: failedKey === key ? "동 정보를 불러오지 못했어요." : null,
  };
}

export function DongPage() {
  const { dongCode } = useParams({ from: "/dong/$dongCode" });
  const { timeBand, mode } = useSearch({ from: "/dong/$dongCode" });
  // 지역 코드 = 동 코드 앞 4자리 (부천 3105)
  const regionCode = dongCode.slice(0, 4);
  const regionCodes = useMemo(() => [regionCode], [regionCode]);
  const { regionList } = useRegionList();
  const regionName = regionList?.regions.find((r) => r.regionCode === regionCode)?.name ?? "";
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const { boundaries, error: boundaryError } = useBoundaries(regionCode);
  const loggedIn = useAuthStore((state) => state.tokens !== null);
  const mine = mode === "mine" && loggedIn;
  const { dongs, season, error: colorError } = useDongColors(timeBand, regionCodes);
  const seasonName = seasonOf(season)?.name;
  const myMap = useMyMap(mine, timeBand, regionCodes);
  const { points, error: detailError } = useDongPoints(dongCode, timeBand, mine);
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  // 카카오맵 타일이 처음 다 그려진 동 (그 전까지 로딩 안내 표시)
  const [tilesReadyFor, setTilesReadyFor] = useState<string | null>(null);
  // "전체" 버튼으로 처음 보던 범위(동 전체)로 되돌릴 때 씀
  const dongBoundsRef = useRef<kakao.maps.LatLngBounds | null>(null);
  const [selected, setSelected] = useState<Selection | null>(null);
  const isDesktop = useIsDesktop();
  // 지도에 찍은 픽셀 요소 (위치 키 → 요소). 고른 픽셀 강조용
  const pixelElementsRef = useRef(new Map<string, HTMLElement>());

  // 지도로 이동이 시작될 때 어느 동이었는지 기억 → 지도가 이 동에서 줄어들며 시작 (링크·뒤로 가기 모두).
  // 화면이 사라질 때(언마운트) 기록하면 지도 화면이 먼저 그려진 뒤라 늦어서, 이동 시작 이벤트에서 기록함
  const router = useRouter();
  useEffect(
    () =>
      router.subscribe("onBeforeNavigate", (event) => {
        if (event.toLocation.pathname === "/map") markReturnFrom(dongCode);
      }),
    [router, dongCode],
  );

  const feature = boundaries?.features.find((item) => item.properties.dongCode === dongCode);
  const dong = (mine ? myMap.dongs : dongs).get(dongCode);
  const unlocated = (points ?? []).filter((point) => point.lat === null || point.lng === null);
  const outlinePolygonsRef = useRef<kakao.maps.Polygon[]>([]);
  const tintRef = useRef<string | null>(null);
  const tint = dong?.dominantColor ?? null;

  useEffect(() => {
    tintRef.current = tint;
    outlinePolygonsRef.current.forEach((polygon) =>
      polygon.setOptions({ fillColor: tint ?? PAGE_BG, fillOpacity: tint ? DONG_TINT_OPACITY : 0 }),
    );
  }, [tint]);

  useEffect(() => {
    if (!boundaries || !feature || KAKAO_UNAVAILABLE) return;
    let cancelled = false;
    let removeMapListeners = () => {};
    const overlays: (kakao.maps.Polygon | kakao.maps.CustomOverlay)[] = [];

    kakao.maps.load(() => {
      if (cancelled || !containerRef.current) return;

      const [centerLng, centerLat] = labelPoint(feature);
      const map = new kakao.maps.Map(containerRef.current, {
        center: new kakao.maps.LatLng(centerLat, centerLng),
        level: 5,
      });

      // 지도 화면의 확대 전환이 이 값을 기준으로 계산함 (kakao-fit.ts)
      map.setMaxLevel(DONG_MAX_LEVEL);
      // 지도 빈 곳을 누르면 사진 말풍선·카드 닫기 (픽셀·말풍선은 clickable이라 여기로 안 옴)
      kakao.maps.event.addListener(map, "click", () => setSelected(null));

      const bounds = new kakao.maps.LatLngBounds();
      const outlines = feature.geometry.coordinates.map((rings) => toKakaoPath(rings)[0]);
      outlines.forEach((outline) => outline.forEach((point) => bounds.extend(point)));

      // 동 바깥 덮개 사각형 (map-data.ts, 업로드 위치 선택 창과 같은 값)
      const frame = MASK_FRAME_POINTS.map(([lat, lng]) => new kakao.maps.LatLng(lat, lng));
      const frameSign = Math.sign(signedArea(frame));
      const holes = outlines.map((outline) =>
        Math.sign(signedArea(outline)) === frameSign ? [...outline].reverse() : outline,
      );

      overlays.push(
        new kakao.maps.Polygon({
          map,
          path: [frame, ...holes],
          strokeWeight: 0,
          fillColor: PAGE_BG,
          fillOpacity: 0.7,
          zIndex: 1,
        }),
      );

      for (const outline of outlines) {
        const polygon = new kakao.maps.Polygon({
          map,
          path: outline,
          strokeWeight: 2,
          strokeColor: SELECTED_STROKE,
          strokeOpacity: 0.6,
          fillColor: tintRef.current ?? PAGE_BG,
          fillOpacity: tintRef.current ? DONG_TINT_OPACITY : 0,
          zIndex: 2,
        });
        overlays.push(polygon);
        outlinePolygonsRef.current.push(polygon);
      }

      map.setBounds(bounds, DONG_FIT_PADDING, DONG_FIT_PADDING, DONG_FIT_PADDING, DONG_FIT_PADDING);
      dongBoundsRef.current = bounds;

      // 지도 타일이 처음 다 그려지면 로딩 안내를 내림
      const handleTilesLoaded = () => {
        setTilesReadyFor(feature.properties.dongCode);
        kakao.maps.event.removeListener(map, "tilesloaded", handleTilesLoaded);
      };
      kakao.maps.event.addListener(map, "tilesloaded", handleTilesLoaded);
      removeMapListeners = () =>
        kakao.maps.event.removeListener(map, "tilesloaded", handleTilesLoaded);

      setMap(map);
    });

    return () => {
      cancelled = true;
      removeMapListeners();
      overlays.forEach((overlay) => overlay.setMap(null));
      outlinePolygonsRef.current = [];
    };
  }, [boundaries, feature]);

  useEffect(() => {
    if (!map || !points) return;

    const located = points.filter(
      (point): point is LocatedPoint => point.lat !== null && point.lng !== null,
    );
    const groups = new Map<string, LocatedPoint[]>();
    for (const point of located) {
      const key = `${point.lat},${point.lng}`;
      groups.set(key, [...(groups.get(key) ?? []), point]);
    }

    const elements = pixelElementsRef.current;
    const pixels = [...groups.entries()].map(([key, group]) => {
      const content = pixelElement(group[0].color, group.length);
      elements.set(key, content);
      content.addEventListener("click", () =>
        setSelected({ points: group, anchor: { key, lat: group[0].lat, lng: group[0].lng } }),
      );
      return new kakao.maps.CustomOverlay({
        map,
        position: new kakao.maps.LatLng(group[0].lat, group[0].lng),
        content,
        clickable: true,
        zIndex: 3,
      });
    });

    return () => {
      pixels.forEach((pixel) => pixel.setMap(null));
      elements.clear();
    };
  }, [map, points]);

  // 고른 픽셀 강조
  const selectedKey = selected?.anchor?.key ?? null;
  useEffect(() => {
    if (!selectedKey) return;
    const element = pixelElementsRef.current.get(selectedKey);
    element?.classList.add(...PIXEL_SELECTED);
    return () => element?.classList.remove(...PIXEL_SELECTED);
  }, [selectedKey, points]);

  // 데스크톱: 고른 픽셀 위에 말풍선 (카카오 CustomOverlay 안에 React로 그림)
  const anchor = isDesktop ? (selected?.anchor ?? null) : null;
  // 카카오 오버레이는 처음 크기로만 위치를 잡아서, 크기 0인 점(host)을 픽셀에 놓고
  // 그 안에서 말풍선(inner)을 픽셀 오른쪽 위로 펼침 → 사진을 받아 커져도 항상 같은 자리
  const bubble = useMemo(() => {
    if (!anchor) return null;
    const host = document.createElement("div");
    host.style.position = "relative";
    const inner = document.createElement("div");
    inner.style.cssText = `position:absolute;left:${BUBBLE_OFFSET}px;bottom:${BUBBLE_OFFSET}px`;
    host.appendChild(inner);
    return { host, inner };
  }, [anchor]);
  const bubbleHost = bubble?.inner ?? null;

  useEffect(() => {
    if (!map || !anchor || !bubble) return;
    const overlay = new kakao.maps.CustomOverlay({
      map,
      position: new kakao.maps.LatLng(anchor.lat, anchor.lng),
      content: bubble.host,
      clickable: true,
      zIndex: 10,
    });
    const bubbleHost = bubble.inner;

    // 말풍선이 화면 밖으로 나가면 지도를 그만큼 옮김 (사진을 다 받아 크기가 바뀔 때도 다시 확인)
    // 열림 애니메이션(크기 변화) 중에도 흔들리지 않게 화면상 크기 대신 실제 레이아웃 크기로 계산
    const fit = () => {
      const container = containerRef.current;
      if (!container) return;
      const point = map
        .getProjection()
        .containerPointFromCoords(new kakao.maps.LatLng(anchor.lat, anchor.lng));
      const width = bubbleHost.offsetWidth;
      const height = bubbleHost.offsetHeight;
      const top = point.y - BUBBLE_OFFSET - height;
      const left = point.x + BUBBLE_OFFSET;
      const margin = 16;
      let dx = 0;
      let dy = 0;
      if (top < margin) dy = top - margin;
      else if (point.y > container.clientHeight - margin) dy = point.y - (container.clientHeight - margin);
      if (left < margin) dx = left - margin;
      else if (left + width > container.clientWidth - margin)
        dx = left + width - (container.clientWidth - margin);
      if (dx || dy) map.panBy(Math.round(dx), Math.round(dy));
    };
    const observer = new ResizeObserver(fit);
    observer.observe(bubbleHost);

    return () => {
      observer.disconnect();
      overlay.setMap(null);
    };
  }, [map, anchor, bubble]);

  function changeTimeBand(value: TimeBand) {
    setSelected(null);
    navigate({
      to: "/dong/$dongCode",
      params: { dongCode },
      search: (prev) => ({ ...prev, timeBand: value }),
      replace: true,
    });
  }

  // 카카오 지도 레벨은 숫자가 작을수록 확대 (최대 축소는 DONG_MAX_LEVEL)
  function zoomBy(delta: number) {
    if (!map) return;
    map.setLevel(Math.min(DONG_MAX_LEVEL, Math.max(1, map.getLevel() + delta)), { animate: true });
  }

  function resetView() {
    if (map && dongBoundsRef.current) map.setBounds(dongBoundsRef.current, DONG_FIT_PADDING, DONG_FIT_PADDING, DONG_FIT_PADDING, DONG_FIT_PADDING);
  }

  const notFound = boundaries !== null && !feature;
  const errorMessage = KAKAO_UNAVAILABLE
    ? KAKAO_ERROR
    : notFound
      ? "없는 동이에요."
      : (boundaryError ?? (mine ? myMap.error : colorError) ?? detailError);
  const statusLabel = dong ? STATUS_LABEL[dong.status] : "";

  return (
    <div className="relative h-screen w-full">
      <div
        ref={containerRef}
        className="h-full w-full [&_svg]:pointer-events-none"
      />
      {/* 지도(경계·카카오맵 타일)를 그리는 중. 오류가 있으면 오류 배너만 */}
      <MapLoading show={!errorMessage && tilesReadyFor !== dongCode} />

      {/* 지도 화면과 같은 유리 패널. 제목은 공유·나의 지도 같게 ("역곡3동의 새벽") */}
      {/* 왼쪽 위: 제목 패널 + 그 아래 에러 배너 (오른쪽 아래 확대 버튼을 가리지 않게) */}
      <div className="absolute top-4 left-4 z-10 flex max-w-[calc(100%-2rem)] flex-col items-start gap-2">
        <div className={cn(GLASS, "rounded-[14px] px-4 py-2.5")}>
          <p className="text-xs leading-[18px] text-ink-muted">
            <Link
              to="/map"
              search={{ timeBand, mode, region: Number(regionCode) }}
              // 지도가 이 동에서 줄어들며 시작 (뒤로 가기도 같음: 아래 markReturnFrom)
              viewTransition={canUseDongTransition()}
              onClick={() => prepareDongTransition()}
              className="hover:text-ink"
            >
              ← {regionName || "지도"}
            </Link>
            {feature?.properties.guName && <span> / {feature.properties.guName}</span>}
          </p>
          {feature && (
            <h1 className="mt-0.5 text-[22px] leading-8 font-extrabold tracking-[-0.66px] text-ink">
              {feature.properties.name}의 {bandLabel(timeBand)}
            </h1>
          )}
          {dong && (
            <p className="mt-0.5 flex items-center gap-1.5 text-xs leading-[18px] text-ink-muted">
              {/* 이 동·시간대 대표색 (없으면 지도 빈 동 회색) */}
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-[3px] border border-white/80 shadow-[0_0_0_1px_rgba(26,36,64,0.12)]"
                style={{ backgroundColor: dong.dominantColor ?? EMPTY_FILL }}
              />
              <span>
                {mine ? "내 사진" : seasonName ? `${seasonName} · 사진` : "사진"}{" "}
                <b className="text-ink">{dong.photoCount}</b>장
                {statusLabel && ` · ${statusLabel}`}
              </span>
            </p>
          )}
          {mine && unlocated.length > 0 && (
            <button
              type="button"
              onClick={() => setSelected({ points: unlocated, anchor: null })}
              className="mt-1.5 text-xs font-bold text-brand-strong underline underline-offset-4"
            >
              위치 없는 사진 {unlocated.length}장 보기
            </button>
          )}
        </div>
        <ErrorBanner message={errorMessage} />
      </div>

      {/* 지도 화면과 같은 계절 + 시간대 바 (아래 가운데) */}
      <div className="absolute bottom-6 left-1/2 z-10 w-max -translate-x-1/2">
        <TimeBandBar season={season} timeBand={timeBand} onChange={changeTimeBand} />
      </div>

      {selected &&
        (bubbleHost ? (
          // 데스크톱 + 위치 있는 사진: 픽셀 위 말풍선
          createPortal(
            <PhotoCard
              key={selected.points[0].photoId}
              points={selected.points}
              mine={mine}
              variant="bubble"
              onClose={() => setSelected(null)}
            />,
            bubbleHost,
          )
        ) : (
          // 모바일, 또는 위치 없는 사진: 화면에 고정된 카드
          <div className="absolute inset-x-4 bottom-4 z-20 sm:inset-x-auto sm:top-4 sm:right-4 sm:bottom-auto">
            <PhotoCard
              key={selected.points[0].photoId}
              points={selected.points}
              mine={mine}
              onClose={() => setSelected(null)}
            />
          </div>
        ))}
      {/* 확대·축소 (지도 화면과 같은 유리 버튼). 터치 기기는 두 손가락으로 확대하므로 숨김 */}
      {map && (
        <div className="liquid-glass absolute right-4 bottom-6 z-10 flex flex-col gap-0.5 rounded-xl p-1 pointer-coarse:hidden">
          <button
            type="button"
            aria-label="확대"
            onClick={() => zoomBy(-1)}
            className={`${ZOOM_BUTTON} text-lg leading-none`}
          >
            +
          </button>
          <button
            type="button"
            aria-label="축소"
            onClick={() => zoomBy(1)}
            className={`${ZOOM_BUTTON} text-lg leading-none`}
          >
            −
          </button>
          <button
            type="button"
            aria-label="동 전체 보기"
            onClick={resetView}
            className={`${ZOOM_BUTTON} text-[11px] font-bold`}
          >
            전체
          </button>
        </div>
      )}
    </div>
  );
}
