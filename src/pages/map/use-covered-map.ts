import { useEffect, useRef, useState, type RefObject } from "react";
import type { Boundaries, DongColor } from "../../api/map";
import { EMPTY_FILL, KAKAO_UNAVAILABLE, PAGE_BG, labelPoint, toKakaoPath } from "./map-data";

type Handlers = {
  onHover: (dongCode: string | null) => void;
  onSelect: (dongCode: string) => void;
};

export function useCoveredMap(
  containerRef: RefObject<HTMLDivElement | null>,
  boundaries: Boundaries | null,
  dongs: Map<string, DongColor>,
  handlers: Handlers,
) {
  const polygonsRef = useRef(new Map<string, kakao.maps.Polygon[]>());
  const handlersRef = useRef(handlers);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!boundaries || KAKAO_UNAVAILABLE) return;
    let cancelled = false;
    const polygons = polygonsRef.current;
    const overlays: (kakao.maps.Polygon | kakao.maps.CustomOverlay)[] = [];

    kakao.maps.load(() => {
      if (cancelled || !containerRef.current) return;

      const map = new kakao.maps.Map(containerRef.current, {
        center: new kakao.maps.LatLng(37.5035, 126.766),
        level: 8,
      });
      map.setMaxLevel(9);

      overlays.push(
        new kakao.maps.Polygon({
          map,
          path: [
            new kakao.maps.LatLng(36.8, 126.0),
            new kakao.maps.LatLng(36.8, 127.5),
            new kakao.maps.LatLng(38.2, 127.5),
            new kakao.maps.LatLng(38.2, 126.0),
          ],
          strokeWeight: 0,
          fillColor: PAGE_BG,
          fillOpacity: 1,
          zIndex: 0,
        }),
      );

      const bounds = new kakao.maps.LatLngBounds();
      for (const feature of boundaries.features) {
        const { dongCode, name } = feature.properties;

        const dongPolygons = feature.geometry.coordinates.map((rings) => {
          const path = toKakaoPath(rings);
          path[0].forEach((point) => bounds.extend(point));

          const polygon = new kakao.maps.Polygon({
            map,
            path,
            strokeWeight: 1.5,
            strokeColor: "#ffffff",
            strokeOpacity: 1,
            fillColor: EMPTY_FILL,
            fillOpacity: 1,
            zIndex: 1,
          });
          kakao.maps.event.addListener(polygon, "mouseover", () =>
            handlersRef.current.onHover(dongCode),
          );
          kakao.maps.event.addListener(polygon, "mouseout", () => handlersRef.current.onHover(null));
          kakao.maps.event.addListener(polygon, "click", () =>
            handlersRef.current.onSelect(dongCode),
          );
          return polygon;
        });
        polygons.set(dongCode, dongPolygons);

        const label = document.createElement("div");
        label.textContent = name;
        label.style.cssText =
          "font-size:11px;font-weight:700;white-space:nowrap;cursor:pointer;" +
          "color:#3d3830;text-shadow:0 0 3px #fff,0 0 3px #fff;";
        label.addEventListener("mouseenter", () => handlersRef.current.onHover(dongCode));
        label.addEventListener("mouseleave", () => handlersRef.current.onHover(null));
        label.addEventListener("click", () => handlersRef.current.onSelect(dongCode));
        const [lng, lat] = labelPoint(feature);
        overlays.push(
          new kakao.maps.CustomOverlay({
            map,
            position: new kakao.maps.LatLng(lat, lng),
            content: label,
            xAnchor: 0.5,
            yAnchor: 0.5,
            zIndex: 2,
          }),
        );
      }

      map.setBounds(bounds);
      setReady(true);
    });

    return () => {
      cancelled = true;
      polygons.forEach((list) => list.forEach((polygon) => polygon.setMap(null)));
      polygons.clear();
      overlays.forEach((overlay) => overlay.setMap(null));
    };
  }, [boundaries, containerRef]);

  useEffect(() => {
    if (!ready) return;
    polygonsRef.current.forEach((list, dongCode) => {
      const color = dongs.get(dongCode)?.dominantColor;
      list.forEach((polygon) => polygon.setOptions({ fillColor: color ?? EMPTY_FILL }));
    });
  }, [ready, dongs]);
}
