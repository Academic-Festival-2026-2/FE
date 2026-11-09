import { Link } from "@tanstack/react-router";
import type { Boundaries } from "../../api/map";
import type { PhotoUploadResult } from "../../api/photo";
import { labelPoint } from "../map/map-data";

type CompletedPhoto = { id: string; filename: string; color: string; result: PhotoUploadResult };
const labels = { DAWN: "새벽", DAY: "낮", SUNSET: "노을", NIGHT: "밤" };

export function UploadComplete({ photos, boundaries, onAdd }: {
  photos: CompletedPhoto[]; boundaries: Boundaries | null; onAdd: () => void;
}) {
  const shared = photos.filter((photo) => photo.result.exifVerified).length;
  const features = boundaries?.features ?? [];
  const points = features.flatMap((feature) => feature.geometry.coordinates.flat(2));
  const extent = points.reduce((bounds, [x, y]) => ({
    minX: Math.min(bounds.minX, x), maxX: Math.max(bounds.maxX, x),
    minY: Math.min(bounds.minY, y), maxY: Math.max(bounds.maxY, y),
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  const { minX, maxY } = extent;
  const width = extent.maxX - minX, height = maxY - extent.minY;
  // 경계 데이터로 개략도를 그립니다. 표시 위치는 촬영 좌표가 아닌 동 중심입니다.
  const scale = Math.min(700 / (width * 0.8 || 1), 560 / (height || 1));
  const project = ([x, y]: number[]) => [50 + (x - minX) * 0.8 * scale, 50 + (maxY - y) * scale];
  return <div className="grid gap-7 lg:grid-cols-[1fr_420px]">
    <section className="flex min-h-[400px] flex-col rounded-[20px] border border-[#e3dfd6] bg-white p-6" aria-label="업로드한 사진의 행정동">
      <h2 className="font-bold">내 픽셀이 더해진 동</h2>
      {features.length ? <svg viewBox="0 0 800 660" role="img" aria-label="이번 업로드의 행정동 개략도" className="w-full flex-1">
        {features.map((feature) => <path key={feature.properties.dongCode} fill="#eee9df" stroke="#cec7ba" fillRule="evenodd" d={feature.geometry.coordinates.map((polygon) => polygon.map((ring) => ring.map((point, i) => `${i ? "L" : "M"}${project(point).join(",")}`).join(" ") + " Z").join(" ")).join(" ")} />)}
        {features.map((feature) => {
          const matching = photos.filter((photo) => photo.result.dongCode === feature.properties.dongCode);
          if (!matching.length) return null;
          const [x, y] = project(labelPoint(feature));
          return <g key={feature.properties.dongCode} transform={`translate(${x},${y})`}>
            <rect x="-13" y="-13" width="26" height="26" rx="5" fill={matching[0].color} stroke="#16161a" />
            <text y="4" textAnchor="middle" fontSize="12" fill="white" stroke="#16161a" strokeWidth="0.4">{matching.length}</text>
            <text y="30" textAnchor="middle" fontSize="12">{feature.properties.name}</text>
          </g>;
        })}
      </svg> : <p className="my-auto text-sm text-[#77716a]">동 경계를 표시할 수 없어요. 업로드 결과는 오른쪽 목록에서 확인하세요.</p>}
      <p className="text-xs text-[#77716a]">동별 업로드 수를 표시해요. 정확한 촬영 위치를 표시하는 지도는 아니에요.</p>
    </section>
    <div className="flex flex-col gap-4">
      <section className="rounded-[20px] border border-[#e3dfd6] bg-white p-7">
        <p className="font-mono text-xs text-[#b4500e]">DONE · {photos.length} / {photos.length}</p>
        <h1 className="my-5 text-[32px] font-extrabold leading-tight">부천에 내 픽셀<br />{photos.length}개가 찍혔어요</h1>
        <div className="grid grid-cols-2 divide-x divide-[#e3dfd6] border-t border-[#e3dfd6] pt-4 text-center">
          <p><strong className="block text-2xl">{shared}</strong><span className="text-sm">모두의 지도 반영</span></p>
          <p><strong className="block text-2xl">{photos.length - shared}</strong><span className="text-sm">개인 지도만</span></p>
        </div>
      </section>
      <section className="flex-1 rounded-[20px] border border-[#e3dfd6] bg-white p-6">
        <ul className="max-h-80 divide-y divide-[#e3dfd6] overflow-auto">{photos.map((photo, i) => <li key={photo.id} className="flex items-center gap-3 py-4">
          <span className="font-mono text-xs">{i + 1}</span><span className="h-9 w-9 shrink-0 rounded-md" style={{ background: photo.color }} />
          <div className="min-w-0"><p className="text-sm font-bold">{photo.result.name} · {labels[photo.result.timeBand]}</p><p className="truncate text-xs text-[#77716a]">{photo.filename}</p><p className="mt-1 text-xs">{photo.result.exifVerified ? "사진 정보 확인됨" : "직접 입력 포함"} · {photo.result.isPublic ? "공개" : "비공개"}</p></div>
        </li>)}</ul>
        <div className="mt-5 grid grid-cols-2 gap-2 text-center text-sm font-bold"><Link to="/map" search={{ timeBand: photos[0]?.result.timeBand ?? "SUNSET" }} className="rounded-xl bg-[#ff8a3d] px-3 py-4">지도에서 보기</Link><button type="button" onClick={onAdd} className="rounded-xl border border-[#ddd7ce] px-3 py-4">사진 더 올리기</button></div>
      </section>
    </div>
  </div>;
}
