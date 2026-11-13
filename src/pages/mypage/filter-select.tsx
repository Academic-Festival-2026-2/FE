import { useEffect, useId, useRef, useState } from "react";
import chevronDown from "../../assets/icons/chevron-down.svg";
import { cn } from "../../utils/cn";
import type { FilterOption } from "./my-map-filters";

type FilterSelectProps = {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  // 고를 수 없는 항목에 마우스를 올렸을 때 안내
  disabledHint?: string;
};

// 나의 지도 현황의 지역·계절 선택 버튼 (아래로 펼치는 목록)
export function FilterSelect({ label, value, options, onChange, disabledHint = "준비 중이에요" }: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = options.find((option) => option.value === value);

  // 바깥 클릭·Esc로 닫기
  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`${label}: ${current?.label ?? ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-8 items-center gap-1 rounded-[9px] border border-field-line bg-white pr-2 pl-3 text-[13px] font-bold whitespace-nowrap text-ink transition-colors hover:bg-field"
      >
        {current?.label ?? label}
        <img
          src={chevronDown}
          alt=""
          width={14}
          height={14}
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute top-full right-0 z-20 mt-1.5 flex min-w-[112px] flex-col gap-0.5 rounded-xl border border-card-line bg-white p-1 shadow-[0_8px_24px_rgba(26,36,64,0.12)]"
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={option.disabled}
                  title={option.disabled ? disabledHint : undefined}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-[7px] text-left text-sm whitespace-nowrap",
                    selected ? "bg-brand-soft font-bold text-brand-strong" : "text-ink hover:bg-field",
                    "disabled:cursor-not-allowed disabled:text-ink-faint disabled:hover:bg-transparent",
                  )}
                >
                  {option.label}
                  {option.disabled && <span className="text-[11px] font-normal">준비 중</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
