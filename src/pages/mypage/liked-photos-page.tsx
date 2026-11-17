import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ApiError } from "../../api/client";
import {
  getLikedPhotos,
  likePhoto,
  unlikePhoto,
  type LikedPhotoItem,
  type LikedPhotosResponse,
} from "../../api/photo";
import { AuthHeader } from "../../components/layout/auth-header";
import { UploadButton } from "../../components/layout/upload-button";
import { isSessionExpired, useExpireSession } from "../../hooks/use-expire-session";
import { formatTakenDate } from "../../utils/date";
import { bandLabel, currentTimeBand } from "../../utils/time-band";
import { cn } from "../../utils/cn";
import { HeartIcon } from "../../components/icons";
import { PhotoLightbox } from "../dong/photo-lightbox";
import { useLightboxHistory } from "../dong/use-lightbox-history";
import { usePhotoDetails } from "../dong/use-photo-details";
import { PhotoListTitle, PhotoThumbnail } from "./photo-list-parts";

const PAGE_SIZE = 12;

// 카드의 하트로 좋아요 취소·다시 좋아요. 누르면 바로 바꿔 보여 주고, 실패하면 원래대로 되돌림
// 취소한 카드는 실수로 눌렀을 때 되돌릴 수 있게 페이지를 다시 받을 때까지 그대로 둠
function useLikeToggle() {
  const expireSession = useExpireSession();
  // 이 화면에서 좋아요를 취소한 사진 (목록은 모두 좋아요한 사진이라 여기 없으면 좋아요 상태)
  const [unliked, setUnliked] = useState<ReadonlySet<number>>(new Set());
  // 같은 사진은 응답을 기다리는 동안 다시 누르면 무시 (요청 순서가 꼬이지 않게)
  const pendingRef = useRef(new Set<number>());

  const mark = useCallback((photoId: number, isUnliked: boolean) => {
    setUnliked((current) => {
      const next = new Set(current);
      if (isUnliked) next.add(photoId);
      else next.delete(photoId);
      return next;
    });
  }, []);

  async function toggle(photoId: number) {
    if (pendingRef.current.has(photoId)) return;
    const wasLiked = !unliked.has(photoId);
    pendingRef.current.add(photoId);
    mark(photoId, wasLiked);
    try {
      const result = await (wasLiked ? unlikePhoto : likePhoto)(photoId);
      mark(photoId, !result.liked);
    } catch (error) {
      if (isSessionExpired(error)) expireSession();
      else mark(photoId, !wasLiked);
    } finally {
      pendingRef.current.delete(photoId);
    }
  }

  const reset = useCallback(() => setUnliked(new Set()), []);
  return { isLiked: (photoId: number) => !unliked.has(photoId), toggle, reset };
}

// 지금 페이지 사진들을 크게 보기로 넘겨 봄. 상세(사진 주소·대표색 비율)는 사진별로 기억하고,
// 바로 옆 사진 1장씩의 상세·이미지(축소 이미지, 없으면 원본)를 미리 받아 넘길 때 바로 보이게 함 (동 화면 크게 보기와 같음)
// 실패한 사진은 넘겼다 돌아오면 다시 받는 동안 로딩으로 보임
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
  const { photo, failed, readyImageUrls } = usePhotoDetails(
    photos.map((item) => item.photoId),
    index,
    { preload: true },
  );
  return (
    <PhotoLightbox
      photo={photo}
      failed={failed}
      readyImageUrls={readyImageUrls}
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
  // 크게 보기로 연 사진의 위치 (지금 페이지 안). 닫아도 남겨 둬 닫힌 뒤 그 카드로 포커스를 돌려줌
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // 뒤로 가기를 누르면 이 화면을 벗어나지 않고 크게 보기만 닫힘 (동 화면 사진 카드와 같음)
  const lightbox = useLightboxHistory();
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const likes = useLikeToggle();

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

  function openPhoto(index: number) {
    setOpenIndex(index);
    lightbox.openLightbox();
  }

  // 크게 보기가 닫히면 마지막으로 본 사진 카드로 포커스를 돌려줌
  // (열려 있는 동안은 뒤 화면이 inert라 닫힌 뒤에 옮김)
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (wasOpenRef.current && !lightbox.open && openIndex !== null) {
      cardRefs.current[openIndex]?.focus({ preventScroll: true });
    }
    wasOpenRef.current = lightbox.open;
  }, [lightbox.open, openIndex]);

  function changePage(nextPage: number) {
    setData(null);
    setLoading(true);
    setError(null);
    setOpenIndex(null);
    likes.reset();
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
        <PhotoListTitle
          eyebrow="LIKED PHOTOS"
          title="좋아요 표시한 사진"
          description="지도에서 하트를 누른 사진을 모아 봐요. 사진을 누르면 크게 볼 수 있고, 하트를 누르면 좋아요를 취소해요."
        />
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
          <div
            role="alert"
            className="rounded-2xl border border-danger-line bg-white px-6 py-10 text-center"
          >
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
          <p
            role="status"
            className="rounded-2xl border border-card-line bg-white px-6 py-16 text-center text-sm text-ink-muted"
          >
            좋아요한 사진을 불러오는 중...
          </p>
        ) : photos.length === 0 ? (
          <div className="rounded-2xl border border-card-line bg-white px-6 py-16 text-center">
            <p className="font-bold text-ink">아직 좋아요한 사진이 없어요.</p>
            <p className="mt-2 text-sm text-ink-muted">
              지도에서 마음에 드는 사진의 하트를 눌러 보세요.
            </p>
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
              {photos.map((photo, index) => {
                const liked = likes.isLiked(photo.photoId);
                return (
                  // 하트는 카드 버튼 안에 넣을 수 없어(버튼 중첩) 카드 위에 겹쳐 둠. 떠오르는 효과는 둘을 감싼 칸에 줌
                  <div
                    key={photo.photoId}
                    className="group relative transition hover:-translate-y-0.5"
                  >
                    <button
                      ref={(element) => {
                        cardRefs.current[index] = element;
                      }}
                      type="button"
                      onClick={() => openPhoto(index)}
                      aria-label={`${photo.nickname}님이 ${photo.name}에서 찍은 사진 크게 보기 (${formatTakenDate(photo.takenAt)})`}
                      className="block w-full overflow-hidden rounded-2xl border border-card-line bg-white text-left transition group-hover:shadow-[0_8px_24px_rgba(26,36,64,0.10)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    >
                      <PhotoThumbnail photo={photo} />
                      <div className="flex items-start justify-between gap-2 px-3 py-3 sm:px-4 sm:py-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-ink sm:text-base">
                            {photo.name}
                          </p>
                          <p className="mt-1 truncate text-xs text-ink-sub">{photo.nickname}</p>
                          {/* 촬영 시각 없이 올린 사진(#111)은 "촬영 시기 미상" (좋아요 목록 응답에는 계절이 없음, 크게 보기에서는 계절이 보임) */}
                          <p className="mt-1 font-mono text-[11px] text-ink-muted sm:text-xs">
                            {formatTakenDate(photo.takenAt)} · {bandLabel(photo.timeBand)}
                          </p>
                        </div>
                        <span
                          className="mt-1 size-3 shrink-0 rounded-[3px]"
                          style={{ backgroundColor: photo.color }}
                          aria-hidden="true"
                        />
                      </div>
                    </button>
                    {/* 왼쪽 위 하트: 누르면 좋아요 취소, 다시 누르면 다시 좋아요 (사진 팝업 하트와 같은 모양) */}
                    <button
                      type="button"
                      aria-label={`${photo.name} 사진 좋아요`}
                      aria-pressed={liked}
                      onClick={() => likes.toggle(photo.photoId)}
                      className={cn(
                        "absolute top-2 left-2 flex size-8 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition-colors hover:bg-black/55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                        liked && "text-like",
                      )}
                    >
                      <HeartIcon filled={liked} />
                    </button>
                  </div>
                );
              })}
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
      {lightbox.open && openIndex !== null && photos[openIndex] && (
        <LikedPhotoLightbox
          photos={photos}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={lightbox.closeLightbox}
        />
      )}
    </div>
  );
}
