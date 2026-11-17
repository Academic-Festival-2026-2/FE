import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PhotoDetail } from "../../api/photo";
import { cn } from "../../utils/cn";
import { Chevron, CloseIcon } from "../../components/icons";
import { photoImageUrl } from "./photo-image-url";
import { paletteShares } from "./photo-info";
import { PhotoMeta } from "./photo-meta";

// 라이트박스 위 버튼 (닫기·이전·다음). 흰 반투명 배경 위에서도 보이게 테두리·그림자를 둠
const LIGHTBOX_BUTTON =
  "flex size-11 items-center justify-center rounded-full border border-line bg-white/85 text-ink shadow-[0_4px_14px_rgba(0,0,0,0.12)] backdrop-blur-md transition-colors hover:bg-white";

// 이 거리(px) 이상 옆으로 밀면 이전·다음 사진 (세로로 더 많이 움직였으면 무시)
const SWIPE_MIN_DISTANCE = 50;

// 눌러도 닫히는 빈 배경 영역 표시 (사진·정보·버튼을 누르면 안 닫힘)
const BACKDROP = { "data-lightbox-backdrop": "" };

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="사진 불러오는 중"
      className={cn(
        "size-9 animate-spin rounded-full border-2 border-ink/15 border-t-ink-sub",
        className,
      )}
    />
  );
}

export function PhotoLightbox({
  photo,
  failed,
  readyImageUrls,
  index,
  total,
  onIndexChange,
  onClose,
}: {
  // 지금 사진 상세 (넘겨서 아직 받는 중이면 null)
  photo: PhotoDetail | null;
  failed: boolean;
  // 미리 다 받아 둔 이미지 주소 (축소 이미지, 없으면 원본). 여기 있으면 받기를 기다리지 않고(페이드 없이) 바로 보여 줌
  readyImageUrls?: ReadonlySet<string>;
  index: number;
  total: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  // 받은 사진의 가로÷세로 비율. 작은 사진도 화면에 꽉 차게 키우려면 비율을 알아야 함
  const [natural, setNatural] = useState<{ url: string; ratio: number } | null>(null);
  // 다른 사진으로 넘기면 이미지 실패 표시를 지움 (기억한 상세라 주소가 같아도, 돌아오면 이미지를 다시 받아 봄)
  const [shownIndex, setShownIndex] = useState(index);
  if (shownIndex !== index) {
    setShownIndex(index);
    setFailedUrl(null);
  }
  const hasPrev = index > 0;
  const hasNext = index < total - 1;

  // 열리면 닫기 버튼에 포커스, 뒤 화면(#root)은 누르거나 Tab으로 가지 못하게 막음
  // (닫힌 뒤 포커스는 카드가 돌려받음: 넘기는 사이 카드의 사진 버튼이 새로 그려질 수 있어서)
  useEffect(() => {
    const root = document.getElementById("root");
    if (root) root.inert = true;
    closeButtonRef.current?.focus();
    return () => {
      if (root) root.inert = false;
    };
  }, []);

  // Esc로 닫기, ←/→로 이전·다음 사진
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowLeft" && hasPrev) onIndexChange(index - 1);
      else if (event.key === "ArrowRight" && hasNext) onIndexChange(index + 1);
      else return;
      event.preventDefault();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, hasPrev, hasNext, onIndexChange, onClose]);

  function handleTouchStart(event: React.TouchEvent) {
    // 두 손가락(확대)이거나 이미 확대한 상태면 넘기기로 보지 않음
    const zoomed = (window.visualViewport?.scale ?? 1) > 1.01;
    touchStartRef.current =
      event.touches.length === 1 && !zoomed
        ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
        : null;
  }

  function handleTouchEnd(event: React.TouchEvent) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || event.touches.length > 0) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx > 0 && hasPrev) onIndexChange(index - 1);
    else if (dx < 0 && hasNext) onIndexChange(index + 1);
  }

  // 축소 이미지가 있으면 그것, 없으면(이 기능 전에 올린 사진) 원본
  const shownUrl = photo ? photoImageUrl(photo) : null;
  const imageUrl = shownUrl && shownUrl !== failedUrl ? shownUrl : null;
  const imageReady = imageUrl !== null && (loadedUrl === imageUrl || readyImageUrls?.has(imageUrl));
  const ratio = natural && natural.url === imageUrl ? natural.ratio : null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo ? `${photo.name} 사진 크게 보기` : "사진 크게 보기"}
      {...BACKDROP}
      onClick={(event) => {
        if (event.target instanceof HTMLElement && "lightboxBackdrop" in event.target.dataset)
          onClose();
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      // touch-pinch-zoom: 한 손가락으로 끌어도 브라우저가 화면을 움직이지 않게 (안드로이드 당겨서 새로고침 방지)
      // 두 손가락 확대는 그대로 허용, 옆으로 넘기기는 위 터치 이벤트로 직접 처리
      className="fixed inset-0 z-50 flex animate-[lightbox-in_180ms_ease-out] touch-pinch-zoom flex-col bg-white/60 text-ink backdrop-blur-sm"
    >
      {/* 위: 몇 번째 사진인지 / 닫기 */}
      <div
        {...BACKDROP}
        className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]"
      >
        <span className="font-mono text-xs text-ink-muted">
          {total > 1 && `${index + 1} / ${total}`}
        </span>
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className={LIGHTBOX_BUTTON}
        >
          <CloseIcon size={14} />
        </button>
      </div>

      {/* 가운데: 사진 (원래 비율 그대로, 화면에 맞게. 작은 사진도 키워서 꽉 차게) */}
      <div {...BACKDROP} className="relative min-h-0 flex-1">
        <div
          {...BACKDROP}
          // container-type: size → 사진 크기를 이 영역의 가로·세로(cqw·cqh) 기준으로 계산
          className="absolute inset-x-4 inset-y-3 flex items-center justify-center [container-type:size] sm:inset-x-20"
        >
          {failed ? (
            <p className="text-sm text-ink-sub">사진을 불러오지 못했어요.</p>
          ) : !photo ? (
            <LoadingSpinner />
          ) : imageUrl ? (
            <>
              {/* 흰 배경: 투명 PNG(축소 이미지가 없는 옛 사진은 원본 PNG)의 투명한 부분에 뒤 화면이 비쳐 보이지 않게 */}
              <img
                key={imageUrl}
                src={imageUrl}
                alt={`${photo.name}에서 찍은 사진`}
                onLoad={(event) => {
                  const { naturalWidth, naturalHeight } = event.currentTarget;
                  if (naturalWidth && naturalHeight)
                    setNatural({ url: imageUrl, ratio: naturalWidth / naturalHeight });
                  setLoadedUrl(imageUrl);
                }}
                onError={() => setFailedUrl(imageUrl)}
                // 영역에 비율대로 꽉 차는 크기: 가로는 영역 가로와 (영역 세로 × 비율) 중 작은 쪽
                // (원래 크기보다 작은 사진도 키움. 상자가 사진과 같은 비율이라 흰 배경이 사진 밖으로 나오지 않음)
                style={
                  ratio
                    ? { width: `min(100cqw, ${ratio} * 100cqh)`, aspectRatio: String(ratio) }
                    : undefined
                }
                className={cn(
                  "max-h-full max-w-full min-w-0 rounded-[6px] bg-white object-contain shadow-[0_16px_40px_rgba(0,0,0,0.18)]",
                  // 미리 받은 사진은 페이드 없이 바로, 새로 받은 사진만 서서히
                  !readyImageUrls?.has(imageUrl) && "transition-opacity duration-300",
                  // 비율을 알기 전에는 숨김 (원래 크기로 잠깐 보였다가 커지지 않게)
                  imageReady && ratio ? "opacity-100" : "opacity-0",
                )}
              />
              {/* 이미지를 받는 동안 빈 화면 대신 로딩 표시 (미리 받기가 덜 끝났거나 느린 망, 축소 이미지가 없어 원본을 받을 때) */}
              {!imageReady && <LoadingSpinner className="pointer-events-none absolute" />}
            </>
          ) : (
            // 사진 파일이 없으면 대표색으로 채움 (카드와 같음)
            <div className="flex aspect-[4/3] max-h-full w-full max-w-[720px] overflow-hidden rounded-[12px]">
              {paletteShares(photo).map(({ color, share }) => (
                <span key={color} style={{ backgroundColor: color, width: `${share * 100}%` }} />
              ))}
            </div>
          )}
        </div>

        {hasPrev && (
          <button
            type="button"
            aria-label="이전 사진"
            onClick={() => onIndexChange(index - 1)}
            className={cn(LIGHTBOX_BUTTON, "absolute top-1/2 left-2 -translate-y-1/2 sm:left-5")}
          >
            <Chevron left size={18} />
          </button>
        )}
        {hasNext && (
          <button
            type="button"
            aria-label="다음 사진"
            onClick={() => onIndexChange(index + 1)}
            className={cn(LIGHTBOX_BUTTON, "absolute top-1/2 right-2 -translate-y-1/2 sm:right-5")}
          >
            <Chevron size={18} />
          </button>
        )}
      </div>

      {/* 아래: 올린 사람 · 시간대 / 찍은 시각 / 대표색 (카드와 같은 내용) */}
      <div
        {...BACKDROP}
        className="mx-auto w-full max-w-[560px] px-4 pt-1 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="min-h-[104px] rounded-[18px] border border-line bg-white px-4 py-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
          <PhotoMeta photo={photo} failed={failed} tone="lightbox" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
