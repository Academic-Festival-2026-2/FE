import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { InfoIcon } from "./photo-icons";

// 마우스처럼 올려 놓을 수 있는 포인터가 있는지. 화면 폭이 아니라 이걸로 나눠야
// 폭이 넓은 태블릿(터치)도 아이콘을 눌러 설명을 볼 수 있음
const HOVER_QUERY = "(hover: hover) and (pointer: fine)";
function subscribeHover(onChange: () => void) {
  const media = window.matchMedia(HOVER_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
function useCanHover() {
  return useSyncExternalStore(subscribeHover, () => window.matchMedia(HOVER_QUERY).matches);
}

type Props = {
  // 픽셀로 보이는 사진 수 (공개 + 위치 있음)
  pointCount: number;
  // 색 집계에 쓰인 사진 수 (나만 보기 사진 포함. 칸에 들어가는 EXIF 확인 사진은 위치가 항상 있음)
  photoCount: number;
};

// 동 상세 제목 패널의 "픽셀 2/4". 마우스가 있으면 숫자에 올렸을 때, 터치 기기는 옆 아이콘을 누르면 설명이 보임
export function PixelCount({ pointCount, photoCount }: Props) {
  const canHover = useCanHover();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const bubbleId = useId();

  // 터치 기기: 바깥을 누르면 닫힘
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const count = (
    <span>
      픽셀 <b className="text-ink">{pointCount}</b>/{photoCount}
    </span>
  );

  const bubble = (
    <span
      id={bubbleId}
      role="tooltip"
      className="absolute top-full left-0 z-20 mt-2 w-60 rounded-lg border border-line bg-white px-3 py-2 text-xs leading-[18px] font-normal text-ink-sub shadow-[0_8px_20px_rgba(22,22,26,0.1)]"
    >
      {photoCount === 0 ? (
        "아직 이 시간대 사진이 없어요."
      ) : (
        <>
          사진 {photoCount}장 중 {pointCount}장이 지도에 픽셀로 보여요.
          {photoCount > pointCount && (
            <span className="block text-ink-muted">
              나머지는 나만 보기 사진이에요. 동 색에는 모두 쓰여요.
            </span>
          )}
        </>
      )}
    </span>
  );

  if (canHover) {
    return (
      <span
        tabIndex={0}
        aria-describedby={bubbleId}
        className="group relative cursor-help underline decoration-dotted underline-offset-2 outline-none"
      >
        {count}
        <span className="hidden group-hover:block group-focus-visible:block">{bubble}</span>
      </span>
    );
  }

  return (
    <span ref={wrapperRef} className="relative inline-flex items-center gap-1">
      {count}
      <button
        type="button"
        aria-label="픽셀 수 설명"
        aria-expanded={open}
        aria-describedby={open ? bubbleId : undefined}
        onClick={() => setOpen((value) => !value)}
        className="-m-1 grid place-items-center p-1 text-ink-muted"
      >
        <InfoIcon />
      </button>
      {open && bubble}
    </span>
  );
}
