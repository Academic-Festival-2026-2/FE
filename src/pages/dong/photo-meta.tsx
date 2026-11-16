import type { PhotoDetail } from "../../api/photo";
import { BAND_PIXEL, bandLabel } from "../map/map-data";
import { cn } from "../../utils/cn";
import { formatTakenAt, paletteShares } from "./photo-info";

// 사진 정보: 올린 사람 · 시간대 / 찍은 시각 / 대표색 막대
// 카드와 크게 보기(흰 정보 박스)가 같은 내용을 쓰고 색만 다름
const TONE = {
  light: {
    nickname: "text-ink",
    badge: "bg-field text-ink-sub",
    takenAt: "text-ink-muted",
    skeleton: "bg-field",
  },
  // 크게 보기 정보 박스: 글자는 모두 검정
  lightbox: {
    nickname: "text-ink",
    badge: "bg-field text-ink",
    takenAt: "text-ink",
    skeleton: "bg-field",
  },
};

export function PhotoMeta({
  photo,
  failed,
  tone = "light",
}: {
  // 아직 받는 중이면 null (자리 표시를 보여줌)
  photo: PhotoDetail | null;
  failed: boolean;
  tone?: keyof typeof TONE;
}) {
  const colors = TONE[tone];

  if (!photo) {
    if (failed) return null;
    return (
      <div className="animate-pulse space-y-2" aria-hidden>
        <div className={cn("h-4 w-24 rounded", colors.skeleton)} />
        <div className={cn("h-3 w-32 rounded", colors.skeleton)} />
        <div className={cn("mt-3 h-6 rounded-[6px]", colors.skeleton)} />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className={cn("truncate text-[15px] font-bold", colors.nickname)}>{photo.nickname}</p>
        <span
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] leading-none font-bold",
            colors.badge,
          )}
        >
          <span
            aria-hidden
            className="size-2 rounded-[2px]"
            style={{ backgroundColor: BAND_PIXEL[photo.timeBand] }}
          />
          {bandLabel(photo.timeBand)}
        </span>
      </div>
      <p className={cn("mt-1 font-mono text-xs", colors.takenAt)}>{formatTakenAt(photo.takenAt)}</p>
      {/* 업로드 화면 대표색 바와 같은 한 줄 막대 */}
      <div className="mt-3 flex h-6 overflow-hidden rounded-[8px]">
        {paletteShares(photo).map(({ color, share }) => (
          <span
            key={color}
            title={`${color} ${Math.round(share * 100)}%`}
            style={{ backgroundColor: color, width: `${share * 100}%` }}
          />
        ))}
      </div>
    </>
  );
}
