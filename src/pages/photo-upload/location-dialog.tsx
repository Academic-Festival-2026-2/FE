import { useEffect, useRef, useState } from "react";
import type { BoundaryFeature } from "../../api/map";
import { MASK_FRAME_POINTS, toKakaoPath } from "../map/map-data";
import { labelPoint } from "../map/map-geometry.ts";
import { findDong } from "./photo-validation";

// 흐리게 덮을 바깥 영역 (map-data.ts MASK_FRAME_POINTS, 동 상세 지도와 같은 값)
let maskFrame: kakao.maps.LatLng[] | null = null;
function getMaskFrame() {
  maskFrame ??= MASK_FRAME_POINTS.map(([lat, lng]) => new kakao.maps.LatLng(lat, lng));
  return maskFrame;
}

// 구멍(동) 방향을 바깥 사각형과 반대로 맞추기 위한 부호 있는 넓이
function signedArea(path: kakao.maps.LatLng[]) {
  let area = 0;
  for (let i = 0; i < path.length; i++) {
    const a = path[i];
    const b = path[(i + 1) % path.length];
    area += a.getLng() * b.getLat() - b.getLng() * a.getLat();
  }
  return area;
}

type Props = {
  feature: BoundaryFeature;
  onClose: () => void;
  onConfirm: (latitude: number, longitude: number) => void;
  // 전에 찍은(또는 사진 GPS) 위치. 고른 동 안에 있으면 창을 열 때 핀과 함께 보여 줌
  initialPoint?: { lat: number; lng: number };
};

export function LocationDialog({ feature, onClose, onConfirm, initialPoint }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(
    initialPoint && findDong([feature], initialPoint.lat, initialPoint.lng) ? initialPoint : null,
  );
  // 지도 준비 effect에서 처음 핀 위치를 읽기 위한 값 (effect를 다시 돌리지 않으려고 ref로 보관)
  const initialRef = useRef(point);
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
      // 고른 동은 선명하게(채우지 않고 테두리만), 바깥은 흐리게 덮음 (동 상세 지도와 같은 방식)
      const polygons = feature.geometry.coordinates.map((rings) => {
        const polygon = new kakao.maps.Polygon({ path: toKakaoPath(rings), strokeColor: "#1A1A1A", strokeWeight: 2.5, fillColor: "#FFFFFF", fillOpacity: 0, zIndex: 2 });
        polygon.setMap(map);
        return polygon;
      });
      const outlines = feature.geometry.coordinates.map((rings) => toKakaoPath(rings)[0]);
      const frameSign = Math.sign(signedArea(getMaskFrame()));
      const holes = outlines.map((outline) => Math.sign(signedArea(outline)) === frameSign ? [...outline].reverse() : outline);
      const mask = new kakao.maps.Polygon({ path: [getMaskFrame(), ...holes], strokeWeight: 0, fillColor: "#F5F7FA", fillOpacity: 0.7, zIndex: 1 });
      mask.setMap(map);
      polygons.push(mask);
      // 처음 열 때 동 전체가 꽉 차게 확대
      const bounds = new kakao.maps.LatLngBounds();
      outlines.forEach((outline) => outline.forEach((latLng) => bounds.extend(latLng)));
      map.setBounds(bounds, 32, 32, 32, 32);
      const marker = new kakao.maps.Marker({ position: new kakao.maps.LatLng(lat, lng) });
      if (initialRef.current) {
        marker.setPosition(new kakao.maps.LatLng(initialRef.current.lat, initialRef.current.lng));
        marker.setMap(map);
      }
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

  return <dialog ref={dialog} onCancel={onClose} aria-labelledby="location-title" className="m-auto w-[min(900px,94vw)] overflow-hidden rounded-[20px] bg-white p-0 text-ink shadow-xl backdrop:bg-black/40">
    <div className="grid md:h-[568px] md:grid-cols-[1fr_320px]">
      {typeof kakao === "undefined" ? <p role="alert" className="m-6 self-center rounded-xl bg-brand-soft p-6 text-sm text-brand-strong">지도를 불러오지 못했어요. 잠시 후 다시 시도해 주세요. 사진에 GPS가 없다면 행정동만 선택해 진행할 수도 있어요.</p> : <div ref={ref} className="h-80 bg-preview md:h-full" />}
      <div className="flex flex-col p-7">
        <div className="flex justify-end"><button type="button" onClick={onClose} aria-label="닫기" className="flex size-9 items-center justify-center rounded-lg border border-field-line text-ink-sub hover:bg-field"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></button></div>
        <h2 id="location-title" className="mt-2 text-xl font-extrabold tracking-[-0.4px]">사진 찍은 위치 선택</h2>
        <p className="mt-3 text-sm text-ink-sub">고른 동: {feature.properties.guName} {feature.properties.name}</p>
        <p className="mt-1 text-sm text-ink-sub">지도에서 촬영한 곳을 눌러 주세요.</p>
        <div aria-live="polite" className={`mt-5 rounded-xl border p-4 ${point && !error ? "border-[#c9d8f5] bg-brand-soft" : "border-field-line bg-field"}`}>
          {error ? <p className="text-sm text-danger">{error}</p> : point ? <>
            <p className="text-xs font-bold text-brand-strong">찍은 위치</p>
            <p className="mt-1 text-lg font-extrabold">{feature.properties.guName} {feature.properties.name}</p>
            <p className="mt-1 font-mono text-[13px] text-ink-muted">{point.lat.toFixed(6)}, {point.lng.toFixed(6)}</p>
          </> : <p className="text-sm text-ink-muted">아직 위치를 선택하지 않았어요.</p>}
        </div>
        <button type="button" disabled={!point} onClick={() => { if (point) onConfirm(point.lat, point.lng); }} className="mt-6 h-[52px] w-full rounded-xl bg-brand font-extrabold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-text md:mt-auto">이 위치로 확정</button>
      </div>
    </div>
  </dialog>;
}
