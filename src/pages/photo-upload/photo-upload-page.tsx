import { useEffect, useRef, useState } from "react";
import { Link, useBlocker } from "@tanstack/react-router";
import { getMyInfo } from "../../api/user";
import { ApiError } from "../../api/client";
import { uploadPhoto, type PhotoUploadResult } from "../../api/photo";
import { AuthHeader } from "../../components/layout/auth-header";
import { ProfileMenu } from "../../components/layout/profile-menu";
import { isSessionExpired, useExpireSession } from "../../hooks/use-expire-session";
import { useAuthStore } from "../../stores/auth-store";
import { useUserStore } from "../../stores/user-store";
import { useBoundaries } from "../map/map-data";
import { UploadComplete } from "./upload-complete";
import { LocationDialog } from "./location-dialog";
import { readPhoto, type PhotoMetadata } from "./photo-metadata";
import { findDong, parseLocalTime, photoSeasonError, timeBand, validateColors } from "./photo-validation";

import { analyzePhoto, type ColorAnalysis as Colors } from "./color-analysis";
type Photo = {
  id: string; file: File; url: string; metadata: PhotoMetadata;
  takenAt: string; dongCode: string; latitude?: number; longitude?: number;
  isPublic: boolean; status: "reading" | "ready" | "invalid" | "uploading" | "success" | "error";
  error?: string; needsLogin?: boolean; colors?: Colors; result?: PhotoUploadResult;
};
const button = "rounded-xl border border-[#ddd7ce] bg-white px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40";
const primary = "w-full rounded-xl bg-[#ff8a3d] px-5 py-4 font-bold text-[#16161a] disabled:cursor-not-allowed disabled:bg-[#eee8df] disabled:text-[#898076]";
const bands = [ ["DAWN", "새벽", "05–08"], ["DAY", "낮", "08–16"], ["SUNSET", "노을", "16–19"], ["NIGHT", "밤", "19–05"] ];
const squares = ["#7F93B5", "#C9CCD3", "#FFA05A", "#2E3A78", "#FF8A3D", "#9C8DB8", "#E2C07E", "#5E6A8F", "#7FB1E5"];

function uploadErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "PHOTO400_12") return "이 사진의 촬영 날짜에 등록된 시즌이 없어요. 촬영 날짜를 확인해 주세요.";
    if (error.code === "PHOTO409_1") return "이미 등록된 사진입니다. 다른 사진을 선택해 주세요.";
  }
  return error instanceof Error ? error.message : "업로드하지 못했어요. 다시 시도해 주세요.";
}

export function PhotoUploadPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [finished, setFinished] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const urls = useRef(new Set<string>());
  const alive = useRef(true);
  const sending = useRef(false);
  const expireSession = useExpireSession();
  // 헤더 프로필 메뉴가 세션 만료로 토큰을 지우면 로그인 링크로 바뀜
  const loggedIn = useAuthStore((state) => state.tokens !== null);
  // 위치정보 이용에 동의한 회원만 좌표를 써요. 올리기 직전에 서버 값으로 다시 확인해요.
  // 내 정보가 오기 전(undefined)에는 동의 여부를 몰라서 좌표는 쓰지 않되, "동의하지 않아" 안내도 띄우지 않아요.
  const consent = useUserStore((state) => state.me?.locationAgreed);
  const locationAgreed = consent === true;
  const loadMe = useUserStore((state) => state.loadMe);
  const setMe = useUserStore((state) => state.setMe);
  const { boundaries, error: boundaryError } = useBoundaries();
  const photo = photos[index];
  // 업로드 실패나 읽을 수 없는 사진으로 이동했을 때만 안내로 이동합니다.
  // 날짜 직접 입력 중 발생하는 시즌 오류는 입력 포커스를 유지합니다.
  useEffect(() => {
    if (!photo?.error || (photo.status !== "error" && photo.status !== "invalid")) return;
    const frame = requestAnimationFrame(() => {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      errorRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [photo?.id, photo?.status, photo?.error]);
  // 미동의면 사진 속 GPS·지도에서 고른 위치를 모두 무시하고 동만 받아요
  const latitude = locationAgreed ? photo?.latitude : undefined;
  const longitude = locationAgreed ? photo?.longitude : undefined;
  const uploading = photos.some((p) => p.status === "uploading");
  const pending = photos.some((p) => p.status !== "success");
  const results = photos.filter((p) => p.result);
  useBlocker({ shouldBlockFn: () => (pending || uploading) && !window.confirm("페이지를 나가면 아직 올리지 않은 사진 정보가 사라져요. 나갈까요?"), enableBeforeUnload: pending || uploading });

  useEffect(() => {
    const currentUrls = urls.current;
    alive.current = true;
    return () => { alive.current = false; currentUrls.forEach((url) => URL.revokeObjectURL(url)); currentUrls.clear(); };
  }, []);

  // 헤더와 상관없이 이 화면에서도 내 정보를 불러와요 (이미 있으면 다시 안 부름, 세션 만료 처리는 헤더가 함)
  useEffect(() => {
    loadMe().catch(() => {});
  }, [loadMe]);

  function update(id: string, changes: Partial<Photo>) {
    if (alive.current) setPhotos((list) => list.map((p) => p.id === id ? { ...p, ...changes } : p));
  }

  async function select(files: FileList | File[]) {
    if (sending.current) return;
    setFinished(false);
    if (finished) setIndex(photos.length);
    const selected = Array.from(files).map((file): Photo => {
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      return { id: crypto.randomUUID(), file, url, metadata: {}, takenAt: "", dongCode: "", isPublic: true, status: "reading" };
    });
    setPhotos((list) => [...list, ...selected]);
    // 한 번에 디코딩하는 사진 수를 제한해 큰 사진 여러 장의 메모리 급증을 피합니다.
    for (const item of selected) {
      if (!alive.current) break;
      try {
        const metadata = await readPhoto(item.file);
        const seasonError = metadata.takenAt ? photoSeasonError(metadata.takenAt) : undefined;
        if (seasonError) {
          update(item.id, { metadata, takenAt: metadata.takenAt, latitude: metadata.latitude, longitude: metadata.longitude, status: "invalid", error: seasonError });
          continue;
        }
        const colors = await analyzePhoto(item.file);
        update(item.id, { colors, metadata, takenAt: metadata.takenAt ?? "", latitude: metadata.latitude, longitude: metadata.longitude, status: "ready" });
      } catch (error) {
        update(item.id, { status: "invalid", error: error instanceof Error ? error.message : "사진을 읽지 못했어요. 다른 사진을 선택해 주세요." });
      }
    }
  }

  const features = boundaries?.features ?? [];
  const located = latitude !== undefined && longitude !== undefined ? findDong(features, latitude, longitude) : undefined;
  const selectedFeature = features.find((f) => f.properties.dongCode === photo?.dongCode) ?? located;
  const outside = Boolean(boundaries && latitude !== undefined && longitude !== undefined && !located);

  const locationMismatch = Boolean(located && selectedFeature && located.properties.dongCode !== selectedFeature.properties.dongCode);

  async function submit() {
    if (!photo || sending.current || !photo.colors || !selectedFeature || locationMismatch || outside) return;
    const takenAt = parseLocalTime(photo.takenAt);
    const seasonError = photoSeasonError(photo.takenAt);
    if (!takenAt || seasonError || !validateColors(photo.colors.palette, photo.colors.bins)) {
      update(photo.id, { error: seasonError ?? "촬영 시각 또는 색상 분석 결과를 확인해 주세요." });
      return;
    }
    sending.current = true;
    update(photo.id, { status: "uploading", error: undefined });
    try {
      // 토큰 재발급 겸 최신 동의 상태 확인
      const me = await getMyInfo();
      setMe(me);
      // 화면에 보인 동의 상태와 다르면(내 정보를 불러오기 전이거나 다른 탭에서 바꾼 경우) 화면을 맞추고 다시 확인받아요.
      // 서버 값만 보고 좌표를 보내면, 동만 고르던 화면에서 GPS와 다른 동을 고른 경우 DONG_GPS_MISMATCH로 실패해요.
      if (me.locationAgreed !== locationAgreed) {
        update(photo.id, { status: "ready", error: "위치정보 동의 상태를 다시 확인해 화면을 맞췄어요. 촬영 위치를 확인한 뒤 다시 눌러 주세요." });
        return;
      }
      const result = await uploadPhoto(photo.file, {
        dongCode: selectedFeature.properties.dongCode, latitude, longitude,
        takenAt, isPublic: photo.isPublic, palette: photo.colors.palette, bins: photo.colors.bins,
      });
      update(photo.id, { status: "success", result });
      const following = photos.findIndex((p, i) => i > index && p.status !== "success");
      const next = following >= 0 ? following
        : photos.findIndex((p) => p.id !== photo.id && p.status !== "success");
      if (next >= 0) setIndex(next);
      else if (photos.every((p) => p.id === photo.id || p.status === "success")) setFinished(true);
    } catch (error) {
      const expired = isSessionExpired(error);
      const message = expired ? "로그인이 만료되었어요. 다시 로그인해 주세요." : uploadErrorMessage(error);
      update(photo.id, { status: "error", needsLogin: expired, error: message });
      if (expired) expireSession();
    } finally { sending.current = false; }
  }

  function removeCurrent() {
    if (!photo || uploading) return;
    URL.revokeObjectURL(photo.url); urls.current.delete(photo.url);
    const remaining = photos.filter((p) => p.id !== photo.id);
    setPhotos(remaining);
    setFinished(remaining.length > 0 && remaining.every((p) => p.status === "success"));
    setIndex(Math.max(0, index - 1));
  }

  return <div className="min-h-screen bg-[#f4f2ed] text-[#16161a]">
    <AuthHeader>
      {loggedIn ? (
        <ProfileMenu />
      ) : (
        <Link to="/login" className="text-sm text-[#55524c] hover:text-gray-900">
          로그인
        </Link>
      )}
    </AuthHeader>
    <main className="mx-auto max-w-[1536px] px-5 py-7 sm:px-12">
      <input ref={input} type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" multiple className="sr-only" aria-label="사진 파일 선택" onChange={(e) => { if (e.target.files) void select(e.target.files); e.target.value = ""; }} />
      {!photo ? <>
        <p className="font-mono text-xs tracking-widest text-[#b4500e]">UPLOAD</p>
        <h1 className="mt-2 text-3xl font-extrabold">사진 한 장, 픽셀 하나</h1>
        <p className="mt-3 text-[#77716a]">부천에서 담은 순간을 색으로 남겨 보세요.</p>
        <div className={`mt-7 flex min-h-[457px] flex-col items-center justify-center rounded-[20px] border-2 border-dashed px-5 py-12 text-center ${dragging ? "border-[#ff8a3d] bg-orange-50" : "border-[#cdc4b4] bg-white"}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); void select(e.dataTransfer.files); }}>
          <div className="grid grid-cols-3 gap-1.5" aria-hidden>{squares.map((color) => <span key={color} className="h-8 w-8 rounded-md" style={{ background: color }} />)}</div>
          <h2 className="mt-7 text-2xl font-bold sm:text-[28px]">사진을 끌어다 놓으면, 픽셀이 됩니다</h2>
          <p className="mt-3 text-sm text-[#77716a]">여러 장을 골라도 한 장씩 확인해요. JPEG · PNG, 한 장당 10MB 이하</p>
          <button type="button" onClick={() => input.current?.click()} className="mt-7 rounded-xl bg-[#ff8a3d] px-8 py-4 font-bold">사진 선택하기</button>
        </div>
        <ol className="mt-8 grid gap-5 text-sm sm:grid-cols-3">{["대표색 뽑기", "한 장씩 확인", "지도에 더하기"].map((label, i) => <li key={label} className="border-t border-[#ddd7ce] pt-4"><span className="mr-3 font-mono text-[#b4500e]">0{i + 1}</span>{label}</li>)}</ol>
      </> : finished ? <UploadComplete photos={results.flatMap((p) => p.result ? [{ id: p.id, filename: p.file.name, color: p.colors?.palette[0] ?? "#E6E6E6", result: p.result }] : [])} boundaries={boundaries} onAdd={() => input.current?.click()} /> : <>
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e3dfd6] pb-5">
          <div><p className="font-mono text-xs tracking-widest text-[#b4500e]">PHOTO {index + 1} / {photos.length}</p><h1 className="mt-2 text-[26px] font-extrabold">사진 한 장, 픽셀 하나</h1></div>
          <div className="flex items-center gap-2"><span aria-live="polite" className="mr-2 text-sm text-[#77716a]">{results.length}장 완료</span><button type="button" className={button} disabled={index === 0 || uploading} onClick={() => setIndex(index - 1)}>← 이전</button><button type="button" className={button} disabled={index === photos.length - 1 || uploading} onClick={() => setIndex(index + 1)}>다음 →</button></div>
        </div>
        <div className="mt-6 grid items-start gap-7 lg:grid-cols-[1.35fr_1fr]">
          <section aria-label="선택한 사진">
            <div className="relative flex h-[300px] items-center justify-center overflow-hidden rounded-2xl bg-[#e8e3da] sm:h-[420px]">
              {photo.status !== "invalid" && <img src={photo.url} alt={`${index + 1}번째 선택한 사진`} className="h-full w-full object-contain" />}
              <span className="absolute right-4 top-4 rounded-md bg-white px-3 py-2 text-xs">{photo.status === "reading" ? "사진 정보 확인 중…" : photo.status === "success" ? "업로드 완료" : photo.status === "invalid" ? "지원하지 않는 사진" : "사진 미리보기"}</span>
              <span className="absolute bottom-4 left-4 max-w-[90%] truncate rounded-md bg-white px-3 py-2 font-mono text-xs">{photo.file.name} · {(photo.file.size / 1024 / 1024).toFixed(1)}MB</span>
            </div>
            <h2 className="mb-3 mt-5 font-bold">대표색 · 상위 5색</h2>
            {photo.colors ? <><div className="flex h-10 overflow-hidden rounded-xl">{photo.colors.palette.map((color, i) => <span key={i} style={{ background: color, flex: photo.colors!.ratios[i] }} />)}</div><div className="mt-3 flex flex-wrap justify-between gap-2 font-mono text-xs">{photo.colors.palette.map((color, i) => <span key={i}>{color} {Math.round(photo.colors!.ratios[i] * 100)}%</span>)}</div></> : <p role="status" className="rounded-xl border border-[#e3dfd6] bg-white p-4 text-sm text-[#77716a]">{photo.status === "reading" ? "사진 정보와 대표색을 분석 중이에요…" : "대표색을 표시할 수 없어요. 오른쪽 오류 안내를 확인해 주세요."}</p>}
          </section>
          <section className="rounded-2xl border border-[#e3dfd6] bg-white p-6" aria-label="사진 정보 입력">
            {photo.error && <p ref={errorRef} tabIndex={-1} role="alert" className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{photo.error}</p>}
            {photo.needsLogin && <Link to="/login" className="mb-4 inline-block text-sm underline">다시 로그인하기</Link>}
            <fieldset disabled={uploading || photo.status === "success" || photo.status === "reading" || photo.status === "invalid"}>
              <div className="flex justify-between gap-3"><h2 className="font-bold">촬영 시간</h2><span className="text-xs text-[#77716a]">{photo.metadata.takenAt ? "사진 정보" : "직접 입력 필요"}</span></div>
<label className="mt-4 block text-sm">촬영 날짜·시각 (한국 시간)<input type="datetime-local" step="1" readOnly={Boolean(photo.metadata.takenAt)} value={photo.takenAt} onChange={(e) => update(photo.id, { takenAt: e.target.value, error: photoSeasonError(e.target.value), status: photo.status === "error" ? "ready" : photo.status })} className="mt-2 w-full rounded-lg border border-[#ddd7ce] px-3 py-3 read-only:bg-[#f4f2ed]" /></label>
{photo.metadata.takenAt && <p className="mt-2 text-xs text-[#77716a]">사진에 기록된 촬영 시각을 사용해요.</p>}
              <div className="mt-4 grid grid-cols-4 gap-2">{bands.map(([band, label, range]) => <div key={band} className={`rounded-lg border p-2 ${timeBand(photo.takenAt) === band ? "border-[#16161a] bg-[#16161a] text-white" : "border-[#e3dfd6]"}`}><p className="text-sm font-bold">{label}</p><p className="mt-1 text-xs opacity-65">{range}</p></div>)}</div>
              <div className="mb-3 mt-7 flex justify-between"><h2 className="font-bold">촬영 위치</h2><span className="text-xs text-[#77716a]">{consent === undefined ? "동의 여부 확인 중" : !locationAgreed ? "동만 선택" : photo.metadata.latitude !== undefined ? "사진 정보 · 변경 가능" : "직접 입력 필요"}</span></div>
              {consent === false && <p className="mb-3 rounded-xl bg-[#f4f2ed] p-3 text-xs leading-5 text-[#55524c]">위치정보 이용에 동의하지 않아 촬영 위치는 저장하지 않고 동만 저장해요. 이 사진은 나의 지도에만 반영되고 모두의 지도에는 반영되지 않아요. 동의는 마이페이지에서 바꿀 수 있어요.</p>}
              {locationAgreed && photo.status !== "reading" && photo.status !== "invalid" && photo.metadata.latitude === undefined && <p className="mb-3 rounded-xl bg-[#fff4e8] p-3 text-xs leading-5 text-[#7a4518]">사진의 GPS 정보를 확인하지 못했어요. 휴대폰에서 사진을 선택하거나 촬영하는 과정에서 위치정보가 빠질 수 있어요. 위치를 직접 선택하면 개인 지도에만 반영돼요.</p>}
              {boundaryError && <p role="alert" className="mb-3 text-sm text-red-700">{boundaryError} 새로고침 후 다시 시도해 주세요.</p>}
              {locationMismatch && <p role="alert" className="mb-3 text-sm text-[#b4500e]">선택한 동과 사진 좌표가 달라요. 지도에서 새 촬영 위치를 확정해 주세요.</p>}
              {outside && <p role="alert" className="mb-3 text-sm text-[#b4500e]">부천 경계 밖의 위치예요. 부천에서 찍은 사진만 더할 수 있어요. 잘못 기록된 위치라면 실제 촬영 위치를 선택해 주세요.</p>}
              <label className="block text-sm">행정동<select disabled={!boundaries} value={selectedFeature?.properties.dongCode ?? ""} onChange={(e) => update(photo.id, { dongCode: e.target.value, latitude: photo.metadata.latitude, longitude: photo.metadata.longitude })} className="mt-2 w-full rounded-lg border border-[#ddd7ce] bg-white px-3 py-3"><option value="">{boundaries ? "구 · 동을 골라 주세요" : "행정동 불러오는 중…"}</option>{features.map((f) => <option key={f.properties.dongCode} value={f.properties.dongCode}>{f.properties.guName} · {f.properties.name}</option>)}</select></label>
              {locationAgreed && <>
                <button type="button" disabled={!selectedFeature} onClick={() => setMapOpen(true)} className={`${button} mt-3 w-full`}>지도에서 촬영 위치 선택</button>
                {latitude !== undefined && longitude !== undefined && <p className="mt-2 text-xs text-[#77716a]">선택한 위치: {latitude.toFixed(6)}, {longitude.toFixed(6)}</p>}
                <p className="mt-3 text-xs leading-5 text-[#77716a]">촬영 시각이나 위치를 직접 입력하면 개인 지도에만 반영될 수 있어요. 최종 사진 정보 확인은 서버에서 진행해요.</p>
              </>}
              <label className="my-5 flex items-center gap-2 text-sm"><input type="checkbox" checked={photo.isPublic} onChange={(e) => update(photo.id, { isPublic: e.target.checked })} className="h-4 w-4 accent-[#ff8a3d]" />다른 사람에게 사진 공개</label>
              <button type="button" onClick={() => void submit()} disabled={!photo.colors || !parseLocalTime(photo.takenAt) || Boolean(photoSeasonError(photo.takenAt)) || !selectedFeature || outside || locationMismatch} className={primary}>{photo.status === "uploading" ? "지도에 더하는 중…" : photo.status === "success" ? "업로드 완료" : photo.status === "error" ? "다시 시도" : index < photos.length - 1 ? "지도에 더하고 다음 사진" : "지도에 더하기"}</button>
            </fieldset>
            <div className="mt-4 flex flex-wrap justify-between gap-3 text-sm"><button type="button" disabled={uploading} onClick={removeCurrent} className="text-[#77716a] underline disabled:opacity-40">이 사진 목록에서 빼기</button><button type="button" disabled={uploading} onClick={() => input.current?.click()} className="text-[#b4500e] underline disabled:opacity-40">사진 추가</button></div>
          </section>
        </div>
        {mapOpen && locationAgreed && selectedFeature && <LocationDialog key={photo.id + selectedFeature.properties.dongCode} feature={selectedFeature} onClose={() => setMapOpen(false)} onConfirm={(latitude, longitude) => { update(photo.id, { latitude, longitude }); setMapOpen(false); }} />}
      </>}
    </main>
  </div>;
}

