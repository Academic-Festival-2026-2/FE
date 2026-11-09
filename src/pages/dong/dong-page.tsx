import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { getDongDetail, type DongPoint } from "../../api/dong";
import type { TimeBand } from "../../api/map";
import { getMyDongPhotos } from "../../api/mymap";
import { useAuthStore } from "../../stores/auth-store";
import {
  bandLabel,
  KAKAO_ERROR,
  KAKAO_UNAVAILABLE,
  PAGE_BG,
  toKakaoPath,
  useBoundaries,
  useDongColors,
  useMyMap,
} from "../map/map-data";
import { DongCard, ErrorBanner, TimeBandTabs } from "../map/map-ui";
import { PhotoCard } from "./photo-card";

const SELECTED_STROKE = "#1f1d1a";
const DONG_TINT_OPACITY = 0.14;

function signedArea(path: kakao.maps.LatLng[]) {
  let area = 0;
  for (let i = 0; i < path.length; i++) {
    const a = path[i];
    const b = path[(i + 1) % path.length];
    area += a.getLng() * b.getLat() - b.getLng() * a.getLat();
  }
  return area;
}

function pixelElement(color: string, count: number) {
  const pixel = document.createElement("div");
  pixel.className = "relative h-4 w-4 cursor-pointer rounded-[3px] border-2 border-white shadow";
  pixel.style.backgroundColor = color;
  if (count > 1) {
    const badge = document.createElement("span");
    badge.className =
      "absolute -top-2 -right-4 rounded-full bg-gray-900 px-1 text-[10px] leading-4 font-bold text-white";
    badge.textContent = `+${count - 1}`;
    pixel.appendChild(badge);
  }
  return pixel;
}

function useDongPoints(dongCode: string, timeBand: TimeBand, mine: boolean) {
  const key = `${dongCode}:${timeBand}:${mine ? "mine" : "shared"}`;
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
      .catch(() => {
        if (cancelled) return;
        setFailedKey(key);
      });
    return () => {
      cancelled = true;
    };
  }, [key, dongCode, timeBand, mine]);

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
  const { boundaries, error: boundaryError } = useBoundaries();
  const loggedIn = useAuthStore((state) => state.tokens !== null);
  const mine = mode === "mine" && loggedIn;
  const { dongs, error: colorError } = useDongColors(timeBand);
  const myMap = useMyMap(mine, timeBand);
  const { points, error: detailError } = useDongPoints(dongCode, timeBand, mine);
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [selected, setSelected] = useState<DongPoint[] | null>(null);

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
    const overlays: (kakao.maps.Polygon | kakao.maps.CustomOverlay)[] = [];

    kakao.maps.load(() => {
      if (cancelled || !containerRef.current) return;

      const map = new kakao.maps.Map(containerRef.current, {
        center: new kakao.maps.LatLng(37.5035, 126.766),
        level: 5,
      });

      map.setMaxLevel(8);

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

      map.setBounds(bounds, 40, 40, 40, 40);
      setMap(map);
    });

    return () => {
      cancelled = true;
      overlays.forEach((overlay) => overlay.setMap(null));
      outlinePolygonsRef.current = [];
    };
  }, [boundaries, feature]);

  useEffect(() => {
    if (!map || !points) return;

    const groups = new Map<string, DongPoint[]>();
    for (const point of points) {
      if (point.lat === null || point.lng === null) continue;
      const key = `${point.lat},${point.lng}`;
      groups.set(key, [...(groups.get(key) ?? []), point]);
    }

    const pixels = [...groups.values()].map((group) => {
      const content = pixelElement(group[0].color, group.length);
      content.addEventListener("click", () => setSelected(group));
      return new kakao.maps.CustomOverlay({
        map,
        position: new kakao.maps.LatLng(group[0].lat as number, group[0].lng as number),
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

  const notFound = boundaries !== null && !feature;

  return (
    <div className="relative h-screen w-full">
      <div ref={containerRef} className="h-full w-full" />

      <div className="absolute left-4 top-4 z-10 flex flex-col items-start gap-3">
        <div className="rounded-2xl bg-white/90 px-5 py-4 shadow">
          <p className="text-sm text-gray-500">
            <Link to="/map" search={{ timeBand, mode }} className="hover:text-gray-900">
              ← 부천시
            </Link>
            {feature && <span> / {feature.properties.guName}</span>}
          </p>
          {feature && (
            <h1 className="mt-1 text-2xl font-extrabold text-gray-900">
              {feature.properties.name}의 {mine ? "내 " : ""}
              {bandLabel(timeBand)}
            </h1>
          )}
          {dong && (
            <p className="mt-1 text-sm text-gray-500">
              {mine ? "내 사진" : "가을 · 사진"} {dong.photoCount}장
            </p>
          )}
          {mine && unlocated.length > 0 && (
            <button
              type="button"
              onClick={() => setSelected(unlocated)}
              className="mt-2 text-sm font-bold text-[#b5470e] underline underline-offset-4"
            >
              위치 없는 사진 {unlocated.length}장 보기
            </button>
          )}
        </div>
        <TimeBandTabs value={timeBand} onChange={changeTimeBand} />
      </div>

      <div className="absolute bottom-6 left-4 z-10">
        <DongCard dong={dong} />
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
      <div className="absolute bottom-6 right-4 z-10">
        <ErrorBanner
          message={
            KAKAO_UNAVAILABLE
              ? KAKAO_ERROR
              : notFound
                ? "없는 동이에요."
                : (boundaryError ?? colorError ?? detailError)
          }
        />
      </div>
    </div>
  );
}
