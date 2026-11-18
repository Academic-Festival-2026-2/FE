import { Link } from "@tanstack/react-router";
import type { ColorRatio } from "../../api/map";
import { ColorBar } from "../../features/map/map-ui";

// 지도 화면 오른쪽 칸·가운데 안내 (지도 화면에서만 씀)

const PANEL = "rounded-[18px] border border-card-line bg-white p-6";

// 오른쪽 패널에 보여 줄 동 (공유 지도는 BE topDongs, 나의 지도는 내 칸에서 고름)
export type TopDongItem = {
  dongCode: string;
  name: string;
  // 구가 없는 시·군은 비어 있음
  guName?: string | null;
  photoCount: number;
  colorRatio: ColorRatio[];
};

// 공유 지도·나의 지도 오른쪽 패널: "{제목}" + 사진 많은 순 상위 동 (최대 3개)
export function TopDongsPanel({
  title,
  season,
  dongs,
  emptyText,
  onHover,
}: {
  title: string;
  season: { name: string; months: string } | undefined;
  dongs: TopDongItem[];
  emptyText: string;
  onHover: (dongCode: string | null) => void;
}) {
  return (
    <section className={PANEL}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-extrabold text-ink">{title}</h2>
        <span className="text-xs text-ink-muted">
          {season ? `${season.name} · ` : ""}사진 많은 순
        </span>
      </div>

      {dongs.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">{emptyText}</p>
      ) : (
        <ol className="mt-3">
          {dongs.map((dong, index) => (
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
                  {dong.guName ? `${dong.guName} · ` : ""}
                  {dong.photoCount}장
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

// 나의 지도에 아직 칠한 칸이 하나도 없을 때 지도 가운데에 띄우는 안내 (피그마 "18 · 나의 지도 비어 있음")
export function EmptyMyMapCard({ season }: { season: string }) {
  return (
    <div className="flex w-[min(372px,calc(100vw-72px))] flex-col items-center rounded-[18px] bg-white px-6 pt-6 pb-6 text-center shadow-[0_16px_20px_rgba(22,22,26,0.18)]">
      <span className="grid grid-cols-3 gap-1" aria-hidden>
        {Array.from({ length: 9 }, (_, i) =>
          i === 4 ? (
            <span key={i} className="size-4 rounded-[3px] border-2 border-dashed border-brand" />
          ) : (
            <span key={i} className="size-4 rounded-[3px] bg-preview" />
          ),
        )}
      </span>
      <p className="mt-3.5 text-lg font-extrabold text-ink">
        이 지역의 {season} 지도는 아직 비어 있어요
      </p>
      <p className="mt-1 text-sm text-ink-sub">사진 한 장이면 첫 동이 칠해져요.</p>
      <Link
        to="/upload"
        className="mt-4 flex h-12 items-center rounded-xl bg-brand px-[22px] text-[15px] font-extrabold text-white transition-colors hover:bg-brand-hover"
      >
        첫 사진 업로드
      </Link>
    </div>
  );
}

// 나의 지도가 비어 있을 때 오른쪽 패널: 어떻게 채워지는지 3단계 안내
export function MyMapGuidePanel({
  regionName,
  dongCount,
}: {
  regionName: string;
  dongCount: number;
}) {
  const steps = [
    "사진을 올리면 찍은 동에 첫 색이 칠해져요",
    "새벽·낮·노을·밤마다 따로 칠해져요",
    `${dongCount}개 동을 다 칠하면 나만의 ${regionName} 지도 완성`,
  ];
  return (
    <section className={PANEL}>
      <h2 className="text-lg font-extrabold text-ink">이렇게 채워져요</h2>
      <ol className="mt-3.5 flex flex-col gap-3.5">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-3">
            <span className="grid size-[26px] shrink-0 place-items-center rounded-full bg-brand text-[13px] font-bold text-white">
              {i + 1}
            </span>
            <span className="pt-[3px] text-sm text-[#3e4350]">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
