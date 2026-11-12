import { useEffect, useState } from "react";
import type { DongPoint } from "../../api/dong";
import { getPhotoDetail, type PhotoDetail } from "../../api/photo";
import { BAND_PIXEL, bandLabel } from "../map/map-data";
import { getPhotoColorRatios } from "./photo-color-ratios";
import { cn } from "../../utils/cn";

function formatTakenAt(value: string) {
  return `${value.slice(0, 10).replaceAll("-", ".")} ${value.slice(11, 16)}`;
}

// 대표색 막대: 비율 계산은 getPhotoColorRatios (bins 검증, 없으면 같은 폭)
// 5색을 채우려고 반복한 같은 색은 한 칸으로 합침
function paletteShares({ palette, bins }: PhotoDetail) {
  const ratios = getPhotoColorRatios(palette, bins);
  const shares = new Map<string, number>();
  palette.forEach((color, i) => shares.set(color, (shares.get(color) ?? 0) + (ratios[i] ?? 0)));
  return [...shares].filter(([, share]) => share > 0).map(([color, share]) => ({ color, share }));
}

// 말풍선 사진 크기 한도(px). 카드 폭이 사진 폭에 딱 맞게 바뀜
// 세로 사진은 조금 더 길게 허용, 너무 좁아지면 아래 닉네임·시간대 줄이 들어갈 최소 폭 유지
const BUBBLE_PHOTO_MAX_WIDTH = 264;
const BUBBLE_PHOTO_MAX_HEIGHT = 240;
const BUBBLE_PHOTO_MAX_HEIGHT_PORTRAIT = 300;
const BUBBLE_PHOTO_MIN_WIDTH = 168;
// 카드 안쪽 여백(p-2 양쪽) + 테두리(양쪽 1px)
const BUBBLE_CARD_CHROME = 18;

function bubblePhotoSize(naturalWidth: number, naturalHeight: number) {
  const ratio = naturalWidth / naturalHeight;
  const maxHeight = ratio < 1 ? BUBBLE_PHOTO_MAX_HEIGHT_PORTRAIT : BUBBLE_PHOTO_MAX_HEIGHT;
  const width = Math.round(Math.min(BUBBLE_PHOTO_MAX_WIDTH, maxHeight * ratio));
  return { width, height: Math.round(width / ratio) };
}

// 사진 위에 떠 있는 작은 버튼 (닫기·이전·다음). 어떤 사진 위에서도 보이게 어두운 반투명 + 흐림
const PHOTO_BUTTON =
  "flex size-8 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition-colors hover:bg-black/55";

function Chevron({ left }: { left?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path
        d={left ? "M9 2.5L4.5 7 9 11.5" : "M5 2.5L9.5 7 5 11.5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PhotoCard({
  points,
  mine,
  onClose,
  variant = "sheet",
}: {
  points: DongPoint[];
  mine: boolean;
  onClose: () => void;
  // bubble: 데스크톱에서 지도 픽셀 위에 붙는 작은 말풍선 / sheet: 모바일 아래 카드·위치 없는 사진
  variant?: "bubble" | "sheet";
}) {
  const bubble = variant === "bubble";
  const [index, setIndex] = useState(0);
  const [photo, setPhoto] = useState<PhotoDetail | null>(null);
  const [failedId, setFailedId] = useState<number | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  // 다 받은 사진의 원래 크기 (말풍선 카드 폭을 사진 비율에 맞출 때 씀)
  const [loaded, setLoaded] = useState<{ url: string; width: number; height: number } | null>(
    null,
  );
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

  // Esc로 닫기, ←/→로 이전·다음 사진
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowLeft" && index > 0) setIndex(index - 1);
      else if (event.key === "ArrowRight" && index < points.length - 1) setIndex(index + 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, points.length, onClose]);

  const current = photo?.photoId === photoId ? photo : null;
  const failed = failedId === photoId;
  const showImage = current?.imageUrl && current.imageUrl !== failedUrl;
  const imageLoaded = Boolean(showImage && loaded?.url === current?.imageUrl);
  const bubbleSize =
    bubble && imageLoaded && loaded ? bubblePhotoSize(loaded.width, loaded.height) : null;

  const card = (
    <section
      aria-label="사진 정보"
      className={cn(
        "rounded-[22px] border border-white/70 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_16px_40px_rgba(26,36,64,0.18)] backdrop-blur-[14px] backdrop-saturate-150",
        bubble
          ? cn("rounded-bl-[6px] bg-white/95", !bubbleSize && "w-[280px]")
          : "w-full bg-white/90 sm:w-auto sm:max-w-[360px] sm:min-w-[260px]",
      )}
      style={
        bubbleSize
          ? { width: Math.max(bubbleSize.width, BUBBLE_PHOTO_MIN_WIDTH) + BUBBLE_CARD_CHROME }
          : undefined
      }
    >
      {/* 사진 영역: 원래 비율 그대로 (잘리지 않게, 너무 길면 높이만 제한) */}
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-[16px] bg-field",
          !imageLoaded && "min-h-[180px]",
        )}
      >
        {failed ? (
          <p className="px-4 py-16 text-sm text-danger">사진을 불러오지 못했어요.</p>
        ) : !current ? (
          <div className="aspect-[4/3] w-full animate-pulse bg-[#e9ecf2]" />
        ) : showImage ? (
          <img
            src={current.imageUrl ?? ""}
            alt={`${current.name}에서 찍은 사진`}
            onLoad={(event) =>
              setLoaded({
                url: current.imageUrl ?? "",
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              })
            }
            onError={() => setFailedUrl(current.imageUrl)}
            style={bubbleSize ?? undefined}
            className={cn(
              "block transition-opacity duration-300",
              !bubbleSize && "h-auto w-auto max-w-full",
              !bubble && "max-h-[min(42vh,420px)] sm:max-h-[min(55vh,480px)]",
              bubble && !bubbleSize && "max-h-[240px]",
              imageLoaded ? "opacity-100" : "opacity-0",
            )}
          />
        ) : (
          // 사진 파일이 없으면 대표색으로 채움
          <div className="flex aspect-[4/3] w-full">
            {paletteShares(current).map(({ color, share }) => (
              <span key={color} style={{ backgroundColor: color, width: `${share * 100}%` }} />
            ))}
          </div>
        )}

        {points.length > 1 && (
          <span className="absolute top-2.5 left-2.5 rounded-full bg-black/35 px-2.5 py-1 font-mono text-[11px] leading-none text-white backdrop-blur-md">
            {index + 1} / {points.length}
          </span>
        )}
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className={cn(PHOTO_BUTTON, "absolute top-2 right-2")}
        >
          <svg width="11" height="11" viewBox="0 0 14 14" aria-hidden>
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {index > 0 && (
          <button
            type="button"
            aria-label="이전 사진"
            onClick={() => setIndex(index - 1)}
            className={cn(PHOTO_BUTTON, "absolute top-1/2 left-2 -translate-y-1/2")}
          >
            <Chevron left />
          </button>
        )}
        {index < points.length - 1 && (
          <button
            type="button"
            aria-label="다음 사진"
            onClick={() => setIndex(index + 1)}
            className={cn(PHOTO_BUTTON, "absolute top-1/2 right-2 -translate-y-1/2")}
          >
            <Chevron />
          </button>
        )}

        {/* 여러 장이면 아래 가운데 점으로 위치 표시 (8장 넘으면 왼쪽 위 숫자만) */}
        {points.length > 1 && points.length <= 8 && (
          <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/25 px-2 py-1.5 backdrop-blur-md">
            {points.map((point, i) => (
              <span
                key={point.photoId}
                className={cn(
                  "h-1.5 rounded-full bg-white transition-all",
                  i === index ? "w-3.5" : "w-1.5 opacity-55",
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* 정보 영역: 올린 사람 · 시간대 / 찍은 시각 / 대표색 */}
      <div className="px-2 pt-3 pb-1.5">
        {current ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-[15px] font-bold text-ink">{current.nickname}</p>
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-field px-2.5 py-1 text-[11px] leading-none font-bold text-ink-sub">
                <span
                  aria-hidden
                  className="size-2 rounded-[2px]"
                  style={{ backgroundColor: BAND_PIXEL[current.timeBand] }}
                />
                {bandLabel(current.timeBand)}
              </span>
            </div>
            <p className="mt-1 font-mono text-xs text-ink-muted">{formatTakenAt(current.takenAt)}</p>
            {/* 업로드 화면 대표색 바와 같은 한 줄 막대 */}
            <div className="mt-3 flex h-6 overflow-hidden rounded-[8px]">
              {paletteShares(current).map(({ color, share }) => (
                <span
                  key={color}
                  title={`${color} ${Math.round(share * 100)}%`}
                  style={{ backgroundColor: color, width: `${share * 100}%` }}
                />
              ))}
            </div>
          </>
        ) : (
          !failed && (
            <div className="animate-pulse space-y-2" aria-hidden>
              <div className="h-4 w-24 rounded bg-field" />
              <div className="h-3 w-32 rounded bg-field" />
              <div className="mt-3 h-6 rounded-[6px] bg-field" />
            </div>
          )
        )}
      </div>
    </section>
  );

  if (!bubble) return card;

  // 말풍선: 픽셀 오른쪽 위에 뜨고, 왼쪽 아래 모서리에서 꼬리가 픽셀 쪽으로 비스듬히 뻗음
  // (말풍선 위치는 dong-page.tsx BUBBLE_OFFSET, 꼬리 끝은 확대된 픽셀 모서리 근처)
  return (
    <div className="relative origin-bottom-left animate-[photo-pop_200ms_cubic-bezier(0.34,1.25,0.64,1)] whitespace-normal">
      {card}
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        aria-hidden
        className="absolute -bottom-[14px] -left-[14px] -z-10 drop-shadow-[0_2px_2px_rgba(26,36,64,0.12)]"
      >
        <path d="M1 27L14 4L24 14Z" fill="rgb(255 255 255 / 0.95)" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
