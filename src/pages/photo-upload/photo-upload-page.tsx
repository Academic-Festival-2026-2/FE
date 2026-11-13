import { useEffect, useRef, useState } from "react";
import { Link, useBlocker } from "@tanstack/react-router";
import { getMyInfo } from "../../api/user";
import { ApiError } from "../../api/client";
import { uploadPhoto, type PhotoUploadResult } from "../../api/photo";
import chevronDown from "../../assets/icons/chevron-down.svg";
import mapPin from "../../assets/icons/map-pin.svg";
import { AuthHeader } from "../../components/layout/auth-header";
import { ProfileMenu } from "../../components/layout/profile-menu";
import { isSessionExpired, useExpireSession } from "../../hooks/use-expire-session";
import { useAuthStore } from "../../stores/auth-store";
import { useUserStore } from "../../stores/user-store";
import { useRegionBoundaries, useRegionList } from "../map/map-data";
import { UploadComplete } from "./upload-complete";
import { LocationDialog } from "./location-dialog";
import { UploadPixels } from "./upload-pixels";
import { UploadConfirmDialog } from "./upload-confirm-dialog";
import { readPhoto, type PhotoMetadata } from "./photo-metadata";
import { findDong, parseLocalTime, photoSeasonError, timeBand, validateColors } from "./photo-validation";

import { analyzePhoto, type ColorAnalysis as Colors } from "./color-analysis";
type Photo = {
  id: string; file: File; url: string; metadata: PhotoMetadata;
  takenAt: string; dongCode: string; regionCode: string; latitude?: number; longitude?: number;
  isPublic: boolean; status: "reading" | "ready" | "invalid" | "uploading" | "success" | "error";
  error?: string; needsLogin?: boolean; colors?: Colors; result?: PhotoUploadResult;
};
const navButton = "h-11 rounded-[10px] border border-brand bg-white px-4 text-sm text-brand-strong transition-colors hover:bg-brand-soft disabled:cursor-not-allowed disabled:border-line disabled:text-ink-faint disabled:hover:bg-white";
const field = "h-11 w-full rounded-[10px] border border-field-line bg-white px-3.5 text-sm text-ink outline-none transition-colors focus:border-brand";
const badgeNeed = "rounded-md border border-brand bg-white px-2 py-[3px] text-xs font-bold text-brand-strong";
const primary = "h-12 w-full rounded-xl bg-brand px-5 text-base font-extrabold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-text";
const bands = [ ["DAWN", "새벽", "05–08"], ["DAY", "낮", "08–16"], ["SUNSET", "노을", "16–19"], ["NIGHT", "밤", "19–05"] ];
const PREVIEW_MAX_HEIGHT = 560;
const MIN_BAR_SHARE = 0.04;

// 대표색 바 표시용: ratios는 사진 전체 대비 비율이라 5색 합이 100%보다 작음 → 5색 합 100%로 다시 계산
// share: 5색 안에서의 비율(범례 %), width: 바 폭(아주 작은 색도 보이게 최소 4%). 색이 5개보다 적어 채운 칸(0%)은 뺌
// 화면 표시만 바꾸고, 서버로 보내는 palette·bins는 그대로
function paletteShares({ palette, ratios }: Colors) {
  const items = palette.map((color, i) => ({ color, ratio: ratios[i] ?? 0 })).filter((item) => item.ratio > 0);
  const total = items.reduce((sum, item) => sum + item.ratio, 0) || 1;
  const lifted = items.map((item) => Math.max(item.ratio / total, MIN_BAR_SHARE));
  const liftedTotal = lifted.reduce((sum, value) => sum + value, 0);
  return items.map((item, i) => ({ color: item.color, share: item.ratio / total, width: lifted[i] / liftedTotal }));
}
const steps = [
  ["대표색 뽑기", "사진마다 많이 쓰인 색 5개를 비율과 함께 뽑아요."],
  ["한 장씩 확인", "시간대와 동이 비어 있으면 직접 골라 주세요."],
  ["지도에 더하기", "공유 지도 또는 나의 지도에만 칠해요."],
];

function uploadErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "PHOTO400_12") return "이 사진의 촬영 날짜에 등록된 시즌이 없어요. 촬영 날짜를 확인해 주세요.";
    if (error.code === "PHOTO409_1") return "이미 등록된 사진입니다. 다른 사진을 선택해 주세요.";
    // AI 검수에서 거절된 사진 (BE ClaudeImageModerator 기준: 선정적·폭력적·혐오감을 주는 사진)
    if (error.code === "PHOTO422_1") return "지도에 올릴 수 없는 사진이에요. 선정적이거나 폭력적인 사진, 혐오감을 주는 사진은 올릴 수 없어요.";
  }
  return error instanceof Error ? error.message : "업로드하지 못했어요. 다시 시도해 주세요.";
}

export function PhotoUploadPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // 공개 여부 팝업 단계: 고르기 → 올리는 중 → (실패하면) 실패 이유
  const [uploadPhase, setUploadPhase] = useState<"choose" | "uploading" | "error">("choose");
  // 미리보기 칸을 사진 비율에 맞추기 위한 가로/세로 비율 (사진 id별)
  const [ratios, setRatios] = useState<Record<string, number>>({});
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
  const { regionList, error: regionError } = useRegionList();
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
  // 경계를 받을 지역: 직접 고른 지역 + GPS 좌표가 bbox에 들어가는 지역들 (보통 1~2곳)
  // 둘 다 받아야 고른 동과 GPS 위치가 다를 때 "좌표가 달라요" 안내가 뜸 (경기도 밖으로 잘못 판정 안 함)
  // useRegionBoundaries가 배열 내용으로 키를 만들어서 useMemo 없이 매번 새로 만들어도 다시 요청 안 함
  const candidateSet = new Set<string>();
  if (photo?.regionCode) candidateSet.add(photo.regionCode);
  if (latitude !== undefined && longitude !== undefined && regionList) {
    for (const { regionCode, bbox: [minLng, minLat, maxLng, maxLat] } of regionList.regions) {
      if (longitude >= minLng && longitude <= maxLng && latitude >= minLat && latitude <= maxLat) {
        candidateSet.add(regionCode);
      }
    }
  }
  const candidateCodes = [...candidateSet];
  const { regions: loadedRegions, error: boundaryError } = useRegionBoundaries(candidateCodes);
  const uploading = photos.some((p) => p.status === "uploading");
  const pending = photos.some((p) => p.status !== "success");
  const results = photos.filter((p) => p.result);
  // 완료 화면 개략도: 이번에 올린 사진들이 속한 지역 (동 코드 앞 4자리)
  const resultRegionCodes = [...new Set(results.flatMap((p) => p.result ? [p.result.dongCode.slice(0, 4)] : []))];
  const { regions: resultRegions } = useRegionBoundaries(resultRegionCodes);
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
      return { id: crypto.randomUUID(), file, url, metadata: {}, takenAt: "", dongCode: "", regionCode: "", isPublic: true, status: "reading" };
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

  const features = loadedRegions.flatMap((region) => region.features);
  const located = latitude !== undefined && longitude !== undefined ? findDong(features, latitude, longitude) : undefined;
  // 지금 사진의 지역: 직접 고른 지역 → GPS로 찾은 동의 지역 순
  const regionCode = photo?.regionCode || located?.properties.dongCode.slice(0, 4) || "";
  const regionFeatures = features.filter((f) => f.properties.dongCode.startsWith(regionCode));
  // GPS로 찾은 동은 그 동이 지금 지역에 있을 때만 기본값으로 씀
  // (GPS는 시흥인데 부천을 고르면 동을 새로 골라야 함 → 고르면 "좌표가 달라요" 안내)
  const selectedFeature = regionFeatures.find((f) => f.properties.dongCode === photo?.dongCode)
    ?? (located?.properties.dongCode.startsWith(regionCode) ? located : undefined);
  // 후보 지역 경계를 다 받았는데도 어느 동에도 안 들어가면 경기도 밖
  const boundariesReady = loadedRegions.length === candidateCodes.length;
  const outside = Boolean(regionList && boundariesReady && latitude !== undefined && longitude !== undefined && !located);

  // 서버의 exifVerified 조건을 FE에서 미리 확인: 사진에 촬영 시각·GPS가 있고 둘 다 바꾸지 않았을 때만 true
  // (PhotoService: EXIF 시각과 같고 좌표가 거의 같아야 함). 업로드 팝업의 공개 잠금 안내에만 사용
  const exifIntact = Boolean(photo?.metadata.takenAt && photo.metadata.latitude !== undefined && photo.metadata.longitude !== undefined
    && photo.takenAt === photo.metadata.takenAt && photo.latitude === photo.metadata.latitude && photo.longitude === photo.metadata.longitude);

  const locationMismatch = Boolean(located && selectedFeature && located.properties.dongCode !== selectedFeature.properties.dongCode);
  // 촬영 위치(좌표)가 정해졌고 고른 동 안에 있을 때 → 지도 버튼을 "선택된 위치 수정"으로 표시
  const locationPicked = latitude !== undefined && longitude !== undefined && !locationMismatch && !outside;

  // isPublic: 업로드 팝업에서 고른 값 (동 상세에 사진을 보여 줄지)
  async function submit(isPublic: boolean) {
    if (!photo || sending.current || !photo.colors || !selectedFeature || locationMismatch || outside) return;
    const takenAt = parseLocalTime(photo.takenAt);
    const seasonError = photoSeasonError(photo.takenAt);
    if (!takenAt || seasonError || !validateColors(photo.colors.palette, photo.colors.bins)) {
      update(photo.id, { error: seasonError ?? "촬영 시각 또는 색상 분석 결과를 확인해 주세요." });
      setConfirmOpen(false);
      return;
    }
    sending.current = true;
    setUploadPhase("uploading");
    update(photo.id, { status: "uploading", error: undefined, isPublic });
    try {
      // 토큰 재발급 겸 최신 동의 상태 확인
      const me = await getMyInfo();
      setMe(me);
      // 화면에 보인 동의 상태와 다르면(내 정보를 불러오기 전이거나 다른 탭에서 바꾼 경우) 화면을 맞추고 다시 확인받아요.
      // 서버 값만 보고 좌표를 보내면, 동만 고르던 화면에서 GPS와 다른 동을 고른 경우 DONG_GPS_MISMATCH로 실패해요.
      if (me.locationAgreed !== locationAgreed) {
        update(photo.id, { status: "ready", error: "위치정보 동의 상태를 다시 확인해 화면을 맞췄어요. 촬영 위치를 확인한 뒤 다시 눌러 주세요." });
        setConfirmOpen(false);
        return;
      }
      const result = await uploadPhoto(photo.file, {
        dongCode: selectedFeature.properties.dongCode, latitude, longitude,
        takenAt, isPublic, palette: photo.colors.palette, bins: photo.colors.bins,
      });
      // 다음 사진으로 넘어가기 전에 팝업부터 닫음
      setConfirmOpen(false);
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
      // 로그인 만료는 화면의 "다시 로그인하기"로 안내하고, 나머지는 팝업에서 이유를 보여 줌
      if (expired) {
        setConfirmOpen(false);
        expireSession();
      } else {
        setUploadPhase("error");
      }
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
    ? photo.status === "reading" ? { dot: "bg-brand", text: "text-brand-strong", label: "사진 정보 확인 중…" }
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
          <UploadPixels dragging={dragging} />
          <h2 className="text-2xl font-extrabold tracking-[-0.56px] sm:text-[28px]">사진을 끌어다 놓으면, 픽셀이 됩니다</h2>
          <p className="flex flex-wrap items-center justify-center gap-2 text-base text-ink-sub">여러 장을 한 번에 올려도 한 장씩 확인해요 <span className="text-[#aeb6c4]" aria-hidden>·</span><span className="font-mono text-sm">JPG PNG · 10MB 이하</span></p>
          <button type="button" onClick={() => input.current?.click()} className="h-[52px] rounded-xl bg-brand px-[30px] text-base font-extrabold text-white transition-colors hover:bg-brand-hover">사진 고르기</button>
        </div>
        <ol className="mt-[18px] grid border-t border-line sm:grid-cols-3">{steps.map(([label, description], i) => <li key={label} className={`pt-5 pb-4 sm:min-h-[90px] ${i > 0 ? "sm:border-l sm:border-line sm:pl-6" : ""}`}>
          <span className="font-mono text-[13px] text-brand-strong">0{i + 1}</span>
          <p className="mt-2 text-base font-bold">{label}</p>
          <p className="mt-1 text-sm text-ink-sub">{description}</p>
        </li>)}</ol>
      </> : finished ? <UploadComplete photos={results.flatMap((p) => p.result ? [{ id: p.id, filename: p.file.name, color: p.colors?.palette[0] ?? "#F0F2F4", result: p.result }] : [])} regions={resultRegions} onAdd={() => input.current?.click()} /> : <>
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pt-2 pb-4">
          <div><p className="font-mono text-[13px] tracking-[1.04px] text-brand-strong">PHOTO {index + 1} / {photos.length}</p><h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.78px]">사진 한 장, 픽셀 하나</h1></div>
          <div className="flex items-center gap-2"><span aria-live="polite" className="mr-2 text-sm text-ink-muted">{results.length}장 완료</span><button type="button" className={navButton} disabled={index === 0 || uploading} onClick={() => setIndex(index - 1)}>← 이전</button><button type="button" className={navButton} disabled={index === photos.length - 1 || uploading} onClick={() => setIndex(index + 1)}>다음 →</button></div>
        </div>
        <div className="mt-[18px] grid items-start gap-7 lg:grid-cols-[1.35fr_1fr]">
          <section aria-label="선택한 사진">
            <div className={`relative mx-auto flex items-center justify-center overflow-hidden rounded-2xl bg-preview ${photo.status !== "invalid" && ratios[photo.id] ? "" : "h-[300px] w-full sm:h-[420px]"}`} style={photo.status !== "invalid" && ratios[photo.id] ? { aspectRatio: ratios[photo.id], width: `min(100%, ${Math.round(PREVIEW_MAX_HEIGHT * ratios[photo.id])}px)` } : undefined}>
              {photo.status !== "invalid" && <img src={photo.url} alt={`${index + 1}번째 선택한 사진`} className="h-full w-full object-contain" onLoad={(e) => { const { naturalWidth: w, naturalHeight: h } = e.currentTarget; const id = photo.id; if (w && h) setRatios((prev) => prev[id] ? prev : { ...prev, [id]: w / h }); }} />}
              {previewStatus && <span className="absolute top-4 right-4 flex h-[30px] items-center gap-1.5 rounded-lg bg-white px-2.5 text-[13px] font-bold"><span className={`size-2 rounded-full ${previewStatus.dot}`} aria-hidden /><span className={previewStatus.text}>{previewStatus.label}</span></span>}
              <span className="absolute bottom-4 left-4 flex h-[29px] max-w-[90%] items-center rounded-lg bg-white px-2.5 font-mono text-[13px]"><span className="truncate">{photo.file.name} · {(photo.file.size / 1024 / 1024).toFixed(1)}MB</span></span>
            </div>
            <div className="mt-[18px] mb-3 flex items-baseline justify-between"><h2 className="text-base font-bold">대표색</h2><span className="text-[13px] text-ink-muted">많이 쓰인 순서</span></div>
            {photo.colors ? <><div className="flex h-10 overflow-hidden rounded-[10px]">{paletteShares(photo.colors).map(({ color, width }, i) => <span key={i} style={{ background: color, width: `${width * 100}%` }} />)}</div><div className="mt-4 flex flex-wrap justify-between gap-x-4 gap-y-2 font-mono text-[13px]">{paletteShares(photo.colors).map(({ color, share }, i) => <span key={i} className="flex items-center gap-2"><span className="size-3.5 rounded-[3px]" style={{ background: color }} aria-hidden />{color} <span className="text-ink-muted">{Math.round(share * 100)}%</span></span>)}</div></>
              : photo.status === "reading" ? <><div className="flex h-10 animate-pulse overflow-hidden rounded-[10px] bg-preview" aria-hidden><span className="flex-[31]" /><span className="flex-[24] bg-[#dbe0e9]" /><span className="flex-[18]" /><span className="flex-[16] bg-[#dbe0e9]" /><span className="flex-[11]" /></div><p role="status" className="mt-4 text-[13px] text-ink-muted">사진 정보와 대표색을 분석 중이에요…</p></>
              : <p role="status" className="rounded-xl border border-card-line bg-white p-4 text-sm text-ink-muted">대표색을 표시할 수 없어요. 사진 정보 입력의 오류 안내를 확인해 주세요.</p>}
          </section>
          <section className="overflow-hidden rounded-2xl border border-card-line bg-white" aria-label="사진 정보 입력">
            {photo.error && <p ref={errorRef} tabIndex={-1} role="alert" className="mx-6 mt-5 rounded-xl border border-danger-line bg-danger-soft p-3 text-sm text-danger">{photo.error}</p>}
            {photo.needsLogin && <Link to="/login" className="mx-6 mt-3 inline-block text-sm text-brand-strong underline">다시 로그인하기</Link>}
            <fieldset disabled={uploading || photo.status === "success" || photo.status === "reading" || photo.status === "invalid"}>
              <div className="px-6 pt-6 pb-6">
                <div className="flex items-center justify-between gap-3"><h2 className="text-base font-bold">촬영 시간</h2>{!photo.metadata.takenAt && <span className={badgeNeed}>직접 입력 필요</span>}</div>
                <input type="datetime-local" step="1" aria-label="촬영 날짜·시각 (한국 시간)" readOnly={Boolean(photo.metadata.takenAt)} value={photo.takenAt} onChange={(e) => update(photo.id, { takenAt: e.target.value, error: photoSeasonError(e.target.value), status: photo.status === "error" ? "ready" : photo.status })} className={`${field} mt-4 read-only:bg-field`} />
                <div className="mt-3 grid grid-cols-4 gap-2.5">{bands.map(([band, label, range]) => <div key={band} className={`flex h-[68px] flex-col justify-center gap-1 rounded-[10px] border px-2.5 ${timeBand(photo.takenAt) === band ? "border-navy bg-navy text-white" : "border-field-line bg-white"}`}><p className="text-[15px] font-bold">{label}</p><p className={`font-mono text-xs ${timeBand(photo.takenAt) === band ? "text-navy-sub" : "text-ink-muted"}`}>{range}</p></div>)}</div>
              </div>
              <div className="border-t border-divider px-6 pt-6 pb-6">
                <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-base font-bold">촬영 위치</h2>{consent === false ? <span className={badgeNeed}>동만 선택</span> : locationAgreed && photo.metadata.latitude === undefined && <span className={badgeNeed}>직접 입력 필요</span>}</div>
                {consent === false && <p className="mb-3 rounded-xl bg-field p-3 text-xs leading-5 text-ink-sub">위치정보 이용에 동의하지 않아 촬영 위치는 저장하지 않고 동만 저장해요. 이 사진은 나의 지도에만 반영되고 공유 지도에는 반영되지 않아요. 동의는 마이페이지에서 바꿀 수 있어요.</p>}
                {locationAgreed && photo.status !== "reading" && photo.status !== "invalid" && photo.metadata.latitude === undefined && <p className="mb-3 rounded-xl bg-brand-soft p-3 text-xs leading-5 text-brand-strong">사진의 GPS 정보를 확인하지 못했어요. 휴대폰에서 사진을 선택하거나 촬영하는 과정에서 위치정보가 빠질 수 있어요. 위치를 직접 선택하면 나의 지도에만 반영돼요.</p>}
                {boundaryError && <p role="alert" className="mb-3 text-sm text-danger">{boundaryError} 새로고침 후 다시 시도해 주세요.</p>}
                {locationMismatch && <p role="alert" className="mb-3 text-sm text-brand-strong">선택한 동과 사진 좌표가 달라요. 지도에서 새 촬영 위치를 확정해 주세요.</p>}
                {outside && <p role="alert" className="mb-3 text-sm text-brand-strong">경기도 밖의 위치예요. 경기도에서 찍은 사진만 더할 수 있어요. 잘못 기록된 위치라면 지역과 동을 고른 뒤 지도에서 실제 촬영 위치를 선택해 주세요.</p>}
                {regionError && <p role="alert" className="mb-3 text-sm text-danger">{regionError} 새로고침 후 다시 시도해 주세요.</p>}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <span className="relative block">
                    <select
                      aria-label="지역"
                      disabled={!regionList}
                      value={regionCode}
                      // 지역을 바꾸면 고른 동과 지도에서 고른 위치는 비우고, 사진 GPS 좌표로 되돌림
                      onChange={(e) => update(photo.id, { regionCode: e.target.value, dongCode: "", latitude: photo.metadata.latitude, longitude: photo.metadata.longitude })}
                      className={`${field} appearance-none border-select-line pr-10 disabled:bg-field disabled:text-ink-faint`}
                    >
                                            <option value="">{regionList ? "지역을 골라 주세요" : "지역 불러오는 중…"}</option>
                      {regionList?.regions.map((r) => <option key={r.regionCode} value={r.regionCode}>{r.name}</option>)}
                    </select>
                    <img src={chevronDown} alt="" width={16} height={16} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2" />
                  </span>
                  <span className="relative block">
                    <select
                      aria-label="행정동"
                      disabled={!regionCode || !boundariesReady}
                      value={selectedFeature?.properties.dongCode ?? ""}
                      onChange={(e) => update(photo.id, { regionCode, dongCode: e.target.value, latitude: photo.metadata.latitude, longitude: photo.metadata.longitude })}
                      className={`${field} appearance-none border-select-line pr-10 disabled:bg-field disabled:text-ink-faint`}
                    >
                      <option value="">{!regionList || (regionCode && !boundariesReady) ? "행정동 불러오는 중…" : !regionCode ? "지역을 먼저 골라 주세요" : "동을 골라 주세요"}</option>
                      {/* 구가 없는 시·군은 동 이름만 */}
                      {regionFeatures.map((f) => <option key={f.properties.dongCode} value={f.properties.dongCode}>{f.properties.guName ? `${f.properties.guName} · ${f.properties.name}` : f.properties.name}</option>)}
                    </select>
                    <img src={chevronDown} alt="" width={16} height={16} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2" />
                  </span>
                </div>
                {locationAgreed && <>
                <button type="button" disabled={!selectedFeature} onClick={() => setMapOpen(true)} className="mt-2.5 flex h-11 w-full items-center gap-2 rounded-[10px] bg-field px-3.5 text-left text-sm text-ink transition-colors hover:bg-[#e9edf4] disabled:cursor-not-allowed disabled:text-ink-faint disabled:hover:bg-field">{locationPicked
                  // 위치를 고른 뒤: 아이콘을 지도에 더하기 버튼과 같은 파란색으로
                  ? <span aria-hidden className="size-4 shrink-0 bg-brand" style={{ maskImage: `url("${mapPin}")`, WebkitMaskImage: `url("${mapPin}")`, maskSize: "100% 100%", WebkitMaskSize: "100% 100%" }} />
                  : <img src={mapPin} alt="" width={16} height={16} />}
                  {locationPicked ? "선택된 위치 수정" : "지도에서 촬영 위치 선택"}</button>
                <p className="mt-4 text-xs leading-5 text-ink-muted">촬영 시각이나 위치를 직접 입력하면 나의 지도에만 반영될 수 있어요.</p>
                </>}
              </div>
              <div className="flex flex-col gap-3 border-t border-divider px-6 pt-6 pb-3">
                <p className="text-center text-xs text-ink-muted">누르면 사진 공개 여부를 고를 수 있어요</p>
                <button type="button" onClick={() => { setUploadPhase("choose"); setConfirmOpen(true); }} disabled={!photo.colors || !parseLocalTime(photo.takenAt) || Boolean(photoSeasonError(photo.takenAt)) || !selectedFeature || outside || locationMismatch} className={primary}>{photo.status === "uploading" ? "지도에 더하는 중…" : photo.status === "success" ? "업로드 완료" : photo.status === "error" ? "다시 시도" : index < photos.length - 1 ? "지도에 더하고 다음 사진" : "지도에 더하기"}</button>
              </div>
            </fieldset>
            <div className="flex flex-wrap justify-between gap-3 px-6 pt-3 pb-6 text-sm"><button type="button" disabled={uploading} onClick={removeCurrent} className="text-ink-sub underline underline-offset-4 disabled:opacity-40">이 사진 목록에서 빼기</button><button type="button" disabled={uploading} onClick={() => input.current?.click()} className="font-bold text-brand-strong underline underline-offset-4 disabled:opacity-40">사진 추가</button></div>
          </section>
        </div>
        {confirmOpen && selectedFeature && <UploadConfirmDialog key={photo.id} summary={[selectedFeature.properties.name, bands.find(([band]) => band === timeBand(photo.takenAt))?.[1]].filter(Boolean).join(" · ")} defaultPublic={photo.isPublic} canBePublic={exifIntact && locationAgreed} phase={uploadPhase} errorMessage={photo.error} onCancel={() => setConfirmOpen(false)} onConfirm={(isPublic) => void submit(isPublic)} onRetry={() => setUploadPhase("choose")} />}
        {mapOpen && locationAgreed && selectedFeature && <LocationDialog key={photo.id + selectedFeature.properties.dongCode} feature={selectedFeature} initialPoint={latitude !== undefined && longitude !== undefined ? { lat: latitude, lng: longitude } : undefined} onClose={() => setMapOpen(false)} onConfirm={(latitude, longitude) => { update(photo.id, { latitude, longitude }); setMapOpen(false); }} />}
      </>}
    </main>
  </div>;
}
