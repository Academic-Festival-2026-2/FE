import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ApiError } from "../../api/client";
import {
  getLikedPhotos,
  getPhotoDetail,
  type LikedPhotoItem,
  type LikedPhotosResponse,
  type PhotoDetail,
} from "../../api/photo";
import { AuthHeader } from "../../components/layout/auth-header";
import { UploadButton } from "../../components/layout/upload-button";
import { isSessionExpired, useExpireSession } from "../../hooks/use-expire-session";
import { formatDate } from "../../utils/date";
import { currentTimeBand } from "../../utils/time-band";
import { bandLabel } from "../map/map-data";
import { PhotoLightbox } from "../dong/photo-lightbox";

const PAGE_SIZE = 12;

function PhotoThumbnail({ photo }: { photo: LikedPhotoItem }) {
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

// 지금 페이지 사진들을 크게 보기로 넘겨 봄. 넘길 때마다 상세(원본 사진·대표색 비율)를 받음
// 성공·실패를 마지막으로 받은 사진 하나에만 기록 → 실패한 사진도 넘겼다 돌아오면 다시 받는 동안 로딩으로 보임
// 닫으면 이 컴포넌트가 사라져 기록도 지워짐 → 다시 열면 처음부터 받음
function LikedPhotoLightbox({
  photos,
  index,
  onIndexChange,
  onClose,
}: {
  photos: LikedPhotoItem[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const photoId = photos[index].photoId;
  const [result, setResult] = useState<{ photoId: number; detail: PhotoDetail | null } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    getPhotoDetail(photoId)
      .then((detail) => {
        if (!cancelled) setResult({ photoId, detail });
      })
      .catch(() => {
        if (!cancelled) setResult({ photoId, detail: null });
      });
    return () => {
      cancelled = true;
    };
  }, [photoId]);

  const current = result?.photoId === photoId ? result : null;
  return (
    <PhotoLightbox
      photo={current?.detail ?? null}
      failed={current !== null && current.detail === null}
      index={index}
      total={photos.length}
      onIndexChange={onIndexChange}
      onClose={onClose}
    />
  );
}

export function LikedPhotosPage() {
  const expireSession = useExpireSession();
  const [page, setPage] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState<LikedPhotosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 크게 보기로 연 사진의 위치 (지금 페이지 안)
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    let ignore = false;
    getLikedPhotos(page, PAGE_SIZE)
      .then((result) => {
        if (ignore) return;
        // 그사이 좋아요를 취소했거나 사진이 비공개로 바뀌어 이 페이지가 비면 남은 마지막 페이지로 감
        // (그대로 두면 좋아요한 사진이 있는데도 "아직 없어요"가 보임)
        if (result.photos.length === 0 && page > 0) {
          // 항상 지금보다 앞 페이지로 (같은 값이면 다시 받지 않아 로딩에 멈춤)
          setPage(Math.max(0, Math.min(page - 1, Math.ceil(result.totalElements / PAGE_SIZE) - 1)));
          return;
        }
        setData(result);
        setLoading(false);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (ignore) return;
        if (isSessionExpired(reason)) expireSession();
        else {
          setError(
            reason instanceof ApiError ? reason.message : "좋아요한 사진을 불러오지 못했어요.",
          );
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [page, refreshKey, expireSession]);

  const photos = data?.photos ?? [];

  const closeLightbox = useCallback(() => setOpenIndex(null), []);

  // 크게 보기가 닫히면 마지막으로 본 사진 카드로 포커스를 돌려줌
  // (열려 있는 동안은 뒤 화면이 inert라 닫힌 뒤에 옮김)
  const lastOpenRef = useRef<number | null>(null);
  useEffect(() => {
    if (openIndex === null && lastOpenRef.current !== null) {
      cardRefs.current[lastOpenRef.current]?.focus({ preventScroll: true });
    }
    lastOpenRef.current = openIndex;
  }, [openIndex]);

  function changePage(nextPage: number) {
    setData(null);
    setLoading(true);
    setError(null);
    setOpenIndex(null);
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const firstNumber = page * PAGE_SIZE + 1;
  const lastNumber = Math.min((page + 1) * PAGE_SIZE, data?.totalElements ?? 0);

  return (
    <div className="min-h-screen bg-page">
      {/* 내 사진 모아보기와 같은 헤더·본문 폭·제목 크기 */}
      <AuthHeader>
        <UploadButton />
      </AuthHeader>
      <main className="mx-auto w-full max-w-[1192px] px-4 pt-4 pb-12">
        <p className="mt-2 font-mono text-[13px] tracking-[1.04px] text-brand-strong">LIKED PHOTOS</p>
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
          <h1 className="text-[30px] font-extrabold tracking-[-0.9px] text-ink">좋아요 표시한 사진</h1>
        </div>
        <p className="mt-2 text-base text-ink-sub">
          지도에서 하트를 누른 사진을 모아 봐요. 사진을 누르면 크게 볼 수 있어요.
        </p>
        <div className="mt-6 mb-3 flex items-center justify-between gap-4">
          <h2 className="flex items-baseline gap-2 text-[17px] leading-[25px] font-bold text-ink">
            사진
            {data && (
              <span className="text-sm font-normal text-ink-muted">
                <b className="font-bold text-ink">{data.totalElements.toLocaleString()}</b>장
              </span>
            )}
          </h2>
          <span className="text-[13px] text-ink-muted">최근에 누른 순</span>
        </div>
        {error ? (
          <div role="alert" className="rounded-2xl border border-danger-line bg-white px-6 py-10 text-center">
            <p className="text-sm text-danger">{error}</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setError(null);
                setRefreshKey((value) => value + 1);
              }}
              className="mt-4 h-10 rounded-[10px] bg-brand px-4 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
            >
              다시 시도
            </button>
          </div>
        ) : loading ? (
          <p role="status" className="rounded-2xl border border-card-line bg-white px-6 py-16 text-center text-sm text-ink-muted">
            좋아요한 사진을 불러오는 중...
          </p>
        ) : photos.length === 0 ? (
          <div className="rounded-2xl border border-card-line bg-white px-6 py-16 text-center">
            <p className="font-bold text-ink">아직 좋아요한 사진이 없어요.</p>
            <p className="mt-2 text-sm text-ink-muted">지도에서 마음에 드는 사진의 하트를 눌러 보세요.</p>
            <Link
              to="/map"
              search={{ timeBand: currentTimeBand() }}
              className="mt-5 inline-flex h-11 items-center rounded-xl bg-brand px-5 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
            >
              지도 둘러보기
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {photos.map((photo, index) => (
                <button
                  key={photo.photoId}
                  ref={(element) => {
                    cardRefs.current[index] = element;
                  }}
                  type="button"
                  onClick={() => setOpenIndex(index)}
                  aria-label={`${photo.nickname}님이 ${photo.name}에서 ${formatDate(photo.takenAt)}에 찍은 사진 크게 보기`}
                  className="overflow-hidden rounded-2xl border border-card-line bg-white text-left transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(26,36,64,0.10)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <PhotoThumbnail photo={photo} />
                  <div className="flex items-start justify-between gap-2 px-3 py-3 sm:px-4 sm:py-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink sm:text-base">{photo.name}</p>
                      <p className="mt-1 truncate text-xs text-ink-sub">{photo.nickname}</p>
                      <p className="mt-1 font-mono text-[11px] text-ink-muted sm:text-xs">
                        {formatDate(photo.takenAt)} · {bandLabel(photo.timeBand)}
                      </p>
                    </div>
                    <span
                      className="mt-1 size-3 shrink-0 rounded-[3px]"
                      style={{ backgroundColor: photo.color }}
                      aria-hidden="true"
                    />
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[13px] text-ink-muted">
              <p>
                {firstNumber}–{lastNumber} / {data?.totalElements.toLocaleString()}장
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => changePage(page - 1)}
                  className="h-9 rounded-[10px] border border-line bg-white px-4 font-bold text-ink-sub hover:bg-field disabled:opacity-40"
                >
                  이전
                </button>
                <span aria-label="현재 페이지" className="min-w-7 text-center font-bold text-ink">
                  {page + 1}
                </span>
                <button
                  type="button"
                  disabled={!data?.hasNext}
                  onClick={() => changePage(page + 1)}
                  className="h-9 rounded-[10px] border border-line bg-white px-4 font-bold text-ink-sub hover:bg-field disabled:opacity-40"
                >
                  다음
                </button>
              </div>
            </div>
          </>
        )}
      </main>
      {openIndex !== null && photos[openIndex] && (
        <LikedPhotoLightbox
          photos={photos}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={closeLightbox}
        />
      )}
    </div>
  );
}
