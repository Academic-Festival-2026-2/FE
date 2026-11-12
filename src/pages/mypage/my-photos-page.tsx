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
import { ProfileMenu } from "../../components/layout/profile-menu";
import { isSessionExpired, useExpireSession } from "../../hooks/use-expire-session";
import { useUserStore } from "../../stores/user-store";

const PAGE_SIZE = 12;
const timeBandLabel = {
  DAWN: "새벽",
  DAY: "낮",
  SUNSET: "노을",
  NIGHT: "밤",
} as const;

function formatDate(value: string) {
  return value.slice(0, 10).replaceAll("-", ".");
}

function formatDateTime(value: string) {
  return `${formatDate(value)} ${value.slice(11, 16)}`;
}

function PhotoThumbnail({ photo }: { photo: MyPhotoItem }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-[#e9edf4]">
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
          <span className="rounded-lg bg-white/80 px-3 py-1 text-xs font-semibold text-gray-700">
            미리보기 없음
          </span>
        </div>
      )}
    </div>
  );
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
        className="my-auto w-full max-w-[480px] overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <p className="font-mono text-xs tracking-widest text-[#4274d9]">PHOTO DETAIL</p>
          <button type="button" autoFocus aria-label="사진 상세 닫기" onClick={onClose} className="rounded-lg px-2 text-2xl text-gray-500 hover:bg-gray-100">×</button>
        </div>
        <div className="max-h-[calc(100dvh-140px)] overflow-y-auto px-6 pb-6">
          {loadError && <p role="alert" className="mb-3 text-sm text-red-600">{loadError}</p>}
          {!detail && !loadError && <p className="py-10 text-center text-sm text-gray-500">사진을 불러오는 중...</p>}
          {detail && (
            <>
              {detail.imageUrl && !imageFailed ? (
                <img
                  src={detail.imageUrl}
                  alt={`${photo.name} 사진`}
                  onError={() => setImageFailed(true)}
                  className="aspect-[4/3] w-full rounded-lg object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] w-full overflow-hidden rounded-lg">
                  {detail.palette.map((color, index) => (
                    <div key={index} className="flex-1" style={{ backgroundColor: color }} />
                  ))}
                </div>
              )}
              <h2 className="mt-5 text-xl font-extrabold text-gray-900">{photo.name}에서 찍은 사진</h2>
              <p className="mt-3 inline-block rounded-full bg-[#eaf0fb] px-3 py-1 text-xs font-bold text-[#4274d9]">
                {photo.aiVerdict === "PERSONAL_ONLY" ? "나의 지도 전용" : photo.aiVerdict === "UNCHECKED" ? "검수 미완료" : photo.isPublic ? "공개 사진" : "비공개 사진"}
              </p>
              <h3 className="mt-7 border-b border-[#e1e6ee] pb-3 text-sm font-bold text-gray-900">촬영 정보</h3>
              <dl className="space-y-4 py-4 text-sm">
                <div className="flex gap-4"><dt className="w-24 shrink-0 text-gray-500">촬영 일시</dt><dd className="font-semibold text-gray-900">{formatDateTime(detail.takenAt)}</dd></div>
                <div className="flex gap-4"><dt className="w-24 shrink-0 text-gray-500">촬영 지역</dt><dd className="font-semibold text-gray-900">{detail.name}</dd></div>
                <div className="flex gap-4"><dt className="w-24 shrink-0 text-gray-500">시간대</dt><dd className="font-semibold text-gray-900">{timeBandLabel[detail.timeBand]}</dd></div>
              </dl>
            </>
          )}
          <p className="mt-3 border-t border-[#e1e6ee] pt-4 text-xs leading-5 text-gray-500">삭제하면 사진이 내 목록에서 사라지고 지도 집계도 갱신돼요.</p>
          <button
            type="button"
            onClick={() => { setDeleteError(null); setConfirmDelete(true); }}
            className="mt-4 w-full rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-bold text-red-600 hover:bg-red-100"
          >
            이 사진 삭제하기
          </button>
        </div>
      </section>
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-photo-title" aria-describedby="delete-photo-description" className="w-full max-w-[440px] rounded-2xl bg-white p-6 shadow-2xl">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-red-100 text-xl font-bold text-red-600">!</div>
            <h3 id="delete-photo-title" className="mt-5 text-xl font-extrabold text-gray-900">이 사진을 삭제할까요?</h3>
            <p id="delete-photo-description" className="mt-3 text-sm leading-6 text-gray-600">삭제하면 사진이 목록에서 사라지며 되돌릴 수 없어요.</p>
            {deleteError && <p role="alert" className="mt-3 text-sm text-red-600">{deleteError}</p>}
            <div className="mt-7 grid grid-cols-2 gap-3">
              <button type="button" autoFocus disabled={deleting} onClick={() => setConfirmDelete(false)} className="rounded-xl border border-[#e1e6ee] px-4 py-3 text-sm font-bold text-gray-900 disabled:opacity-50">취소</button>
              <button type="button" disabled={deleting} onClick={handleDelete} className="rounded-xl bg-[#cb454c] px-4 py-3 text-sm font-bold text-white hover:bg-[#b73840] disabled:opacity-50">{deleting ? "삭제 중..." : "삭제하기"}</button>
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
    <div className="min-h-screen bg-[#f5f7fa]">
      <div className="bg-white"><AuthHeader><ProfileMenu /></AuthHeader></div>
      <main className="mx-auto w-full max-w-[1192px] px-4 pt-8 pb-20 sm:pt-12">
        <nav aria-label="현재 위치" className="text-xs text-gray-500"><Link to="/mypage" className="hover:underline">마이페이지</Link> / 내 사진</nav>
        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-[0.15em] text-[#4274d9]">MY PHOTOS</p>
            <h1 className="mt-2 text-[28px] font-extrabold text-[#172033] sm:text-[34px]">내 사진 모아보기</h1>
            <p className="mt-2 text-sm text-gray-600">내가 올린 사진을 모아 보고, 필요한 사진은 삭제할 수 있어요.</p>
          </div>
          <Link to="/upload" className="inline-flex h-11 items-center justify-center rounded-xl bg-[#4274d9] px-5 text-sm font-bold text-white hover:bg-[#3666c8]">사진 올리기</Link>
        </div>
        <section aria-label="사진 통계" className="mt-7 flex flex-wrap items-center gap-5 rounded-2xl border border-[#e1e6ee] bg-white px-5 py-4 sm:px-6">
          <div className="min-w-28 border-l-4 border-[#4274d9] pl-4">
            <p className="text-xs text-gray-500">업로드한 사진</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{data ? data.totalElements.toLocaleString() : "-"}장</p>
          </div>
          <p className="text-xs leading-5 text-gray-500 sm:ml-4">사진을 선택하면 촬영 정보와 삭제 버튼을 볼 수 있어요.</p>
        </section>
        <div className="mt-8 mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-extrabold text-[#172033]">나의 기록</h2>
          <span className="text-xs font-semibold text-gray-500">최신순</span>
        </div>
        {error ? (
          <div role="alert" className="rounded-2xl border border-red-200 bg-white px-6 py-10 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button type="button" onClick={() => { setLoading(true); setError(null); setRefreshKey((value) => value + 1); }} className="mt-4 rounded-lg bg-[#4274d9] px-4 py-2 text-sm font-bold text-white">다시 시도</button>
          </div>
        ) : loading ? (
          <p role="status" className="rounded-2xl border border-[#e1e6ee] bg-white px-6 py-16 text-center text-sm text-gray-500">내 사진을 불러오는 중...</p>
        ) : photos.length === 0 ? (
          <div className="rounded-2xl border border-[#e1e6ee] bg-white px-6 py-16 text-center">
            <p className="font-bold text-gray-900">아직 업로드한 사진이 없어요.</p>
            <p className="mt-2 text-sm text-gray-500">사진을 업로드하고 동네의 색을 기록해 보세요.</p>
            <Link to="/upload" className="mt-5 inline-flex rounded-xl bg-[#4274d9] px-5 py-3 text-sm font-bold text-white">첫 사진 올리기</Link>
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
                  className="overflow-hidden rounded-2xl border border-[#e1e6ee] bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4274d9]"
                >
                  <PhotoThumbnail photo={photo} />
                  <div className="flex items-start justify-between gap-2 px-3 py-3 sm:px-4 sm:py-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-gray-900 sm:text-base">{photo.name}</p>
                      <p className="mt-1 text-[11px] text-gray-500 sm:text-xs">{formatDate(photo.takenAt)} · {timeBandLabel[photo.timeBand]}</p>
                    </div>
                    <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: photo.color }} aria-hidden="true" />
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
              <p>{firstNumber}–{lastNumber} / {data?.totalElements.toLocaleString()}장</p>
              <div className="flex items-center gap-2">
                <button type="button" disabled={page === 0} onClick={() => changePage(page - 1)} className="rounded-lg border border-[#e1e6ee] bg-white px-4 py-2 font-semibold text-gray-700 disabled:opacity-40">이전</button>
                <span aria-label="현재 페이지" className="min-w-7 text-center font-bold">{page + 1}</span>
                <button type="button" disabled={!data?.hasNext} onClick={() => changePage(page + 1)} className="rounded-lg border border-[#e1e6ee] bg-white px-4 py-2 font-semibold text-gray-700 disabled:opacity-40">다음</button>
              </div>
            </div>
          </>
        )}
      </main>
      {selected && <PhotoDetailDialog key={selected.photoId} photo={selected} onClose={() => setSelected(null)} onDeleted={handleDeleted} />}
    </div>
  );
}
