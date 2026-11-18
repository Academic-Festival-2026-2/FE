import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { ColorRatio, SeasonType, TimeBand } from "../../api/map";
import chevronDown from "../../assets/icons/chevron-down-navy.svg";
import { MaskIcon } from "../../components/icons";
import { useDismiss } from "../../hooks/use-dismiss";
import { cn } from "../../utils/cn";
import { prefersReducedMotion } from "../../utils/motion";
import { SEASON_OPTIONS } from "../../utils/season";
import { BAND_PIXEL, TIME_BANDS } from "../../utils/time-band";

// 지도 위에 띄우는 유리 패널 (리퀴드 글라스 느낌). 값은 index.css의 liquid-glass에서 조정
export const GLASS = "liquid-glass";

// 위로 펼쳐지는 계절 목록: 글자가 잘 읽히게 패널보다 덜 비치는 유리
const GLASS_SOLID =
  "border border-white/70 bg-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_24px_rgba(26,36,64,0.12)] backdrop-blur-[14px] backdrop-saturate-150";

const glassTab = (active: boolean) =>
  cn(
    "relative z-10 flex h-8 shrink-0 items-center gap-1.5 px-2 text-[13px] leading-none whitespace-nowrap transition-colors duration-300 sm:px-3",
    active ? "font-bold text-white" : "font-medium text-ink-sub hover:bg-white/50",
  );

const SPRING = "cubic-bezier(0.34, 1.25, 0.64, 1)";

// 고른 항목 표시 (남색 80% + 위쪽 반사선 + 살짝 비침)
const SELECTED_PILL =
  "bg-navy/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-1px_0_rgba(0,0,0,0.15),0_2px_8px_rgba(41,54,129,0.3)] backdrop-blur-[2px]";

// 고른 칸 표시 (리퀴드 글라스 느낌)
// - 다른 칸을 누르면 남색 알약이 살짝 튕기듯 미끄러져 이동
// - 도착하면서 물방울처럼 가로로 늘었다가 제자리로 돌아옴
// - OS의 "동작 줄이기"가 켜져 있으면 애니메이션 없이 바로 이동
// 탭 버튼에는 data-liquid-tab을 붙이고, 감싸는 상자(이 표시의 부모)에는 relative를 줌
// 부모 ref는 자식 effect보다 늦게 연결되므로, 표시 자신의 부모 요소를 직접 사용
function LiquidIndicator({ activeIndex, className }: { activeIndex: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prevIndexRef = useRef<number | null>(null);
  const placeRef = useRef<(animate: boolean) => void>(() => {});

  useLayoutEffect(() => {
    const indicator = ref.current;
    const container = indicator?.parentElement;
    if (!indicator || !container) return;

    const place = (animate: boolean) => {
      const tab = container.querySelectorAll<HTMLElement>("[data-liquid-tab]")[activeIndex];
      if (!tab) return;
      indicator.style.transition = animate ? `left 460ms ${SPRING}, width 460ms ${SPRING}` : "none";
      indicator.style.left = `${tab.offsetLeft}px`;
      indicator.style.width = `${tab.offsetWidth}px`;
      indicator.style.top = `${tab.offsetTop}px`;
      indicator.style.height = `${tab.offsetHeight}px`;
    };
    placeRef.current = place;

    const previous = prevIndexRef.current;
    const reduceMotion = prefersReducedMotion();
    const moving = previous !== null && previous !== activeIndex && !reduceMotion;
    place(moving);
    if (moving) {
      indicator.animate(
        [
          { transform: "scale(1, 1)" },
          { transform: "scale(1.07, 0.93)", offset: 0.3 },
          { transform: "scale(0.985, 1.02)", offset: 0.65 },
          { transform: "scale(1, 1)" },
        ],
        { duration: 480, easing: "ease-out" },
      );
    }
    prevIndexRef.current = activeIndex;
  }, [activeIndex]);

  // 글꼴이 늦게 뜨거나 화면 폭이 바뀌어 탭 크기가 달라지면 애니메이션 없이 위치만 맞춤
  useEffect(() => {
    const container = ref.current?.parentElement;
    if (!container) return;
    let first = true;
    const observer = new ResizeObserver(() => {
      if (first) {
        first = false;
        return;
      }
      placeRef.current(false);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <span
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none absolute", SELECTED_PILL, className)}
    />
  );
}

export function MapTitlePanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={cn(GLASS, "flex flex-col gap-0.5 rounded-[14px] px-4 py-2.5")}>
      <h1 className="text-[22px] leading-8 font-extrabold tracking-[-0.66px] text-ink">{title}</h1>
      <p className="text-xs leading-[18px] text-ink-muted">{children}</p>
    </div>
  );
}

export function MapModeToggle({
  mine,
  onChange,
}: {
  mine: boolean;
  onChange: (mine: boolean) => void;
}) {
  return (
    <div className={cn(GLASS, "relative flex gap-0.5 rounded-[14px] p-1")}>
      <LiquidIndicator activeIndex={mine ? 1 : 0} className="rounded-[10px]" />
      <button
        type="button"
        data-liquid-tab
        aria-pressed={!mine}
        onClick={() => onChange(false)}
        className={cn(glassTab(!mine), "rounded-[10px] px-[7px] sm:px-[9px]")}
      >
        공유 지도
      </button>
      <button
        type="button"
        data-liquid-tab
        aria-pressed={mine}
        onClick={() => onChange(true)}
        className={cn(glassTab(mine), "rounded-[10px] px-[7px] sm:px-[9px]")}
      >
        나의 지도
      </button>
    </div>
  );
}

// 계절 선택 (지도 아래 시간대 바 왼쪽, 목록은 위로 펼침)
function SeasonSelect({
  season,
  onChange,
}: {
  season: SeasonType;
  onChange: (value: SeasonType) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = SEASON_OPTIONS.find((option) => option.value === season);

  // 바깥 클릭·Esc로 닫기
  useDismiss(ref, open, setOpen);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`계절 선택: ${current?.name ?? "미선택"}`}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          SELECTED_PILL,
          "flex h-8 shrink-0 items-center gap-1 rounded-[9px] pr-2 pl-3 text-[13px] leading-none font-bold whitespace-nowrap text-white",
        )}
      >
        {current?.name ?? "계절"}
        {/* 피그마 화살표 모양 그대로, 색만 흰색으로. 위로 펼치니 닫혀 있을 때 ▲, 열리면 ▼ */}
        <MaskIcon
          src={chevronDown}
          className={cn("size-4 bg-white transition-transform", !open && "rotate-180")}
        />
      </button>
      {open && (
        <ul
          aria-label="계절"
          // 목록 글자가 지도 위에서도 잘 읽히게 패널보다 덜 비치게 (흰색 88%)
          className={cn(
            GLASS_SOLID,
            "absolute bottom-full left-0 z-20 mb-3 flex w-[70px] flex-col gap-0.5 rounded-xl p-1",
          )}
        >
          {SEASON_OPTIONS.map((option) => {
            const selected = option.value === season;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full rounded-lg py-[7px] pr-1.5 pl-2.5 text-left text-sm",
                    selected
                      ? cn(SELECTED_PILL, "font-bold text-white")
                      : "font-medium text-ink hover:bg-field",
                  )}
                >
                  {option.name}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// 지도 아래 가운데: 계절 선택 + 시간대 탭 ("언제의 지도인지"를 한 바에서 고름)
export function TimeBandBar({
  season,
  timeBand,
  onChange,
  onSeasonChange,
}: {
  season: SeasonType;
  timeBand: TimeBand;
  onChange: (value: TimeBand) => void;
  onSeasonChange: (value: SeasonType) => void;
}) {
  const activeIndex = TIME_BANDS.findIndex((band) => band.value === timeBand);
  return (
    <div className={cn(GLASS, "flex items-center gap-1 rounded-xl p-1")}>
      <SeasonSelect season={season} onChange={onSeasonChange} />
      <span className="h-5 w-px bg-[#c9d0dc]" aria-hidden />
      <div className="relative flex gap-0.5">
        <LiquidIndicator activeIndex={activeIndex} className="rounded-[9px]" />
        {TIME_BANDS.map((band) => {
          const active = band.value === timeBand;
          return (
            <button
              key={band.value}
              type="button"
              data-liquid-tab
              aria-pressed={active}
              onClick={() => onChange(band.value)}
              className={cn(glassTab(active), "rounded-[9px]")}
            >
              <span
                aria-hidden
                // 좁은 화면에서는 색 픽셀을 숨겨서 바 폭을 줄임
                className={cn(
                  "hidden size-2.5 rounded-[2px] transition-[border-color] duration-300 sm:block border-[1.5px]",
                  active ? "border-white" : "border-transparent",
                )}
                style={{ backgroundColor: BAND_PIXEL[band.value] }}
              />
              {band.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ColorBar({ colors }: { colors: ColorRatio[] }) {
  return (
    <div className="flex h-2.5 overflow-hidden rounded-[3px] bg-field">
      {colors.map((color) => (
        <span key={color.hex} style={{ backgroundColor: color.hex, flexGrow: color.ratio * 100 }} />
      ))}
    </div>
  );
}

const ZOOM_BUTTON =
  "grid size-8 place-items-center rounded-lg text-ink-sub transition-colors hover:bg-white/60 hover:text-ink";

// 지도 위 확대·축소·전체 버튼 (지도 화면·동 상세 공용). 터치 기기는 두 손가락으로 확대하므로 숨김
// className: 놓을 자리(right-·bottom- 등)와 화면별 추가 모양
export function ZoomControls({
  onZoomIn,
  onZoomOut,
  onReset,
  resetLabel,
  className,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  // "전체" 버튼의 화면 낭독기 이름
  resetLabel: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "liquid-glass absolute flex flex-col gap-0.5 rounded-xl p-1 pointer-coarse:hidden",
        className,
      )}
    >
      <button
        type="button"
        aria-label="확대"
        onClick={onZoomIn}
        className={`${ZOOM_BUTTON} text-lg leading-none`}
      >
        +
      </button>
      <button
        type="button"
        aria-label="축소"
        onClick={onZoomOut}
        className={`${ZOOM_BUTTON} text-lg leading-none`}
      >
        −
      </button>
      <button
        type="button"
        aria-label={resetLabel}
        onClick={onReset}
        className={`${ZOOM_BUTTON} text-[11px] font-bold`}
      >
        전체
      </button>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-danger-line bg-danger-soft px-4 py-3 text-sm text-danger">
      {message}
    </div>
  );
}
