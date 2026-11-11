import { useEffect, useRef, useState } from "react";
import { Link, useBlocker } from "@tanstack/react-router";
import { getMyInfo } from "../../api/user";
import { uploadPhoto, type PhotoUploadResult } from "../../api/photo";
import chevronDown from "../../assets/icons/chevron-down.svg";
import mapPin from "../../assets/icons/map-pin.svg";
import { AuthHeader } from "../../components/layout/auth-header";
import { ProfileMenu } from "../../components/layout/profile-menu";
import { isSessionExpired, useExpireSession } from "../../hooks/use-expire-session";
import { useAuthStore } from "../../stores/auth-store";
import { useBoundaries } from "../map/map-data";
import { UploadComplete } from "./upload-complete";
import { LocationDialog } from "./location-dialog";
import { UploadConfirmDialog } from "./upload-confirm-dialog";
import { readPhoto, type PhotoMetadata } from "./photo-metadata";
import { findDong, parseLocalTime, timeBand, validateColors } from "./photo-validation";

import { analyzePhoto, type ColorAnalysis as Colors } from "./color-analysis";
type Photo = {
  id: string; file: File; url: string; metadata: PhotoMetadata;
  takenAt: string; dongCode: string; latitude?: number; longitude?: number;
  isPublic: boolean; status: "reading" | "ready" | "invalid" | "uploading" | "success" | "error";
  error?: string; needsLogin?: boolean; colors?: Colors; result?: PhotoUploadResult;
};
const navButton = "h-11 rounded-[10px] border border-brand bg-white px-4 text-sm text-brand-strong transition-colors hover:bg-brand-soft disabled:cursor-not-allowed disabled:border-line disabled:text-ink-faint disabled:hover:bg-white";
const field = "h-11 w-full rounded-[10px] border border-field-line bg-white px-3.5 text-sm text-ink outline-none transition-colors focus:border-brand";
const badgeOk = "rounded-md bg-ok-soft px-2 py-1 text-xs font-bold text-ok";
const badgeNeed = "rounded-md border border-brand bg-white px-2 py-[3px] text-xs font-bold text-brand-strong";
const primary = "h-12 w-full rounded-xl bg-brand px-5 text-base font-extrabold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-text";
const bands = [ ["DAWN", "새벽", "05–08"], ["DAY", "낮", "08–16"], ["SUNSET", "노을", "16–19"], ["NIGHT", "밤", "19–05"] ];
const squares = ["#7F93B5", "#C9CCD3", "#FFA05A", "#2E3A78", "", "#9C8DB8", "#E2C07E", "#5E6A8F", "#7FB1E5"];
const steps = [
  ["대표색 뽑기", "사진마다 많이 쓰인 색 5개를 비율과 함께 뽑아요."],
  ["한 장씩 확인", "시간대와 동이 비어 있으면 직접 골라 주세요."],
  ["지도에 더하기", "공유 지도 또는 내 지도에만 칠해요."],
];

export function PhotoUploadPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [finished, setFinished] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const urls = useRef(new Set<string>());
  const alive = useRef(true);
  const sending = useRef(false);
  const expireSession = useExpireSession();
  // 헤더 프로필 메뉴가 세션 만료로 토큰을 지우면 로그인 링크로 바뀜
  const loggedIn = useAuthStore((state) => state.tokens !== null);
  const { boundaries, error: boundaryError } = useBoundaries();
  const photo = photos[index];
  const uploading = photos.some((p) => p.status === "uploading");
  const pending = photos.some((p) => p.status !== "success");
  const results = photos.filter((p) => p.result);
  useBlocker({ shouldBlockFn: () => (pending || uploading) && !window.confirm("페이지를 나가면 아직 올리지 않은 사진 정보가 사라져요. 나갈까요?"), enableBeforeUnload: pending || uploading });

  useEffect(() => {
    const currentUrls = urls.current;
    alive.current = true;
    return () => { alive.current = false; currentUrls.forEach((url) => URL.revokeObjectURL(url)); currentUrls.clear(); };
  }, []);

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
        const colors = await analyzePhoto(item.file);
        update(item.id, { colors, metadata, takenAt: metadata.takenAt ?? "", latitude: metadata.latitude, longitude: metadata.longitude, status: "ready" });
      } catch (error) {
        update(item.id, { status: "invalid", error: error instanceof Error ? error.message : "사진을 읽지 못했어요. 다른 사진을 선택해 주세요." });
      }
    }
  }

  const features = boundaries?.features ?? [];
  const located = photo?.latitude !== undefined && photo.longitude !== undefined ? findDong(features, photo.latitude, photo.longitude) : undefined;
  const selectedFeature = features.find((f) => f.properties.dongCode === photo?.dongCode) ?? located;
  const outside = Boolean(boundaries && photo?.latitude !== undefined && photo.longitude !== undefined && !located);

  // 서버의 exifVerified 조건을 FE에서 미리 확인: 사진에 촬영 시각·GPS가 있고 둘 다 바꾸지 않았을 때만 true
  // (PhotoService: EXIF 시각과 같고 좌표가 거의 같아야 함). 업로드 팝업의 공개 잠금 안내에만 사용
  const exifIntact = Boolean(photo?.metadata.takenAt && photo.metadata.latitude !== undefined && photo.metadata.longitude !== undefined
    && photo.takenAt === photo.metadata.takenAt && photo.latitude === photo.metadata.latitude && photo.longitude === photo.metadata.longitude);

  const locationMismatch = Boolean(located && selectedFeature && located.properties.dongCode !== selectedFeature.properties.dongCode);

  // isPublic: 업로드 팝업에서 고른 값 (동 상세에 사진을 보여 줄지)
  async function submit(isPublic: boolean) {
    if (!photo || sending.current || !photo.colors || !selectedFeature || locationMismatch || outside) return;
    const takenAt = parseLocalTime(photo.takenAt);
    if (!takenAt || !validateColors(photo.colors.palette, photo.colors.bins)) { update(photo.id, { error: "촬영 시각 또는 색상 분석 결과를 확인해 주세요." }); return; }
    sending.current = true;
    update(photo.id, { status: "uploading", error: undefined, isPublic });
    try {
      await getMyInfo();
      const result = await uploadPhoto(photo.file, {
        dongCode: selectedFeature.properties.dongCode, latitude: photo.latitude, longitude: photo.longitude,
        takenAt, isPublic, palette: photo.colors.palette, bins: photo.colors.bins,
      });
      update(photo.id, { status: "success", result });
      const following = photos.findIndex((p, i) => i > index && p.status !== "success");
      const next = following >= 0 ? following
        : photos.findIndex((p) => p.id !== photo.id && p.status !== "success");
      if (next >= 0) setIndex(next);
      else if (photos.every((p) => p.id === photo.id || p.status === "success")) setFinished(true);
    } catch (error) {
      const expired = isSessionExpired(error);
      const message = expired ? "로그인이 만료되었어요. 다시 로그인해 주세요." : error instanceof Error ? error.message : "업로드하지 못했어요. 다시 시도해 주세요.";
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

  const previewStatus = photo
    ? photo.status === "reading" ? { dot: "bg-[#ff8a3d]", text: "text-brand-strong", label: "사진 정보 확인 중…" }
      : photo.status === "success" ? { dot: "bg-ok-dot", text: "text-ok", label: "업로드 완료" }
        : photo.status === "invalid" ? { dot: "bg-danger", text: "text-danger", label: "지원하지 않는 사진" }
          : { dot: "bg-ok-dot", text: "text-ok", label: "사진 미리보기" }
    : null;

  return <div className="min-h-screen bg-page text-ink">
    <AuthHeader>
      {loggedIn ? (
        <ProfileMenu />
      ) : (
        <Link to="/login" className="text-sm text-ink-sub hover:text-ink">
          로그인
        </Link>
      )}
    </AuthHeader>
    <main className="mx-auto max-w-[1536px] px-5 pt-4 pb-10 sm:px-12">
      <input ref={input} type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" multiple className="sr-only" aria-label="사진 파일 선택" onChange={(e) => { if (e.target.files) void select(e.target.files); e.target.value = ""; }} />
      {!photo ? <>
        <p className="mt-2 font-mono text-[13px] tracking-[1.04px] text-brand-strong">UPLOAD</p>
        <h1 className="mt-3 text-[30px] font-extrabold tracking-[-0.9px]">사진 한 장, 픽셀 하나</h1>
        <p className="mt-2 text-base text-ink-sub">촬영 시각과 위치로 동·시간대를 정하고, 사진의 대표색을 뽑아 지도에 더합니다.</p>
        <div className={`mt-4 flex min-h-[457px] flex-col items-center justify-center gap-6 rounded-[20px] border border-dashed px-5 py-12 text-center transition-colors ${dragging ? "border-brand bg-brand-soft" : "border-[#c5ccda] bg-white"}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); void select(e.dataTransfer.files); }}>
          <div className="grid grid-cols-3 gap-[5px]" aria-hidden>{squares.map((color, i) => i === 4
            ? <span key="empty" className="size-8 rounded-[5px] border-2 border-dashed border-brand bg-brand-soft" />
            : <span key={color} className="size-8 rounded-[5px]" style={{ background: color }} />)}</div>
          <h2 className="text-2xl font-extrabold tracking-[-0.56px] sm:text-[28px]">사진을 끌어다 놓으면, 픽셀이 됩니다</h2>
          <p className="flex flex-wrap items-center justify-center gap-2 text-base text-ink-sub">여러 장을 한 번에 올려도 한 장씩 확인해요 <span className="text-[#aeb6c4]" aria-hidden>·</span><span className="font-mono text-sm">JPG PNG · 10MB 이하</span></p>
          <button type="button" onClick={() => input.current?.click()} className="h-[52px] rounded-xl bg-brand px-[30px] text-base font-extrabold text-white transition-colors hover:bg-brand-hover">사진 고르기</button>
        </div>
        <ol className="mt-[18px] grid border-t border-line sm:grid-cols-3">{steps.map(([label, description], i) => <li key={label} className={`pt-5 pb-4 sm:min-h-[90px] ${i > 0 ? "sm:border-l sm:border-line sm:pl-6" : ""}`}>
          <span className="font-mono text-[13px] text-brand-strong">0{i + 1}</span>
          <p className="mt-2 text-base font-bold">{label}</p>
          <p className="mt-1 text-sm text-ink-sub">{description}</p>
        </li>)}</ol>
      </> : finished ? <UploadComplete photos={results.flatMap((p) => p.result ? [{ id: p.id, filename: p.file.name, color: p.colors?.palette[0] ?? "#E6E6E6", result: p.result }] : [])} boundaries={boundaries} onAdd={() => input.current?.click()} /> : <>
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pt-2 pb-4">
          <div><p className="font-mono text-[13px] tracking-[1.04px] text-brand-strong">PHOTO {index + 1} / {photos.length}</p><h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.78px]">사진 한 장, 픽셀 하나</h1></div>
          <div className="flex items-center gap-2"><span aria-live="polite" className="mr-2 text-sm text-ink-muted">{results.length}장 완료</span><button type="button" className={navButton} disabled={index === 0 || uploading} onClick={() => setIndex(index - 1)}>← 이전</button><button type="button" className={navButton} disabled={index === photos.length - 1 || uploading} onClick={() => setIndex(index + 1)}>다음 →</button></div>
        </div>
        <div className="mt-[18px] grid items-start gap-7 lg:grid-cols-[1.35fr_1fr]">
          <section aria-label="선택한 사진">
            <div className="relative flex h-[300px] items-center justify-center overflow-hidden rounded-2xl bg-preview sm:h-[420px]">
              {photo.status !== "invalid" && <img src={photo.url} alt={`${index + 1}번째 선택한 사진`} className="h-full w-full object-contain" />}
              {previewStatus && <span className="absolute top-4 right-4 flex h-[30px] items-center gap-1.5 rounded-lg bg-white px-2.5 text-[13px] font-bold"><span className={`size-2 rounded-full ${previewStatus.dot}`} aria-hidden /><span className={previewStatus.text}>{previewStatus.label}</span></span>}
              <span className="absolute bottom-4 left-4 flex h-[29px] max-w-[90%] items-center rounded-lg bg-white px-2.5 font-mono text-[13px]"><span className="truncate">{photo.file.name} · {(photo.file.size / 1024 / 1024).toFixed(1)}MB</span></span>
            </div>
            <div className="mt-[18px] mb-3 flex items-baseline justify-between"><h2 className="text-base font-bold">대표색</h2><span className="text-[13px] text-ink-muted">많이 쓰인 순서</span></div>
            {photo.colors ? <><div className="flex h-10 overflow-hidden rounded-[10px]">{photo.colors.palette.map((color, i) => <span key={i} style={{ background: color, flex: photo.colors!.ratios[i] }} />)}</div><div className="mt-4 flex flex-wrap justify-between gap-x-4 gap-y-2 font-mono text-[13px]">{photo.colors.palette.map((color, i) => <span key={i} className="flex items-center gap-2"><span className="size-3.5 rounded-[3px]" style={{ background: color }} aria-hidden />{color} <span className="text-ink-muted">{Math.round(photo.colors!.ratios[i] * 100)}%</span></span>)}</div></>
              : photo.status === "reading" ? <><div className="flex h-10 animate-pulse overflow-hidden rounded-[10px] bg-preview" aria-hidden><span className="flex-[31]" /><span className="flex-[24] bg-[#dbe0e9]" /><span className="flex-[18]" /><span className="flex-[16] bg-[#dbe0e9]" /><span className="flex-[11]" /></div><p role="status" className="mt-4 text-[13px] text-ink-muted">사진 정보와 대표색을 분석 중이에요…</p></>
              : <p role="status" className="rounded-xl border border-card-line bg-white p-4 text-sm text-ink-muted">색상을 분석하지 못했어요. 사진을 다시 선택해 주세요.</p>}
          </section>
          <section className="overflow-hidden rounded-2xl border border-card-line bg-white" aria-label="사진 정보 입력">
            {photo.error && <p role="alert" className="mx-6 mt-5 rounded-xl border border-danger-line bg-danger-soft p-3 text-sm text-danger">{photo.error}</p>}
            {photo.needsLogin && <Link to="/login" className="mx-6 mt-3 inline-block text-sm text-brand-strong underline">다시 로그인하기</Link>}
            <fieldset disabled={uploading || photo.status === "success" || photo.status === "reading" || photo.status === "invalid"}>
              <div className="px-6 pt-4 pb-4">
                <div className="flex items-center justify-between gap-3"><h2 className="text-base font-bold">촬영 시간</h2><span className={photo.metadata.takenAt ? badgeOk : badgeNeed}>{photo.metadata.takenAt ? "사진 정보" : "직접 입력 필요"}</span></div>
                <label className="mt-3 block text-[13px] text-ink-sub">촬영 날짜·시각 (한국 시간)<input type="datetime-local" step="1" readOnly={Boolean(photo.metadata.takenAt)} value={photo.takenAt} onChange={(e) => update(photo.id, { takenAt: e.target.value })} className={`${field} mt-2 read-only:bg-field`} /></label>
                {photo.metadata.takenAt && <p className="mt-2 text-xs text-ink-muted">사진에 기록된 촬영 시각을 사용해요.</p>}
                <div className="mt-3 grid grid-cols-4 gap-2">{bands.map(([band, label, range]) => <div key={band} className={`flex h-[68px] flex-col justify-center gap-1 rounded-[10px] border px-2.5 ${timeBand(photo.takenAt) === band ? "border-navy bg-navy text-white" : "border-field-line bg-white"}`}><p className="text-[15px] font-bold">{label}</p><p className={`font-mono text-xs ${timeBand(photo.takenAt) === band ? "text-navy-sub" : "text-ink-muted"}`}>{range}</p></div>)}</div>
              </div>
              <div className="border-t border-divider px-6 pt-4 pb-5">
                <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-base font-bold">촬영 위치</h2><span className={photo.metadata.latitude !== undefined ? badgeOk : badgeNeed}>{photo.metadata.latitude !== undefined ? "사진 정보 · 변경 가능" : "직접 입력 필요"}</span></div>
                {boundaryError && <p role="alert" className="mb-3 text-sm text-danger">{boundaryError} 새로고침 후 다시 시도해 주세요.</p>}
                {locationMismatch && <p role="alert" className="mb-3 text-sm text-brand-strong">선택한 동과 사진 좌표가 달라요. 지도에서 새 촬영 위치를 확정해 주세요.</p>}
                {outside && <p role="alert" className="mb-3 text-sm text-brand-strong">부천 경계 밖의 위치예요. 부천에서 찍은 사진만 더할 수 있어요. 잘못 기록된 위치라면 실제 촬영 위치를 선택해 주세요.</p>}
                <label className="block text-[13px] text-ink-sub">행정동<span className="relative mt-2 block"><select disabled={!boundaries} value={selectedFeature?.properties.dongCode ?? ""} onChange={(e) => update(photo.id, { dongCode: e.target.value, latitude: photo.metadata.latitude, longitude: photo.metadata.longitude })} className={`${field} appearance-none border-select-line pr-10 disabled:bg-field disabled:text-ink-faint`}><option value="">{boundaries ? "구 · 동을 골라 주세요" : "행정동 불러오는 중…"}</option>{features.map((f) => <option key={f.properties.dongCode} value={f.properties.dongCode}>{f.properties.guName} · {f.properties.name}</option>)}</select><img src={chevronDown} alt="" width={16} height={16} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2" /></span></label>
                <button type="button" disabled={!selectedFeature} onClick={() => setMapOpen(true)} className="mt-2 flex h-11 w-full items-center gap-2 rounded-[10px] bg-field px-3.5 text-left text-sm text-ink transition-colors hover:bg-[#e9edf4] disabled:cursor-not-allowed disabled:text-ink-faint disabled:hover:bg-field"><img src={mapPin} alt="" width={16} height={16} />지도에서 촬영 위치 선택</button>
                {photo.latitude !== undefined && photo.longitude !== undefined && <p className="mt-2 font-mono text-xs text-ink-muted">선택한 위치: {photo.latitude.toFixed(6)}, {photo.longitude.toFixed(6)}</p>}
                <p className="mt-3 text-xs leading-5 text-ink-muted">촬영 시각이나 위치를 직접 입력하면 개인 지도에만 반영될 수 있어요. 최종 사진 정보 확인은 서버에서 진행해요.</p>
              </div>
              <div className="flex flex-col gap-3 border-t border-divider px-6 pt-4 pb-2">
                <p className="text-center text-xs text-ink-muted">누르면 사진 공개 여부를 고를 수 있어요</p>
                <button type="button" onClick={() => setConfirmOpen(true)} disabled={!photo.colors || !parseLocalTime(photo.takenAt) || !selectedFeature || outside || locationMismatch} className={primary}>{photo.status === "uploading" ? "지도에 더하는 중…" : photo.status === "success" ? "업로드 완료" : photo.status === "error" ? "다시 시도" : index < photos.length - 1 ? "지도에 더하고 다음 사진" : "지도에 더하기"}</button>
              </div>
            </fieldset>
            <div className="flex flex-wrap justify-between gap-3 px-6 pt-2 pb-5 text-sm"><button type="button" disabled={uploading} onClick={removeCurrent} className="text-ink-sub underline underline-offset-4 disabled:opacity-40">이 사진 목록에서 빼기</button><button type="button" disabled={uploading} onClick={() => input.current?.click()} className="font-bold text-brand-strong underline underline-offset-4 disabled:opacity-40">사진 추가</button></div>
          </section>
        </div>
        {confirmOpen && selectedFeature && <UploadConfirmDialog key={photo.id} summary={[selectedFeature.properties.name, bands.find(([band]) => band === timeBand(photo.takenAt))?.[1]].filter(Boolean).join(" · ")} defaultPublic={photo.isPublic} canBePublic={exifIntact} onCancel={() => setConfirmOpen(false)} onConfirm={(isPublic) => { setConfirmOpen(false); void submit(isPublic); }} />}
        {mapOpen && selectedFeature && <LocationDialog key={photo.id + selectedFeature.properties.dongCode} feature={selectedFeature} onClose={() => setMapOpen(false)} onConfirm={(latitude, longitude) => { update(photo.id, { latitude, longitude }); setMapOpen(false); }} />}
      </>}
    </main>
  </div>;
}
