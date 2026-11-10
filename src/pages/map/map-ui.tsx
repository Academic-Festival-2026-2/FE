import type { ColorRatio, DongColor, TimeBand, TopDong } from "../../api/map";
import { cn } from "../../utils/cn";
import { EMPTY_FILL, TIME_BANDS, bandLabel, toneColor } from "./map-data";
import { Link } from "@tanstack/react-router";

const THEMES = ["전체", "블루아워", "물안개", "야경"];

const STATUS_LABEL = {
  OK: "",
  INSUFFICIENT: "데이터 부족",
  EMPTY: "사진 없음",
} as const;

export function TimeBandTabs({
  value,
  onChange,
}: {
  value: TimeBand;
  onChange: (value: TimeBand) => void;
}) {
  return (
    <div className="flex rounded-xl border border-[#e8e4dc] bg-white p-1">
      {TIME_BANDS.map((band) => (
        <button
          key={band.value}
          type="button"
          aria-pressed={band.value === value}
          onClick={() => onChange(band.value)}
          className={cn(
            "flex h-9 items-center gap-2 rounded-lg px-3 text-sm transition-colors",
            band.value === value
              ? "bg-gray-900 font-bold text-white"
              : "text-gray-600 hover:bg-[#f7f5f0]",
          )}
        >
          <span className="flex gap-px" aria-hidden>
            {band.swatch.map((color) => (
              <span
                key={color}
                className="h-3 w-1 rounded-[1px]"
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
    <span className="flex h-11 items-center rounded-xl border border-[#e8e4dc] bg-white px-4 text-sm text-gray-800">
      {season.name} {season.months}
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
  const tab = (active: boolean) =>
    `h-9 rounded-lg px-4 text-sm ${active ? "bg-gray-900 font-bold text-white" : "text-gray-500 hover:text-gray-900"}`;

  return (
    <div className="inline-flex rounded-xl border border-[#e8e4dc] bg-white p-1">
      <button
        type="button"
        aria-pressed={!mine}
        onClick={() => onChange(false)}
        className={tab(!mine)}
      >
        공유 지도
      </button>
      <button
        type="button"
        aria-pressed={mine}
        onClick={() => onChange(true)}
        className={tab(mine)}
      >
        내 지도
      </button>
    </div>
  );
}

export function ColorBar({ colors }: { colors: ColorRatio[] }) {
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-[#f2f0eb]">
      {colors.map((color) => (
        <span key={color.hex} style={{ backgroundColor: color.hex, flexGrow: color.ratio * 100 }} />
      ))}
    </div>
  );
}

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
    <section className="rounded-3xl border border-[#e8e4dc] bg-white p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-extrabold text-gray-900">{bandLabel(timeBand)}이 예쁜 동</h2>
        <span className="text-xs text-gray-500">
          {season ? `${season.name} · ` : ""}사진 많은 순
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {THEMES.map((theme, index) => (
          <button
            key={theme}
            type="button"
            aria-pressed={index === 0}
            disabled={index !== 0}
            title={index === 0 ? undefined : "테마는 준비 중이에요"}
            className={cn(
              "h-7 rounded-full border px-2.5 text-xs",
              index === 0
                ? "border-gray-900 bg-gray-900 font-bold text-white"
                : "border-[#e8e4dc] text-gray-600",
            )}
          >
            {theme}
          </button>
        ))}
      </div>

      {topDongs.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">아직 이 시간대 사진이 없어요.</p>
      ) : (
        <ol className="mt-2">
          {topDongs.map((dong, index) => (
            <li
              key={dong.dongCode}
              onMouseEnter={() => onHover(dong.dongCode)}
              onMouseLeave={() => onHover(null)}
              className="grid grid-cols-[20px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-t border-[#f0ede6] py-3 first:border-t-0"
            >
              <span className="row-span-2 text-lg font-extrabold text-[#ff8a3d]">{index + 1}</span>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-bold text-gray-900">{dong.name}</span>
                <span className="text-xs text-gray-500">
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
    <section className="rounded-3xl border border-[#e8e4dc] bg-white p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-extrabold text-gray-900">내가 칠한 동</h2>
        <span className="text-sm font-bold text-gray-900">
          {filled.length}
          <span className="font-normal text-gray-500">/{dongs.length}곳</span>
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f2f0eb]">
        <div className="h-full rounded-full bg-[#ff8a3d]" style={{ width: `${percent}%` }} />
      </div>

      {filled.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">
          아직 {bandLabel(timeBand)} 사진으로 칠한 동이 없어요.
        </p>
      ) : (
        <ul className="mt-2">
          {filled.map((dong) => (
            <li
              key={dong.dongCode}
              onMouseEnter={() => onHover(dong.dongCode)}
              onMouseLeave={() => onHover(null)}
              className="flex items-center gap-3 border-t border-[#f0ede6] py-3 first:border-t-0"
            >
              <span
                className="h-5 w-5 shrink-0 rounded-md border border-black/10"
                style={{ backgroundColor: toneColor(dong.dominantColor ?? EMPTY_FILL) }}
              />
              <span className="flex-1 font-bold text-gray-900">{dong.name}</span>
              <span className="text-xs text-gray-500">{dong.photoCount}장</span>
            </li>
          ))}
        </ul>
      )}

      {empty > 0 && <p className="mt-3 text-xs text-gray-500">{empty}개 동이 아직 비어 있어요</p>}
    </section>
  );
}

export function UploadCta() {
  return (
    <section className="rounded-3xl border border-[#fbe0cc] bg-[#fff1e6] p-5">
      <p className="font-bold text-gray-900">
        내 사진으로 이 지도를 채워 주세요
      </p>
      <Link
        to="/upload"
        className="mt-4 inline-flex h-11 items-center rounded-xl bg-[#ff8a3d] px-5 text-sm font-bold text-gray-900 transition-colors hover:bg-[#f57a2a]"
      >
        사진 올리기
      </Link>
    </section>
  );
}

export function DongCard({ dong }: { dong: DongColor | undefined }) {
  if (!dong) return null;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#e8e4dc] bg-white/95 px-4 py-3">
      <span
        className="h-8 w-8 rounded-md border border-black/10"
        style={{ backgroundColor: dong.dominantColor ?? EMPTY_FILL }}
      />
      <div>
        <p className="font-bold text-gray-900">{dong.name}</p>
        <p className="text-sm text-gray-600">
          사진 {dong.photoCount}장{STATUS_LABEL[dong.status] && ` · ${STATUS_LABEL[dong.status]}`}
        </p>
      </div>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>;
}
