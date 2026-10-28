import { useEffect, useRef } from "react";
import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import type { TimeBand } from "../../api/map";
import {
  KAKAO_ERROR,
  KAKAO_UNAVAILABLE,
  PAGE_BG,
  toKakaoPath,
  useBoundaries,
  useDongColors,
} from "../map/map-data";
import { DongCard, ErrorBanner, TimeBandBar } from "../map/map-ui";

const TIME_BAND_LABEL: Record<TimeBand, string> = {
  DAWN: "새벽",
  DAY: "낮",
  SUNSET: "노을",
  NIGHT: "밤",
};

const SELECTED_STROKE = "#1f1d1a";

function signedArea(path: kakao.maps.LatLng[]) {
  let area = 0;
  for (let i = 0; i < path.length; i++) {
    const a = path[i];
    const b = path[(i + 1) % path.length];
    area += a.getLng() * b.getLat() - b.getLng() * a.getLat();
  }
  return area;
}

export function DongPage() {
  const { dongCode } = useParams({ from: "/dong/$dongCode" });
  const { timeBand } = useSearch({ from: "/dong/$dongCode" });
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const { boundaries, error: boundaryError } = useBoundaries();
  const { dongs, error: colorError } = useDongColors(timeBand);

  const feature = boundaries?.features.find((item) => item.properties.dongCode === dongCode);
  const dong = dongs.get(dongCode);

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
          fillOpacity: 1,
          zIndex: 1,
        }),
      );

      for (const outline of outlines) {
        overlays.push(
          new kakao.maps.Polygon({
            map,
            path: outline,
            strokeWeight: 3,
            strokeColor: SELECTED_STROKE,
            strokeOpacity: 1,
            fillOpacity: 0,
            zIndex: 2,
          }),
        );
      }

      map.setBounds(bounds, 40, 40, 40, 40);
    });

    return () => {
      cancelled = true;
      overlays.forEach((overlay) => overlay.setMap(null));
    };
  }, [boundaries, feature]);

  function changeTimeBand(value: TimeBand) {
    navigate({
      to: "/dong/$dongCode",
      params: { dongCode },
      search: { timeBand: value },
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
            <Link to="/map" search={{ timeBand }} className="hover:text-gray-900">
              ← 부천시
            </Link>
            {feature && <span> / {feature.properties.guName}</span>}
          </p>
          {feature && (
            <h1 className="mt-1 text-2xl font-extrabold text-gray-900">
              {feature.properties.name}의 {TIME_BAND_LABEL[timeBand]}
            </h1>
          )}
          {dong && (
            <p className="mt-1 text-sm text-gray-500">가을 · 사진 {dong.photoCount}장</p>
          )}
        </div>
        <TimeBandBar value={timeBand} onChange={changeTimeBand} />
      </div>

      <div className="absolute bottom-6 left-4 z-10">
        <DongCard dong={dong} />
      </div>
      <div className="absolute bottom-6 right-4 z-10">
        <ErrorBanner
          message={
            KAKAO_UNAVAILABLE
              ? KAKAO_ERROR
              : notFound
                ? "없는 동이에요."
                : (boundaryError ?? colorError)
          }
        />
      </div>
    </div>
  );
}
