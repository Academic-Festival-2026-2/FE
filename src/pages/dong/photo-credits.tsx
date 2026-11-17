import { useId, useRef, useState } from "react";
import { InfoIcon } from "../../components/icons";
import { ADMIN_NICKNAME, PHOTO_CREDITS } from "../../constants/photo-credits";
import { useDismiss } from "../../hooks/use-dismiss";
import { GLASS } from "../../features/map/map-ui";
import { cn } from "../../utils/cn";

// 동 상세 왼쪽 아래 ⓘ: 관리자 계정이 올린 데모 사진의 출처.
// 마우스는 올리면(hover는 마우스 기기에서만 적용), 터치는 누르면 위로 열림
export function PhotoCredits({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const bubbleId = useId();

  // 눌러서 열었을 때: 바깥을 누르거나 Esc로 닫힘
  useDismiss(wrapperRef, open, setOpen, { pointer: "pointerdown" });

  return (
    <div ref={wrapperRef} className={cn("group absolute", className)}>
      <button
        type="button"
        aria-label="사진 출처"
        aria-expanded={open}
        aria-describedby={bubbleId}
        onClick={() => setOpen((value) => !value)}
        className={cn(GLASS, "grid size-9 place-items-center rounded-full text-ink-sub")}
      >
        <InfoIcon size={16} />
      </button>
      <div
        id={bubbleId}
        role="tooltip"
        className={cn(
          "absolute bottom-full left-0 mb-2 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-line bg-white px-3 py-2.5 text-xs leading-[18px] text-ink-sub shadow-[0_8px_20px_rgba(22,22,26,0.1)] group-hover:block group-has-focus-visible:block",
          open ? "block" : "hidden",
        )}
      >
        <p className="font-bold text-ink">
          {ADMIN_NICKNAME}(관리자) 계정이 올린 사진의 출처는 다음과 같아요
        </p>
        <ul className="mt-1.5 flex flex-col gap-1">
          {PHOTO_CREDITS.map((credit) => (
            <li key={credit}>· {credit}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
