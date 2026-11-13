import { Link } from "@tanstack/react-router";
import { BAND_PIXEL, TIME_BANDS } from "../map/map-data";
import { currentTimeBand } from "../../utils/time-band";
import { FilterSelect } from "./filter-select";
import { REGION_OPTIONS, SEASON_FILTER_OPTIONS } from "./my-map-filters";
import type { MyMapStats } from "./my-map-stats";
import { MYPAGE_SECTION } from "./mypage-sections";
import { SectionCard } from "./section-card";

type MyMapProgressSectionProps = {
  stats: MyMapStats | null;
  error: boolean;
  region: string;
  season: string;
  onRegionChange: (region: string) => void;
  onSeasonChange: (season: string) => void;
};

// 나의 지도 현황: 지역·계절별 칠한 동 수와 시간대별 칠한 동 수 (펼치지 않고 항상 보임)
export function MyMapProgressSection({
  stats,
  error,
  region,
  season,
  onRegionChange,
  onSeasonChange,
}: MyMapProgressSectionProps) {
  return (
    <SectionCard
      id={MYPAGE_SECTION.myMap}
      title="나의 지도 현황"
      aside={
        // 지역·계절 선택 (지금은 부천·가을만 고를 수 있고 나머지는 "준비 중")
        <div className="flex gap-1.5">
          <FilterSelect label="지역" value={region} options={REGION_OPTIONS} onChange={onRegionChange} />
          <FilterSelect label="계절" value={season} options={SEASON_FILTER_OPTIONS} onChange={onSeasonChange} />
        </div>
      }
    >
      {error && <p className="mt-4 text-sm text-danger">나의 지도를 불러오지 못했어요.</p>}
      {!stats && !error && <p className="mt-4 text-sm text-ink-muted">불러오는 중...</p>}
      {stats && (
        <>
          <p className="mt-4 flex items-baseline gap-2">
            <span className="text-sm text-ink-sub">칠한 동</span>
            <span className="text-[28px] leading-none font-extrabold tracking-[-0.6px] text-ink">
              {stats.filledDongs}
            </span>
            <span className="text-sm text-ink-muted">/ {stats.totalDongs}곳</span>
          </p>
          <p className="mt-1.5 text-xs text-ink-muted">시간대 하나라도 칠했으면 칠한 동으로 세요.</p>

          {/* 시간대를 누르면 그 시간대의 나의 지도로 */}
          <ul className="mt-4 mb-4 flex flex-col gap-1">
            {TIME_BANDS.map((band) => {
              const { filled, total } = stats.byBand[band.value];
              const percent = total ? (filled / total) * 100 : 0;
              return (
                <li key={band.value}>
                  <Link
                    to="/map"
                    search={{ timeBand: band.value, mode: "mine" }}
                    aria-label={`${band.label} ${filled} / ${total}곳, 나의 지도에서 보기`}
                    className="grid grid-cols-[40px_minmax(0,1fr)_64px] items-center gap-3 rounded-lg px-1 py-1.5 text-sm transition-colors hover:bg-field"
                  >
                    <span className="font-bold text-ink">{band.label}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-field">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${percent}%`, backgroundColor: BAND_PIXEL[band.value] }}
                      />
                    </span>
                    <span className="text-right text-ink-sub">
                      <b className="text-ink">{filled}</b> / {total}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* PC 두 칸 배치에서 배지 카드에 맞춰 높이가 늘어나면 이 줄을 카드 맨 아래로 (mt-auto) */}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-divider pt-3.5 text-xs text-ink-muted">
            <p>
              {stats.totalDongs}개 동 × 시간대 4개 = {stats.totalCells}칸 중{" "}
              <b className="text-ink-sub">{stats.filledCells}칸</b>
            </p>
            <Link
              to="/map"
              search={{ timeBand: currentTimeBand(), mode: "mine" }}
              className="text-sm font-bold text-brand-strong hover:text-brand"
            >
              나의 지도에서 보기 ›
            </Link>
          </div>
        </>
      )}
    </SectionCard>
  );
}
