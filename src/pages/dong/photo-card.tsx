import { useEffect, useState } from "react";
import type { DongPoint } from "../../api/dong";
import { getPhotoDetail, type PhotoDetail } from "../../api/photo";
import { bandLabel } from "../map/map-data";

function formatTakenAt(value: string) {
  return `${value.slice(0, 10).replaceAll("-", ".")} ${value.slice(11, 16)}`;
}

export function PhotoCard({
  points,
  mine,
  onClose,
}: {
  points: DongPoint[];
  mine: boolean;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [photo, setPhoto] = useState<PhotoDetail | null>(null);
  const [failedId, setFailedId] = useState<number | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const photoId = points[index].photoId;

  useEffect(() => {
    let cancelled = false;
    getPhotoDetail(photoId, mine)
      .then((data) => {
        if (cancelled) return;
        setPhoto(data);
      })
      .catch(() => {
        if (cancelled) return;
        setFailedId(photoId);
      });
    return () => {
      cancelled = true;
    };
  }, [photoId, mine]);

  const current = photo?.photoId === photoId ? photo : null;
  const showImage = current?.imageUrl && current.imageUrl !== failedUrl;

  return (
    <section className="w-full overflow-hidden rounded-[18px] border border-card-line bg-white shadow-[0_12px_32px_rgba(26,36,64,0.14)] sm:w-72">
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="font-mono text-xs text-ink-muted">
          {points.length > 1 ? `${index + 1} / ${points.length}` : "사진"}
        </span>
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="flex size-7 items-center justify-center rounded-lg border border-line text-ink-sub hover:bg-field"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden>
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {failedId === photoId ? (
        <p className="px-4 py-6 text-sm text-[#c2402f]">사진을 불러오지 못했어요.</p>
      ) : !current ? (
        <p className="px-4 py-6 text-sm text-ink-muted">불러오는 중...</p>
      ) : (
        <>
          {showImage ? (
            <img
              src={current.imageUrl ?? ""}
              alt={`${current.name} 사진`}
              onError={() => setFailedUrl(current.imageUrl)}
              className="mt-2 aspect-[4/3] w-full object-cover"
            />
          ) : (
            <div className="mt-2 flex aspect-[4/3] w-full">
              {current.palette.map((color, i) => (
                <span key={i} className="flex-1" style={{ backgroundColor: color }} />
              ))}
            </div>
          )}
          <div className="px-4 py-3">
            <p className="font-bold text-ink">{current.nickname}</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {formatTakenAt(current.takenAt)} · {bandLabel(current.timeBand)}
            </p>
            <div className="mt-3 flex h-5 overflow-hidden rounded-[6px]">
              {current.palette.map((color, i) => (
                <span key={i} className="flex-1" style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>
        </>
      )}

      {points.length > 1 && (
        <div className="flex justify-between border-t border-divider px-4 py-2 text-sm">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
            className="font-medium text-brand-strong disabled:text-ink-faint"
          >
            ‹ 이전
          </button>
          <button
            type="button"
            disabled={index === points.length - 1}
            onClick={() => setIndex(index + 1)}
            className="font-medium text-brand-strong disabled:text-ink-faint"
          >
            다음 ›
          </button>
        </div>
      )}
    </section>
  );
}
