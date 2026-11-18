import { useId, useRef, useState } from "react";
import { InfoIcon } from "../../components/icons";
import { ADMIN_NICKNAME, CC_LICENSE_URL, PHOTO_CREDITS } from "../../constants/photo-credits";
import { useDismiss } from "../../hooks/use-dismiss";
import { GLASS } from "../../features/map/map-ui";
import { cn } from "../../utils/cn";

// 동 상세 왼쪽 아래 ⓘ: 관리자 계정이 올린 데모 사진의 출처.
// 마우스는 올리면(hover는 마우스 기기에서만 적용), 터치는 누르면 위로 열림. CC 라이선스 이름은 안내 페이지 링크
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
        aria-controls={bubbleId}
        onClick={() => setOpen((value) => !value)}
        className={cn(GLASS, "grid size-9 place-items-center rounded-full text-ink-sub")}
      >
        <InfoIcon size={16} />
      </button>
      {/* 바깥 칸의 pb-2가 아이콘과 상자 사이를 이어 줘서, 마우스를 상자로 옮겨도 닫히지 않고 링크를 누를 수 있음 */}
      <div
        id={bubbleId}
        className={cn(
          "absolute bottom-full left-0 w-72 max-w-[calc(100vw-2rem)] pb-2 group-hover:block group-has-focus-visible:block",
          open ? "block" : "hidden",
        )}
      >
        <div className="rounded-lg border border-line bg-white px-3 py-2.5 text-xs leading-[18px] text-ink-sub shadow-[0_8px_20px_rgba(22,22,26,0.1)]">
          <p className="font-bold text-ink">
            {ADMIN_NICKNAME}(관리자) 계정이 올린 사진의 출처는 다음과 같아요
          </p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {PHOTO_CREDITS.map(({ source, authors }) => (
              <li key={source}>
                · {source}
                {authors && ": "}
                {authors?.map(({ name, license }, index) => (
                  <span key={name}>
                    {index > 0 && ", "}
                    {name} (
                    <a
                      href={CC_LICENSE_URL[license]}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2 hover:text-ink"
                    >
                      {license}
                    </a>
                    )
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
