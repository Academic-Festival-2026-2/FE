import { useEffect, useRef, useState } from "react";
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
  PAGE_BG,
  REGION_NAME,
  seasonOf,
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

function pixelElement(color: string, count: number) {
  const pixel = document.createElement("div");
  pixel.className = "relative h-4 w-4 cursor-pointer rounded-[3px] border-2 border-white shadow";
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
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  // 동 경계 밖만 더 흐리게 하는 레이어 (동 모양으로 구멍을 뚫은 마스크를 지도 이동·확대에 맞춰 갱신)
  const outsideBlurRef = useRef<HTMLDivElement>(null);
  const { boundaries, error: boundaryError } = useBoundaries();
  const loggedIn = useAuthStore((state) => state.tokens !== null);
  const mine = mode === "mine" && loggedIn;
  const { dongs, season, error: colorError } = useDongColors(timeBand);
  const seasonName = seasonOf(season)?.name;
  const myMap = useMyMap(mine, timeBand);
  const { points, error: detailError } = useDongPoints(dongCode, timeBand, mine);
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  // 카카오맵 타일이 처음 다 그려진 동 (그 전까지 로딩 안내 표시)
  const [tilesReadyFor, setTilesReadyFor] = useState<string | null>(null);
  // "전체" 버튼으로 처음 보던 범위(동 전체)로 되돌릴 때 씀
  const dongBoundsRef = useRef<kakao.maps.LatLngBounds | null>(null);
  const [selected, setSelected] = useState<DongPoint[] | null>(null);

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
    let removeMaskListeners = () => {};
    const overlays: (kakao.maps.Polygon | kakao.maps.CustomOverlay)[] = [];

    kakao.maps.load(() => {
      if (cancelled || !containerRef.current) return;

      const map = new kakao.maps.Map(containerRef.current, {
        center: new kakao.maps.LatLng(37.5035, 126.766),
        level: 5,
      });

      // 지도 화면의 확대 전환이 이 값을 기준으로 계산함 (kakao-fit.ts)
      map.setMaxLevel(DONG_MAX_LEVEL);

      const bounds = new kakao.maps.LatLngBounds();
      const outlines = feature.geometry.coordinates.map((rings) => toKakaoPath(rings)[0]);
      outlines.forEach((outline) => outline.forEach((point) => bounds.extend(point)));

      const frame = [
        new kakao.maps.LatLng(36.8, 126.0),
        new kakao.maps.LatLng(36.8, 127.5),
        new kakao.maps.LatLng(38.2, 127.5),
        new kakao.maps.LatLng(38.2, 126.0),
      ];
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

      // 경계 밖 흐림 레이어 마스크: 화면 전체에서 동 모양만 뺀 영역 (동 안은 흐리지 않음)
      const updateOutsideMask = () => {
        const layer = outsideBlurRef.current;
        const container = containerRef.current;
        if (!layer || !container) return;
        const projection = map.getProjection();
        const width = container.clientWidth;
        const height = container.clientHeight;
        const holes = outlines
          .map(
            (outline) =>
              "M" +
              outline
                .map((latLng) => {
                  const point = projection.containerPointFromCoords(latLng);
                  return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
                })
                .join("L") +
              "Z",
          )
          .join("");
        // 왼쪽 아래 카카오 로고·축척 자리도 비워 둠 (카카오맵 이용 조건상 로고는 가리지 않음)
        const logoHole = `M0,${height - 36}H160V${height}H0Z`;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><path fill-rule="evenodd" fill="black" d="M0,0H${width}V${height}H0Z${holes}${logoHole}"/></svg>`;
        const mask = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
        layer.style.maskImage = mask;
        layer.style.webkitMaskImage = mask;
      };
      const maskEvents = ["bounds_changed", "drag", "zoom_changed", "idle"];
      maskEvents.forEach((name) => kakao.maps.event.addListener(map, name, updateOutsideMask));
      removeMaskListeners = () =>
        maskEvents.forEach((name) => kakao.maps.event.removeListener(map, name, updateOutsideMask));
      updateOutsideMask();

      // 지도 타일이 처음 다 그려지면 로딩 안내를 내림
      const handleTilesLoaded = () => {
        setTilesReadyFor(feature.properties.dongCode);
        kakao.maps.event.removeListener(map, "tilesloaded", handleTilesLoaded);
      };
      kakao.maps.event.addListener(map, "tilesloaded", handleTilesLoaded);
      const prevRemove = removeMaskListeners;
      removeMaskListeners = () => {
        prevRemove();
        kakao.maps.event.removeListener(map, "tilesloaded", handleTilesLoaded);
      };

      setMap(map);
    });

    return () => {
      cancelled = true;
      removeMaskListeners();
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

    const pixels = [...groups.values()].map((group) => {
      const content = pixelElement(group[0].color, group.length);
      content.addEventListener("click", () => setSelected(group));
      return new kakao.maps.CustomOverlay({
        map,
        position: new kakao.maps.LatLng(group[0].lat, group[0].lng),
        content,
        clickable: true,
        zIndex: 3,
      });
    });

    return () => pixels.forEach((pixel) => pixel.setMap(null));
  }, [map, points]);

  function changeTimeBand(value: TimeBand) {
    setSelected(null);
    navigate({
      to: "/dong/$dongCode",
      params: { dongCode },
      search: (prev) => ({ ...prev, timeBand: value }),
      replace: true,
    });
  }

  // 카카오 지도 레벨은 숫자가 작을수록 확대 (최대 축소는 setMaxLevel(8))
  function zoomBy(delta: number) {
    if (!map) return;
    map.setLevel(Math.min(8, Math.max(1, map.getLevel() + delta)), { animate: true });
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
      {/* 동 경계 밖만 아주 살짝(1px) 흐리게 (마스크는 지도 이벤트에서 갱신) */}
      <div
        ref={outsideBlurRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] backdrop-blur-[1px] [mask-size:100%_100%] [-webkit-mask-size:100%_100%]"
      />

      {/* 지도 화면과 같은 유리 패널. 제목은 공유·내 지도 같게 ("역곡3동의 새벽") */}
      {/* 왼쪽 위: 제목 패널 + 그 아래 에러 배너 (오른쪽 아래 확대 버튼을 가리지 않게) */}
      <div className="absolute top-4 left-4 z-10 flex max-w-[calc(100%-2rem)] flex-col items-start gap-2">
        <div className={cn(GLASS, "rounded-[14px] px-4 py-2.5")}>
          <p className="text-xs leading-[18px] text-ink-muted">
            <Link
              to="/map"
              search={{ timeBand, mode }}
              // 지도가 이 동에서 줄어들며 시작 (뒤로 가기도 같음: 아래 markReturnFrom)
              viewTransition={canUseDongTransition()}
              onClick={() => prepareDongTransition()}
              className="hover:text-ink"
            >
              ← {REGION_NAME}시
            </Link>
            {feature && <span> / {feature.properties.guName}</span>}
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
              onClick={() => setSelected(unlocated)}
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

      {selected && (
        <div className="absolute inset-x-4 bottom-4 z-20 sm:inset-x-auto sm:top-4 sm:right-4 sm:bottom-auto">
          <PhotoCard
            key={selected[0].photoId}
            points={selected}
            mine={mine}
            onClose={() => setSelected(null)}
          />
        </div>
      )}
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
