import { useEffect, useRef, useState } from "react";
import type { BoundaryFeature } from "../../api/map";
import { labelPoint, toKakaoPath } from "../map/map-data";
import { findDong } from "./photo-validation";

type Props = {
  feature: BoundaryFeature;
  onClose: () => void;
  onConfirm: (latitude: number, longitude: number) => void;
};

export function LocationDialog({ feature, onClose, onConfirm }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  useEffect(() => {
    if (typeof kakao === "undefined") return;
    let disposed = false;
    let cleanup = () => {};
    kakao.maps.load(() => {
      if (disposed || !ref.current) return;
      const [lng, lat] = labelPoint(feature);
      const map = new kakao.maps.Map(ref.current, { center: new kakao.maps.LatLng(lat, lng), level: 5 });
      const polygons = feature.geometry.coordinates.map((rings) => {
        const polygon = new kakao.maps.Polygon({ path: toKakaoPath(rings), strokeColor: "#FF8A3D", strokeWeight: 2, fillColor: "#FF8A3D", fillOpacity: 0.12 });
        polygon.setMap(map);
        return polygon;
      });
      const marker = new kakao.maps.Marker({ position: new kakao.maps.LatLng(lat, lng) });
      const click = (event: kakao.maps.event.MouseEvent) => {
        const lat = event.latLng.getLat(), lng = event.latLng.getLng();
        if (!findDong([feature], lat, lng)) {
          setError("선택한 동 안에서 촬영 위치를 골라 주세요. 경계 부근은 서버에서 다시 확인해요.");
          setPoint(null);
          marker.setMap(null);
          return;
        }
        marker.setPosition(event.latLng);
        marker.setMap(map);
        setPoint({ lat, lng });
        setError("");
      };
      kakao.maps.event.addListener(map, "click", click);
      polygons.forEach((p) => kakao.maps.event.addListener(p, "click", click));
      cleanup = () => {
        kakao.maps.event.removeListener(map, "click", click);
        polygons.forEach((p) => { kakao.maps.event.removeListener(p, "click", click); p.setMap(null); });
        marker.setMap(null);
      };
    });
    return () => { disposed = true; cleanup(); };
  }, [feature]);

  return <dialog ref={dialog} onCancel={onClose} aria-labelledby="location-title" className="m-auto w-[min(640px,94vw)] rounded-2xl bg-white p-6 text-[#16161a] shadow-xl backdrop:bg-black/40">
    <div className="flex items-center justify-between"><h2 id="location-title" className="text-xl font-bold">사진 찍은 위치 선택</h2><button type="button" onClick={onClose} aria-label="닫기" className="p-2">✕</button></div>
    <p className="my-3 text-sm text-[#77716a]">{feature.properties.guName} {feature.properties.name} · 지도에서 촬영한 곳을 눌러 주세요.</p>
    {typeof kakao === "undefined" ? <p role="alert" className="rounded-xl bg-orange-50 p-6">지도를 불러오지 못했어요. 잠시 후 다시 시도해 주세요. 사진에 GPS가 없다면 행정동만 선택해 진행할 수도 있어요.</p> : <div ref={ref} className="h-80 rounded-xl bg-[#e8e3da]" />}
    <p aria-live="polite" className="my-4 min-h-6 text-sm">{error || (point ? `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}` : "아직 위치를 선택하지 않았어요.")}</p>
    <button type="button" disabled={!point} onClick={() => { if (point) onConfirm(point.lat, point.lng); }} className="h-12 w-full rounded-xl bg-[#ff8a3d] font-bold disabled:bg-[#eee8df] disabled:text-[#8c847b]">이 위치로 확정</button>
  </dialog>;
}
