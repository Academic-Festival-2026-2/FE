import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PhotoDetail } from "../../api/photo";
import { BAND_PIXEL, bandLabel } from "../map/map-data";
import { cn } from "../../utils/cn";
import { Chevron, CloseIcon } from "./photo-icons";
import { formatTakenAt, paletteShares } from "./photo-info";

// 라이트박스 위 버튼 (닫기·이전·다음). 어두운 배경 위에서 보이게 흰 반투명
const LIGHTBOX_BUTTON =
  "flex size-11 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur-md transition-colors hover:bg-white/25";

// 이 거리(px) 이상 옆으로 밀면 이전·다음 사진 (세로로 더 많이 움직였으면 무시)
const SWIPE_MIN_DISTANCE = 50;

// 눌러도 닫히는 빈 배경 영역 표시 (사진·정보·버튼을 누르면 안 닫힘)
const BACKDROP = { "data-lightbox-backdrop": "" };

export function PhotoLightbox({
  photo,
  failed,
  index,
  total,
  onIndexChange,
  onClose,
}: {
  // 지금 사진 상세 (넘겨서 아직 받는 중이면 null)
  photo: PhotoDetail | null;
  failed: boolean;
  index: number;
  total: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
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

  const imageUrl = photo?.imageUrl && photo.imageUrl !== failedUrl ? photo.imageUrl : null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="사진 크게 보기"
      {...BACKDROP}
      onClick={(event) => {
        if (event.target instanceof HTMLElement && "lightboxBackdrop" in event.target.dataset)
          onClose();
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-50 flex animate-[lightbox-in_180ms_ease-out] flex-col bg-black/90 text-white backdrop-blur-sm"
    >
      {/* 위: 몇 번째 사진인지 / 닫기 */}
      <div
        {...BACKDROP}
        className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]"
      >
        <span className="font-mono text-xs text-white/70">
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

      {/* 가운데: 사진 (원래 비율 그대로, 화면에 맞게) */}
      <div {...BACKDROP} className="relative min-h-0 flex-1">
        <div
          {...BACKDROP}
          className="absolute inset-x-4 inset-y-3 flex items-center justify-center sm:inset-x-20"
        >
          {failed ? (
            <p className="text-sm text-white/80">사진을 불러오지 못했어요.</p>
          ) : !photo ? (
            <div
              role="status"
              aria-label="사진 불러오는 중"
              className="size-9 animate-spin rounded-full border-2 border-white/20 border-t-white"
            />
          ) : imageUrl ? (
            <img
              key={imageUrl}
              src={imageUrl}
              alt={`${photo.name}에서 찍은 사진`}
              onLoad={() => setLoadedUrl(imageUrl)}
              onError={() => setFailedUrl(imageUrl)}
              className={cn(
                "max-h-full max-w-full min-w-0 rounded-[6px] object-contain shadow-[0_24px_60px_rgba(0,0,0,0.45)] transition-opacity duration-300",
                loadedUrl === imageUrl ? "opacity-100" : "opacity-0",
              )}
            />
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
        <div className="min-h-[104px] rounded-[18px] bg-white/8 px-4 py-3.5">
          {photo ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-[15px] font-bold">{photo.nickname}</p>
                <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[11px] leading-none font-bold text-white/85">
                  <span
                    aria-hidden
                    className="size-2 rounded-[2px]"
                    style={{ backgroundColor: BAND_PIXEL[photo.timeBand] }}
                  />
                  {bandLabel(photo.timeBand)}
                </span>
              </div>
              <p className="mt-1 font-mono text-xs text-white/60">{formatTakenAt(photo.takenAt)}</p>
              <div className="mt-3 flex h-6 overflow-hidden rounded-[8px]">
                {paletteShares(photo).map(({ color, share }) => (
                  <span
                    key={color}
                    title={`${color} ${Math.round(share * 100)}%`}
                    style={{ backgroundColor: color, width: `${share * 100}%` }}
                  />
                ))}
              </div>
            </>
          ) : (
            !failed && (
              <div className="animate-pulse space-y-2" aria-hidden>
                <div className="h-4 w-24 rounded bg-white/10" />
                <div className="h-3 w-32 rounded bg-white/10" />
                <div className="mt-3 h-6 rounded-[6px] bg-white/10" />
              </div>
            )
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
