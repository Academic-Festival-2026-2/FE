import type { DongColor, TimeBand } from "../../api/map";
import { cn } from "../../utils/cn";
import { EMPTY_FILL } from "./map-data";

const TIME_BANDS: { value: TimeBand; label: string }[] = [
  { value: "DAWN", label: "새벽" },
  { value: "DAY", label: "낮" },
  { value: "SUNSET", label: "노을" },
  { value: "NIGHT", label: "밤" },
];

const STATUS_LABEL = {
  OK: "",
  INSUFFICIENT: "데이터 부족",
  EMPTY: "사진 없음",
} as const;

export function TimeBandBar({
  value,
  onChange,
}: {
  value: TimeBand;
  onChange: (value: TimeBand) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-white/90 p-1.5 shadow">
      {TIME_BANDS.map((band) => (
        <button
          key={band.value}
          type="button"
          onClick={() => onChange(band.value)}
          className={cn(
            "h-9 rounded-lg px-4 text-sm font-semibold transition-colors",
            band.value === value ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100",
          )}
        >
          {band.label}
        </button>
      ))}
    </div>
  );
}

export function DongCard({ dong }: { dong: DongColor | undefined }) {
  if (!dong) return null;
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/90 px-4 py-3 shadow">
      <span
        className="h-8 w-8 rounded-md border border-black/10"
        style={{ backgroundColor: dong.dominantColor ?? EMPTY_FILL }}
      />
      <div>
        <p className="font-bold text-gray-900">{dong.name}</p>
        <p className="text-sm text-gray-600">
          사진 {dong.photoCount}장
          {STATUS_LABEL[dong.status] && ` · ${STATUS_LABEL[dong.status]}`}
        </p>
      </div>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 shadow">{message}</div>
  );
}
