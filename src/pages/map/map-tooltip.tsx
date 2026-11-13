import type { DongColor } from "../../api/map";
import { ColorBar } from "./map-ui";

type Props = {
  dong: DongColor;
  guName: string | null;
  bandLabel: string;
  hint: string;
};

export function MapTooltip({ dong, guName, bandLabel, hint }: Props) {
  return (
    <div className="w-64 rounded-xl border border-line bg-white p-4 shadow-[0_8px_20px_rgba(22,22,26,0.1)]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-base font-extrabold text-ink">{dong.name}</span>
        <span className="text-xs text-ink-muted">{guName}</span>
      </div>
      <div className="mt-3">
        <ColorBar colors={(dong.colorRatio ?? []).slice(0, 4)} />
      </div>
      <p className="mt-3 text-[13px] text-ink-sub">
        {bandLabel} 사진 {dong.photoCount}장
      </p>
      <p className="mt-1 text-[13px] font-bold text-brand-strong">{hint}</p>
    </div>
  );
}
