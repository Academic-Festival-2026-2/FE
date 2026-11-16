import { useEffect, useRef, useState } from "react";
import type { DongPoint } from "../../api/dong";
import { likePhoto, unlikePhoto, type PhotoDetail } from "../../api/photo";
import { isSessionExpired, useExpireSession } from "../../hooks/use-expire-session";
import { useAuthStore } from "../../stores/auth-store";
import { cn } from "../../utils/cn";
import { LoginPromptDialog } from "../map/login-prompt-dialog";
import { Chevron, CloseIcon, HeartIcon } from "./photo-icons";
import { photoImageUrl } from "./photo-image-url";
import { paletteShares } from "./photo-info";
import { PhotoLightbox } from "./photo-lightbox";
import { PhotoMeta } from "./photo-meta";
import { useLightboxHistory } from "./use-lightbox-history";
import { usePhotoDetails } from "./use-photo-details";

// 말풍선 사진 크기 한도(px). 카드 폭이 사진 폭에 딱 맞게 바뀜
// 세로 사진은 조금 더 길게 허용, 너무 좁아지면 아래 닉네임·시간대 줄이 들어갈 최소 폭 유지
const BUBBLE_PHOTO_MAX_WIDTH = 264;
const BUBBLE_PHOTO_MAX_HEIGHT = 240;
const BUBBLE_PHOTO_MAX_HEIGHT_PORTRAIT = 300;
const BUBBLE_PHOTO_MIN_WIDTH = 168;
// 카드 안쪽 여백(p-2 양쪽) + 테두리(양쪽 1px)
const BUBBLE_CARD_CHROME = 18;

function bubblePhotoSize(naturalWidth: number, naturalHeight: number) {
  const ratio = naturalWidth / naturalHeight;
  const maxHeight = ratio < 1 ? BUBBLE_PHOTO_MAX_HEIGHT_PORTRAIT : BUBBLE_PHOTO_MAX_HEIGHT;
  const width = Math.round(Math.min(BUBBLE_PHOTO_MAX_WIDTH, maxHeight * ratio));
  return { width, height: Math.round(width / ratio) };
}

// 사진 위에 떠 있는 작은 버튼 (닫기·이전·다음). 어떤 사진 위에서도 보이게 어두운 반투명 + 흐림
const PHOTO_BUTTON =
  "flex size-8 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition-colors hover:bg-black/55";

type LikeState = { liked: boolean; likeCount: number };

// 사진 카드의 좋아요. 누르면 바로 바꿔 보여 주고, 실패하면 원래대로 되돌림
// 이 카드에서 누른 결과는 사진 id별로 기억해 상세보다 우선함
// → 기억해 둔 상세·미리 받은 상세가 누르기 전 값이어도 누른 결과가 보임
function usePhotoLike(photo: PhotoDetail | null, enabled: boolean) {
  const loggedIn = useAuthStore((state) => state.tokens !== null);
  const expireSession = useExpireSession();
  const [overrides, setOverrides] = useState<Record<number, LikeState>>({});
  const [promptOpen, setPromptOpen] = useState(false);
  // 같은 사진은 응답을 기다리는 동안 다시 누르면 무시 (빠르게 두 번 눌러 요청 순서가 꼬이지 않게)
  const pendingRef = useRef(new Set<number>());

  // 좋아요 기능 전 BE(likeCount 없음)면 하트를 숨김
  const like: LikeState | null =
    enabled && photo && photo.likeCount !== undefined
      ? (overrides[photo.photoId] ?? { liked: photo.liked ?? false, likeCount: photo.likeCount })
      : null;

  async function toggle() {
    if (!photo || !like || pendingRef.current.has(photo.photoId)) return;
    if (!loggedIn) {
      setPromptOpen(true);
      return;
    }
    const photoId = photo.photoId;
    const before = like;
    const previous = overrides[photoId];
    // state가 없으면 기억한 값을 지워 상세 값으로 돌아감
    const remember = (state: LikeState | undefined) =>
      setOverrides((current) => {
        const next = { ...current };
        if (state) next[photoId] = state;
        else delete next[photoId];
        return next;
      });

    pendingRef.current.add(photoId);
    remember({ liked: !before.liked, likeCount: before.likeCount + (before.liked ? -1 : 1) });
    try {
      const result = await (before.liked ? unlikePhoto : likePhoto)(photoId);
      remember({ liked: result.liked, likeCount: result.likeCount });
    } catch (error) {
      if (isSessionExpired(error)) expireSession();
      else remember(previous);
    } finally {
      pendingRef.current.delete(photoId);
    }
  }

  return { like, toggle, promptOpen, closePrompt: () => setPromptOpen(false) };
}

export function PhotoCard({
  points,
  mine,
  onClose,
  variant = "sheet",
}: {
  points: DongPoint[];
  mine: boolean;
  onClose: () => void;
  // bubble: 데스크톱에서 지도 픽셀 위에 붙는 작은 말풍선 / sheet: 모바일 아래 카드·위치 없는 사진
  variant?: "bubble" | "sheet";
}) {
  const bubble = variant === "bubble";
  const [index, setIndex] = useState(0);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  // 다른 사진으로 넘기면 사진 실패 표시를 지움 (기억한 상세라 주소가 같아도, 돌아오면 사진을 다시 받아 봄)
  const [shownIndex, setShownIndex] = useState(index);
  if (shownIndex !== index) {
    setShownIndex(index);
    setFailedUrl(null);
  }
  // 다 받은 사진의 원래 크기 (말풍선 카드 폭을 사진 비율에 맞출 때 씀)
  const [loaded, setLoaded] = useState<{ url: string; width: number; height: number } | null>(
    null,
  );
  // 사진을 눌러 크게 보기(라이트박스)가 열려 있는지. 넘기는 위치(index)는 카드와 같이 씀
  // 뒤로 가기를 누르면 동 화면을 벗어나지 않고 크게 보기만 닫힘
  const { open: zoomed, openLightbox, closeLightbox } = useLightboxHistory();
  // 상세는 사진별로 기억. 크게 보기가 열려 있을 때만 옆 사진 상세·이미지를 미리 받음 (카드만 있을 때는 안 받음)
  const { photo: current, failed, readyImageUrls } = usePhotoDetails(
    points.map((point) => point.photoId),
    index,
    { mine, preload: zoomed },
  );
  // 좋아요는 공유 지도에서만 (나의 지도는 내 사진만 나옴)
  const { like, toggle: toggleLike, promptOpen, closePrompt } = usePhotoLike(current, !mine);

  // 크게 보기가 닫히면 카드의 사진(아직 못 받았으면 닫기 버튼)으로 포커스를 돌려줌
  const photoButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasZoomedRef = useRef(false);
  useEffect(() => {
    if (wasZoomedRef.current && !zoomed) {
      const photoButton = photoButtonRef.current;
      (photoButton && !photoButton.disabled ? photoButton : closeButtonRef.current)?.focus({
        preventScroll: true,
      });
    }
    wasZoomedRef.current = zoomed;
  }, [zoomed]);

  // Esc로 닫기, ←/→로 이전·다음 사진 (크게 보기·로그인 안내가 열려 있으면 그쪽이 키를 받음)
  useEffect(() => {
    if (zoomed || promptOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowLeft" && index > 0) setIndex(index - 1);
      else if (event.key === "ArrowRight" && index < points.length - 1) setIndex(index + 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [zoomed, promptOpen, index, points.length, onClose]);

  // 축소 이미지가 있으면 그것을 보여 줌 (크게 보기와 같은 주소라 카드에서 받은 이미지를 그대로 씀)
  const imageUrl = current ? photoImageUrl(current) : null;
  const showImage = imageUrl && imageUrl !== failedUrl;
  const imageLoaded = Boolean(showImage && loaded?.url === imageUrl);
  const bubbleSize =
    bubble && imageLoaded && loaded ? bubblePhotoSize(loaded.width, loaded.height) : null;

  const card = (
    <section
      aria-label="사진 정보"
      className={cn(
        "rounded-[22px] border border-white/70 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_16px_40px_rgba(26,36,64,0.18)] backdrop-blur-[14px] backdrop-saturate-150",
        bubble
          ? cn("rounded-bl-[6px] bg-white/95", !bubbleSize && "w-[280px]")
          : "w-full bg-white/90 sm:w-auto sm:max-w-[360px] sm:min-w-[260px]",
      )}
      style={
        bubbleSize
          ? { width: Math.max(bubbleSize.width, BUBBLE_PHOTO_MIN_WIDTH) + BUBBLE_CARD_CHROME }
          : undefined
      }
    >
      {/* 사진 영역: 원래 비율 그대로 (잘리지 않게, 너무 길면 높이만 제한) */}
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-[16px] bg-field",
          !imageLoaded && "min-h-[180px]",
        )}
      >
        {failed ? (
          <p className="px-4 py-16 text-sm text-danger">사진을 불러오지 못했어요.</p>
        ) : !current ? (
          <div className="aspect-[4/3] w-full animate-pulse bg-[#e9ecf2]" />
        ) : showImage ? (
          // 누르면 크게 보기 (사진을 다 받은 뒤부터)
          <button
            ref={photoButtonRef}
            type="button"
            aria-label="사진 크게 보기"
            disabled={!imageLoaded}
            onClick={openLightbox}
            className="block max-w-full cursor-zoom-in disabled:cursor-default"
          >
            <img
              src={imageUrl}
              alt={`${current.name}에서 찍은 사진`}
              onLoad={(event) =>
                setLoaded({
                  url: imageUrl,
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })
              }
              onError={() => setFailedUrl(imageUrl)}
              style={bubbleSize ?? undefined}
              className={cn(
                "block transition-opacity duration-300",
                !bubbleSize && "h-auto w-auto max-w-full",
                !bubble && "max-h-[min(42vh,420px)] sm:max-h-[min(55vh,480px)]",
                bubble && !bubbleSize && "max-h-[240px]",
                imageLoaded ? "opacity-100" : "opacity-0",
              )}
            />
          </button>
        ) : (
          // 사진 파일이 없으면 대표색으로 채움
          <div className="flex aspect-[4/3] w-full">
            {paletteShares(current).map(({ color, share }) => (
              <span key={color} style={{ backgroundColor: color, width: `${share * 100}%` }} />
            ))}
          </div>
        )}

        {/* 왼쪽 위: 좋아요 하트, 바로 아래 좋아요 수 */}
        {like && (
          <div className="absolute top-2 left-2 flex flex-col items-center gap-1">
            <button
              type="button"
              aria-label={`좋아요 ${like.likeCount}개`}
              aria-pressed={like.liked}
              onClick={toggleLike}
              className={cn(PHOTO_BUTTON, like.liked && "text-like")}
            >
              <HeartIcon filled={like.liked} />
            </button>
            <span
              aria-hidden
              className="min-w-6 rounded-full bg-black/35 px-1.5 py-[3px] text-center font-mono text-[11px] leading-none text-white backdrop-blur-md"
            >
              {like.likeCount.toLocaleString()}
            </span>
          </div>
        )}

        {/* 몇 번째 사진인지 (하트가 있으면 그 오른쪽) */}
        {points.length > 1 && (
          <span
            className={cn(
              "absolute rounded-full bg-black/35 px-2.5 py-1 font-mono text-[11px] leading-none text-white backdrop-blur-md",
              // 하트가 있으면 하트 오른쪽, 하트 가운데 높이에 맞춤
              like ? "top-3.5 left-12" : "top-2.5 left-2.5",
            )}
          >
            {index + 1} / {points.length}
          </span>
        )}
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className={cn(PHOTO_BUTTON, "absolute top-2 right-2")}
        >
          <CloseIcon />
        </button>

        {index > 0 && (
          <button
            type="button"
            aria-label="이전 사진"
            onClick={() => setIndex(index - 1)}
            className={cn(PHOTO_BUTTON, "absolute top-1/2 left-2 -translate-y-1/2")}
          >
            <Chevron left />
          </button>
        )}
        {index < points.length - 1 && (
          <button
            type="button"
            aria-label="다음 사진"
            onClick={() => setIndex(index + 1)}
            className={cn(PHOTO_BUTTON, "absolute top-1/2 right-2 -translate-y-1/2")}
          >
            <Chevron />
          </button>
        )}

        {/* 여러 장이면 아래 가운데 점으로 위치 표시 (8장 넘으면 왼쪽 위 숫자만) */}
        {points.length > 1 && points.length <= 8 && (
          <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/25 px-2 py-1.5 backdrop-blur-md">
            {points.map((point, i) => (
              <span
                key={point.photoId}
                className={cn(
                  "h-1.5 rounded-full bg-white transition-all",
                  i === index ? "w-3.5" : "w-1.5 opacity-55",
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* 정보 영역: 올린 사람 · 시간대 / 찍은 시각 / 대표색 */}
      <div className="px-2 pt-3 pb-1.5">
        <PhotoMeta photo={current} failed={failed} />
      </div>
    </section>
  );

  const lightbox = zoomed && (
    <PhotoLightbox
      photo={current}
      failed={failed}
      readyImageUrls={readyImageUrls}
      index={index}
      total={points.length}
      onIndexChange={setIndex}
      onClose={closeLightbox}
    />
  );

  // 비로그인으로 하트를 누르면 로그인 안내 (다이얼로그는 화면 맨 위 층에 떠서 말풍선 안에 둬도 됨)
  const loginPrompt = !mine && (
    <LoginPromptDialog
      open={promptOpen}
      onClose={closePrompt}
      title="마음에 드는 사진에 좋아요를 눌러 보세요"
      description={
        <>
          좋아요한 사진은 마이페이지에서 다시 볼 수 있어요.
          <br />
          좋아요를 누르려면 로그인이 필요해요.
        </>
      }
    />
  );

  if (!bubble)
    return (
      <>
        {card}
        {lightbox}
        {loginPrompt}
      </>
    );

  // 말풍선: 픽셀 오른쪽 위에 뜨고, 왼쪽 아래 모서리에서 꼬리가 픽셀 쪽으로 비스듬히 뻗음
  // (말풍선 위치는 dong-page.tsx BUBBLE_OFFSET, 꼬리 끝은 확대된 픽셀 모서리 근처)
  return (
    <div className="relative origin-bottom-left animate-[photo-pop_200ms_cubic-bezier(0.34,1.25,0.64,1)] whitespace-normal">
      {card}
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        aria-hidden
        className="absolute -bottom-[14px] -left-[14px] -z-10 drop-shadow-[0_2px_2px_rgba(26,36,64,0.12)]"
      >
        <path d="M1 27L14 4L24 14Z" fill="rgb(255 255 255 / 0.95)" strokeLinejoin="round" />
      </svg>
      {lightbox}
      {loginPrompt}
    </div>
  );
}
