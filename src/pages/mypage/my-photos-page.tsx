import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ApiError } from "../../api/client";
import {
  deletePhoto,
  getMyPhotos,
  getPhotoDetail,
  type MyPhotoItem,
  type MyPhotosResponse,
  type PhotoDetail,
} from "../../api/photo";
import { AuthHeader } from "../../components/layout/auth-header";
import { UploadButton } from "../../components/layout/upload-button";
import { isSessionExpired, useExpireSession } from "../../hooks/use-expire-session";
import { getPhotoColorRatios } from "../dong/photo-color-ratios";
import { useUserStore } from "../../stores/user-store";
import { formatDate } from "../../utils/date";

const PAGE_SIZE = 12;
const timeBandLabel = {
  DAWN: "새벽",
  DAY: "낮",
  SUNSET: "노을",
  NIGHT: "밤",
} as const;

function formatDateTime(value: string) {
  return `${formatDate(value)} ${value.slice(11, 16)}`;
}

function PhotoThumbnail({ photo }: { photo: MyPhotoItem }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-preview">
      {photo.thumbnailUrl && !failed ? (
        <img
          src={photo.thumbnailUrl}
          alt={`${photo.name}에서 촬영한 사진`}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="grid h-full place-items-center" style={{ backgroundColor: photo.color }}>
          <span className="rounded-lg bg-white/80 px-3 py-1 text-xs font-bold text-ink-sub">
            미리보기 없음
          </span>
        </div>
      )}
    </div>
  );
}

// 상세 팝업 사진 크기 한도. 팝업 폭이 사진 폭에 맞게 바뀜 (좌우 여백 px-6 = 48px)
const DIALOG_PADDING = 48;
const DIALOG_PHOTO_MAX_WIDTH = 560;
const DIALOG_PHOTO_MAX_HEIGHT = 520;
// 촬영 정보 줄이 들어갈 최소 폭
const DIALOG_PHOTO_MIN_WIDTH = 312;

function dialogPhotoSize(naturalWidth: number, naturalHeight: number) {
  const ratio = naturalWidth / naturalHeight;
  // 화면이 작으면 화면 안에 들어오게 (양옆 바깥 여백 24px, 높이는 화면의 55%)
  const maxWidth = Math.min(DIALOG_PHOTO_MAX_WIDTH, window.innerWidth - 24 - DIALOG_PADDING);
  const maxHeight = Math.min(DIALOG_PHOTO_MAX_HEIGHT, window.innerHeight * 0.55);
  const width = Math.round(Math.min(maxWidth, maxHeight * ratio));
  return { width, height: Math.round(width / ratio) };
}

type DetailDialogProps = {
  photo: MyPhotoItem;
  onClose: () => void;
  onDeleted: () => void;
};

function PhotoDetailDialog({ photo, onClose, onDeleted }: DetailDialogProps) {
  const expireSession = useExpireSession();
  const [detail, setDetail] = useState<PhotoDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  // 사진 원래 크기 (다 받은 뒤 팝업 폭을 사진에 맞춤)
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const photoSize = natural && !imageFailed ? dialogPhotoSize(natural.width, natural.height) : null;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const ratios = detail ? getPhotoColorRatios(detail.palette, detail.bins) : [];

  useEffect(() => {
    let ignore = false;
    getPhotoDetail(photo.photoId, true)
      .then((result) => { if (!ignore) setDetail(result); })
      .catch((error: unknown) => {
        if (ignore) return;
        if (isSessionExpired(error)) expireSession();
        else setLoadError(error instanceof ApiError ? error.message : "사진 정보를 불러오지 못했어요.");
      });
    return () => { ignore = true; };
  }, [photo.photoId, expireSession]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || deleting) return;
      if (confirmDelete) setConfirmDelete(false);
      else onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [confirmDelete, deleting, onClose]);

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deletePhoto(photo.photoId);
      onDeleted();
    } catch (error) {
      if (isSessionExpired(error)) expireSession();
      else setDeleteError(error instanceof ApiError ? error.message : "사진을 삭제하지 못했어요.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-3 sm:p-6"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) onClose(); }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${photo.name} 사진 상세`}
        className={`my-auto overflow-hidden rounded-[20px] bg-white text-ink shadow-[0_8px_16px_rgba(0,0,0,0.12)] ${photoSize ? "max-w-full" : "w-full max-w-[480px]"}`}
        style={
          photoSize
            ? { width: Math.max(photoSize.width, DIALOG_PHOTO_MIN_WIDTH) + DIALOG_PADDING }
            : undefined
        }
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <p className="font-mono text-[13px] tracking-[1.04px] text-brand-strong">PHOTO DETAIL</p>
          <button type="button" autoFocus aria-label="사진 상세 닫기" onClick={onClose} className="flex size-9 items-center justify-center rounded-[10px] border border-line text-ink-sub hover:bg-field"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></button>
        </div>
        <div className="max-h-[calc(100dvh-140px)] overflow-y-auto px-6 pb-6">
          {loadError && <p role="alert" className="mb-3 text-sm text-danger">{loadError}</p>}
          {!detail && !loadError && <p className="py-10 text-center text-sm text-ink-muted">사진을 불러오는 중...</p>}
          {detail && (
            <>
              {detail.imageUrl && !imageFailed ? (
                // 원래 비율 그대로, 잘리지 않게 (아주 좁은 사진은 양옆을 옅은 배경으로)
                <div className="flex justify-center overflow-hidden rounded-[14px] bg-field">
                  <img
                    src={detail.imageUrl}
                    alt={`${photo.name} 사진`}
                    onLoad={(event) =>
                      setNatural({
                        width: event.currentTarget.naturalWidth,
                        height: event.currentTarget.naturalHeight,
                      })
                    }
                    onError={() => setImageFailed(true)}
                    style={photoSize ?? undefined}
                    className={photoSize ? "block" : "block aspect-[4/3] w-full object-contain opacity-0"}
                  />
                </div>
              ) : (
                <div className="flex aspect-[4/3] w-full overflow-hidden rounded-[14px]">
                  {detail.palette.map((color, index) => (
                    <div
                      key={index}
                      className="h-full shrink-0"
                      style={{ backgroundColor: color, width: `${ratios[index] * 100}%` }}
                    />
                  ))}
                </div>
              )}
              {/* 업로드 때 고른 공개 여부만 표시 (공유 지도 색 반영은 공개 여부와 별개라 여기서 말하지 않음) */}
              <p className="mt-4 inline-block rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand-strong">
                {photo.isPublic ? "공개" : "나만 보기"}
              </p>
              <h3 className="mt-7 border-b border-divider pb-3 text-sm font-bold text-ink">촬영 정보</h3>
              <dl className="space-y-4 py-4 text-sm">
                <div className="flex gap-4"><dt className="w-24 shrink-0 text-ink-muted">촬영 일시</dt><dd className="font-bold text-ink">{formatDateTime(detail.takenAt)}</dd></div>
                <div className="flex gap-4"><dt className="w-24 shrink-0 text-ink-muted">촬영 지역</dt><dd className="font-bold text-ink">{detail.name}</dd></div>
                <div className="flex gap-4"><dt className="w-24 shrink-0 text-ink-muted">시간대</dt><dd className="font-bold text-ink">{timeBandLabel[detail.timeBand]}</dd></div>
              </dl>
            </>
          )}
          <p className="mt-3 border-t border-divider pt-4 text-xs leading-5 text-ink-muted">삭제하면 사진이 내 목록에서 사라지고 지도 집계도 갱신돼요.</p>
          <button
            type="button"
            onClick={() => { setDeleteError(null); setConfirmDelete(true); }}
            className="mt-4 w-full rounded-xl border border-danger-line bg-danger-soft py-3 text-sm font-bold text-danger transition-colors hover:bg-[#fbdcdc]"
          >
            이 사진 삭제하기
          </button>
        </div>
      </section>
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-photo-title" aria-describedby="delete-photo-description" className="w-full max-w-[440px] rounded-[20px] bg-white p-7 text-ink shadow-[0_8px_16px_rgba(0,0,0,0.12)]">
            <div className="grid size-11 place-items-center rounded-full bg-danger-soft text-xl font-bold text-danger">!</div>
            <h3 id="delete-photo-title" className="mt-5 text-[22px] leading-[26px] font-extrabold">이 사진을 삭제할까요?</h3>
            <p id="delete-photo-description" className="mt-3 text-sm leading-6 text-ink-sub">삭제하면 사진이 목록에서 사라지며 되돌릴 수 없어요.</p>
            {deleteError && <p role="alert" className="mt-3 text-sm text-danger">{deleteError}</p>}
            <div className="mt-7 grid grid-cols-2 gap-3">
              <button type="button" autoFocus disabled={deleting} onClick={() => setConfirmDelete(false)} className="h-12 rounded-xl border border-line bg-white px-4 text-[15px] text-ink-sub hover:bg-field disabled:opacity-50">취소</button>
              <button type="button" disabled={deleting} onClick={handleDelete} className="h-12 rounded-xl bg-danger px-4 text-[15px] font-extrabold text-white transition-colors hover:bg-[#8c1d17] disabled:opacity-50">{deleting ? "삭제 중..." : "삭제하기"}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export function MyPhotosPage() {
  const expireSession = useExpireSession();
  const [page, setPage] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState<MyPhotosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MyPhotoItem | null>(null);

  useEffect(() => {
    let ignore = false;
    getMyPhotos(page, PAGE_SIZE)
      .then((result) => {
        if (ignore) return;
        setData(result);
        setLoading(false);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (ignore) return;
        if (isSessionExpired(reason)) expireSession();
        else {
          setError(reason instanceof ApiError ? reason.message : "내 사진을 불러오지 못했어요.");
          setLoading(false);
        }
      });
    return () => { ignore = true; };
  }, [page, refreshKey, expireSession]);

  function changePage(nextPage: number) {
    setData(null);
    setLoading(true);
    setError(null);
    setSelected(null);
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDeleted() {
    setSelected(null);
    // 해당 페이지의 마지막 사진이면 빈 페이지 대신 앞 페이지로 돌아간다.
    if (data?.photos.length === 1 && page > 0) changePage(page - 1);
    else {
      setData(null);
      setLoading(true);
      setRefreshKey((value) => value + 1);
    }
    // 헤더 프로필은 유지하고 삭제된 사진 수만 갱신한다.
    const { me, updateMe } = useUserStore.getState();
    if (typeof me?.photoCount === "number") {
      updateMe({ photoCount: Math.max(0, me.photoCount - 1) });
    }
  }

  const photos = data?.photos ?? [];
  const firstNumber = page * PAGE_SIZE + 1;
  const lastNumber = Math.min((page + 1) * PAGE_SIZE, data?.totalElements ?? 0);

  return (
    <div className="min-h-screen bg-page">
      {/* 마이페이지와 같은 헤더 (업로드 버튼만) */}
      <AuthHeader>
        <UploadButton />
      </AuthHeader>
      {/* 마이페이지와 같은 본문 폭 1160px(양옆 여백 16px 포함 1192px)·제목 크기 */}
      <main className="mx-auto w-full max-w-[1192px] px-4 pt-4 pb-12">
        <p className="mt-2 font-mono text-[13px] tracking-[1.04px] text-brand-strong">MY PHOTOS</p>
        {/* 제목 왼쪽 뒤로가기: 마이페이지로 */}
        <div className="mt-3 flex items-center gap-3">
          <Link
            to="/mypage"
            aria-label="마이페이지로 돌아가기"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-ink-sub transition-colors hover:bg-field hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <path
                d="M10 3L5 8l5 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <h1 className="text-[30px] font-extrabold tracking-[-0.9px] text-ink">내 사진 모아보기</h1>
        </div>
        <p className="mt-2 text-base text-ink-sub">내가 올린 사진을 모아 보고, 사진을 누르면 촬영 정보를 보거나 삭제할 수 있어요.</p>
        <div className="mt-6 mb-3 flex items-center justify-between gap-4">
          {/* 올린 사진 수는 제목 옆에 작게 */}
          <h2 className="flex items-baseline gap-2 text-[17px] leading-[25px] font-bold text-ink">
            나의 기록
            {data && (
              <span className="text-sm font-normal text-ink-muted">
                <b className="font-bold text-ink">{data.totalElements.toLocaleString()}</b>장
              </span>
            )}
          </h2>
          <span className="text-[13px] text-ink-muted">최신순</span>
        </div>
        {error ? (
          <div role="alert" className="rounded-2xl border border-danger-line bg-white px-6 py-10 text-center">
            <p className="text-sm text-danger">{error}</p>
            <button type="button" onClick={() => { setLoading(true); setError(null); setRefreshKey((value) => value + 1); }} className="mt-4 h-10 rounded-[10px] bg-brand px-4 text-sm font-bold text-white transition-colors hover:bg-brand-hover">다시 시도</button>
          </div>
        ) : loading ? (
          <p role="status" className="rounded-2xl border border-card-line bg-white px-6 py-16 text-center text-sm text-ink-muted">내 사진을 불러오는 중...</p>
        ) : photos.length === 0 ? (
          <div className="rounded-2xl border border-card-line bg-white px-6 py-16 text-center">
            <p className="font-bold text-ink">아직 업로드한 사진이 없어요.</p>
            <p className="mt-2 text-sm text-ink-muted">사진을 업로드하고 동네의 색을 기록해 보세요.</p>
            <Link to="/upload" className="mt-5 inline-flex h-11 items-center rounded-xl bg-brand px-5 text-sm font-bold text-white transition-colors hover:bg-brand-hover">첫 사진 업로드</Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {photos.map((photo) => (
                <button
                  key={photo.photoId}
                  type="button"
                  onClick={() => setSelected(photo)}
                  aria-label={`${photo.name} ${formatDate(photo.takenAt)} 사진 상세 보기`}
                  className="overflow-hidden rounded-2xl border border-card-line bg-white text-left transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(26,36,64,0.10)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <PhotoThumbnail photo={photo} />
                  <div className="flex items-start justify-between gap-2 px-3 py-3 sm:px-4 sm:py-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink sm:text-base">{photo.name}</p>
                      <p className="mt-1 font-mono text-[11px] text-ink-muted sm:text-xs">{formatDate(photo.takenAt)} · {timeBandLabel[photo.timeBand]}</p>
                    </div>
                    <span className="mt-1 size-3 shrink-0 rounded-[3px]" style={{ backgroundColor: photo.color }} aria-hidden="true" />
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[13px] text-ink-muted">
              <p>{firstNumber}–{lastNumber} / {data?.totalElements.toLocaleString()}장</p>
              <div className="flex items-center gap-2">
                <button type="button" disabled={page === 0} onClick={() => changePage(page - 1)} className="h-9 rounded-[10px] border border-line bg-white px-4 font-bold text-ink-sub hover:bg-field disabled:opacity-40">이전</button>
                <span aria-label="현재 페이지" className="min-w-7 text-center font-bold text-ink">{page + 1}</span>
                <button type="button" disabled={!data?.hasNext} onClick={() => changePage(page + 1)} className="h-9 rounded-[10px] border border-line bg-white px-4 font-bold text-ink-sub hover:bg-field disabled:opacity-40">다음</button>
              </div>
            </div>
          </>
        )}
      </main>
      {selected && <PhotoDetailDialog key={selected.photoId} photo={selected} onClose={() => setSelected(null)} onDeleted={handleDeleted} />}
    </div>
  );
}
