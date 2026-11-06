import type { DongColor } from "../../api/map";
import { ColorBar } from "./map-ui";

type Props = {
  dong: DongColor;
  guName: string;
  bandLabel: string;
  hint: string;
};

export function MapTooltip({ dong, guName, bandLabel, hint }: Props) {
  return (
      <div className="w-52 rounded-xl border border-[#e8e4dc] bg-white p-3 shadow-lg">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-bold text-gray-900">{dong.name}</span>
          <span className="text-xs text-gray-500">{guName}</span>
        </div>
        <div className="mt-2">
          <ColorBar colors={dong.colorRatio.slice(0, 4)} />
        </div>
        <p className="mt-2 text-xs text-gray-600">
          {bandLabel} 사진 {dong.photoCount}장
        </p>
        <p className="mt-1 text-xs font-bold text-[#c4581a]">{hint}</p>
      </div>
  );
}