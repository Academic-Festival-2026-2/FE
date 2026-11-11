import type { ColorRatio, DongColor, TimeBand, TopDong } from "../../api/map";
import { cn } from "../../utils/cn";
import { EMPTY_FILL, TIME_BANDS, bandLabel } from "./map-data";

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

export function SeasonChip({ season }: { season: { name: string; months: string } }) {
  return (
    <span className="flex h-12 items-center rounded-xl border border-card-line bg-white px-4 text-sm text-ink">
      {season.name}
    </span>
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
    <div className={cn(TAB_GROUP, "inline-flex")}>
      <button
        type="button"
        aria-pressed={!mine}
        onClick={() => onChange(false)}
        className={tabClass(!mine)}
      >
        공유 지도
      </button>
      <button
        type="button"
        aria-pressed={mine}
        onClick={() => onChange(true)}
        className={tabClass(mine)}
      >
        내 지도
      </button>
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
