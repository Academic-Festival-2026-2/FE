import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ColorRatio, DongColor, TimeBand, TopDong } from "../../api/map";
import chevronDown from "../../assets/icons/chevron-down-navy.svg";
import { cn } from "../../utils/cn";
import { EMPTY_FILL, SEASON_OPTIONS, TIME_BANDS, bandLabel } from "./map-data";

const STATUS_LABEL = {
  OK: "",
  INSUFFICIENT: "데이터 부족",
  EMPTY: "사진 없음",
} as const;

// 시간대 탭·지도 종류 토글 공통 모양 (피그마: 흰 상자 안에서 고른 칸만 남색)
const TAB_GROUP = "flex rounded-xl border border-card-line bg-white p-1";
const tabClass = (active: boolean) =>
  cn(
    "flex h-[38px] items-center gap-2 rounded-[9px] px-3.5 text-sm transition-colors",
    active ? "bg-navy font-bold text-white" : "text-ink-sub hover:bg-field",
  );

export function TimeBandTabs({
  value,
  onChange,
}: {
  value: TimeBand;
  onChange: (value: TimeBand) => void;
}) {
  return (
    <div className={TAB_GROUP}>
      {TIME_BANDS.map((band) => (
        <button
          key={band.value}
          type="button"
          aria-pressed={band.value === value}
          onClick={() => onChange(band.value)}
          className={tabClass(band.value === value)}
        >
          <span className="flex gap-0.5" aria-hidden>
            {band.swatch.map((color) => (
              <span
                key={color}
                className="h-3.5 w-1.5 rounded-[2px]"
                style={{ backgroundColor: color }}
              />
            ))}
          </span>
          {band.label}
        </button>
      ))}
    </div>
  );
}

// 지도 위에 띄우는 유리 패널 (리퀴드 글라스 느낌). 값은 index.css의 liquid-glass에서 조정
export const GLASS = "liquid-glass";

// 위로 펼쳐지는 계절 목록: 글자가 잘 읽히게 패널보다 덜 비치는 유리
const GLASS_SOLID =
  "border border-white/70 bg-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_24px_rgba(26,36,64,0.12)] backdrop-blur-[14px] backdrop-saturate-150";

const glassTab = (active: boolean) =>
  cn(
    "flex h-8 shrink-0 items-center gap-1.5 px-2 text-[13px] leading-none whitespace-nowrap transition-colors sm:px-3",
    active ? "bg-navy font-bold text-white" : "font-medium text-ink-sub hover:bg-white/60",
  );

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
    <div className={cn(GLASS, "flex gap-0.5 rounded-[14px] p-1")}>
      <button
        type="button"
        aria-pressed={!mine}
        onClick={() => onChange(false)}
        className={cn(glassTab(!mine), "rounded-[10px]")}
      >
        공유 지도
      </button>
      <button
        type="button"
        aria-pressed={mine}
        onClick={() => onChange(true)}
        className={cn(glassTab(mine), "rounded-[10px]")}
      >
        내 지도
      </button>
    </div>
  );
}

// 시간대 한 칸의 대표 픽셀 색 (피그마 D2)
const BAND_PIXEL: Record<TimeBand, string> = {
  DAWN: "#c9ccd3",
  DAY: "#7fb1e5",
  SUNSET: "#ff8a3d",
  NIGHT: "#5e6a8f",
};

// 지도 아래 가운데: 계절 선택 + 시간대 탭
// 계절은 지금 서버가 주는 시즌만 고를 수 있음 (다른 계절 조회 API가 생기면 onSeasonChange 연결)
export function SeasonTimeBar({
  season,
  timeBand,
  onTimeBandChange,
}: {
  season: string | null;
  timeBand: TimeBand;
  onTimeBandChange: (value: TimeBand) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = SEASON_OPTIONS.find((option) => option.value === season);

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
    <div ref={ref} className={cn(GLASS, "relative flex items-center gap-1 rounded-xl p-1")}>
      {open && (
        <ul
          role="listbox"
          aria-label="계절"
          // 목록 글자가 지도 위에서도 잘 읽히게 패널보다 덜 비치게 (흰색 88%)
          className={cn(GLASS_SOLID, "absolute bottom-full left-1 mb-2 flex w-[70px] flex-col gap-0.5 rounded-xl p-1")}
        >
          {SEASON_OPTIONS.map((option) => {
            const selected = option.value === season;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={!selected}
                  title={selected ? undefined : "다른 계절은 준비 중이에요"}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "w-full rounded-lg py-[7px] pr-1.5 pl-2.5 text-left text-sm",
                    selected
                      ? "bg-[rgba(237,242,252,0.85)] font-bold text-navy"
                      : "font-medium text-ink disabled:cursor-not-allowed disabled:text-ink-faint",
                  )}
                >
                  {option.name}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-8 shrink-0 items-center gap-1 rounded-lg bg-[#edf2fc] pr-2 pl-3 text-[13px] leading-none font-bold whitespace-nowrap text-ink"
      >
        {current?.name ?? "계절"}
        <img
          src={chevronDown}
          alt=""
          width={16}
          height={16}
          className={cn("transition-transform", !open && "rotate-180")}
        />
      </button>
      <span className="h-5 w-px bg-[#c9d0dc]" aria-hidden />
      <div className="flex gap-0.5">
        {TIME_BANDS.map((band) => {
          const active = band.value === timeBand;
          return (
            <button
              key={band.value}
              type="button"
              aria-pressed={active}
              onClick={() => onTimeBandChange(band.value)}
              className={cn(glassTab(active), "rounded-[9px]")}
            >
              <span
                aria-hidden
                // 좁은 화면에서는 색 픽셀을 숨겨서 바 폭을 줄임
                className={cn("hidden size-2.5 rounded-[2px] sm:block", active && "border-[1.5px] border-white")}
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

const PANEL = "rounded-[18px] border border-card-line bg-white p-6";

export function RankPanel({
  timeBand,
  season,
  topDongs,
  onHover,
}: {
  timeBand: TimeBand;
  season: { name: string; months: string } | undefined;
  topDongs: TopDong[];
  onHover: (dongCode: string | null) => void;
}) {
  return (
    <section className={PANEL}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-extrabold text-ink">{bandLabel(timeBand)}이 예쁜 동</h2>
        <span className="text-xs text-ink-muted">
          {season ? `${season.name} · ` : ""}사진 많은 순
        </span>
      </div>

      {topDongs.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">아직 이 시간대 사진이 없어요.</p>
      ) : (
        <ol className="mt-3">
          {topDongs.map((dong, index) => (
            <li
              key={dong.dongCode}
              onMouseEnter={() => onHover(dong.dongCode)}
              onMouseLeave={() => onHover(null)}
              className="grid min-h-[70px] grid-cols-[20px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-t border-divider py-3"
            >
              <span className="row-span-2 font-mono text-xl font-semibold text-brand-strong">
                {index + 1}
              </span>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-base font-extrabold text-ink">{dong.name}</span>
                <span className="text-xs text-ink-muted">
                  {dong.guName} · {dong.photoCount}장
                </span>
              </div>
              <ColorBar colors={dong.colorRatio} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function MyMapPanel({
  timeBand,
  dongs,
  onHover,
}: {
  timeBand: TimeBand;
  dongs: DongColor[];
  onHover: (dongCode: string | null) => void;
}) {
  const filled = dongs
    .filter((dong) => dong.dominantColor)
    .sort((a, b) => b.photoCount - a.photoCount);
  const empty = dongs.length - filled.length;
  const percent = dongs.length ? (filled.length / dongs.length) * 100 : 0;

  return (
    <section className={PANEL}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-extrabold text-ink">내가 칠한 동</h2>
        <span className="text-xs text-ink-muted">
          {filled.length} / {dongs.length}곳
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-field">
        <div className="h-full rounded-full bg-[#ff8a3d]" style={{ width: `${percent}%` }} />
      </div>

      {filled.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">
          아직 {bandLabel(timeBand)} 사진으로 칠한 동이 없어요.
        </p>
      ) : (
        <ol className="mt-3">
          {filled.map((dong, index) => (
            <li
              key={dong.dongCode}
              onMouseEnter={() => onHover(dong.dongCode)}
              onMouseLeave={() => onHover(null)}
              className="flex h-[45px] items-center gap-4 border-t border-divider"
            >
              <span className="w-3 font-mono text-[13px] text-brand-strong">{index + 1}</span>
              <span className="flex-1 text-[15px] font-bold text-ink">{dong.name}</span>
              <span className="text-xs text-ink-muted">{dong.photoCount}장</span>
            </li>
          ))}
        </ol>
      )}

      {empty > 0 && (
        <p className="mt-4 border-t border-divider pt-4 text-[15px] font-bold text-brand-strong">
          {empty}개 동이 아직 비어 있어요
        </p>
      )}
    </section>
  );
}

export function DongCard({ dong }: { dong: DongColor | undefined }) {
  if (!dong) return null;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-card-line bg-white/95 px-4 py-3">
      <span
        className="h-8 w-8 rounded-md border border-black/10"
        style={{ backgroundColor: dong.dominantColor ?? EMPTY_FILL }}
      />
      <div>
        <p className="font-bold text-ink">{dong.name}</p>
        <p className="text-sm text-ink-sub">
          사진 {dong.photoCount}장{STATUS_LABEL[dong.status] && ` · ${STATUS_LABEL[dong.status]}`}
        </p>
      </div>
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
