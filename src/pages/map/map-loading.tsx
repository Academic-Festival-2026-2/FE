import { useEffect, useState } from "react";
import { cn } from "../../utils/cn";
import { GLASS } from "./map-ui";

// 로고 4색 (logo-mark.tsx와 같음). 시계 방향으로 하나씩 차오르며 도는 순서: 왼쪽 위 → 오른쪽 위 → 오른쪽 아래 → 왼쪽 아래
const PIXELS = [
  { color: "#c4b7e9", delay: 0 },
  { color: "#8ab4e9", delay: 150 },
  { color: "#ee8156", delay: 450 },
  { color: "#2d2670", delay: 300 },
];
// 빨리 끝나는 로딩에서는 안내가 번쩍이지 않도록 잠깐 기다렸다가 보여 줌
const SHOW_DELAY_MS = 300;

function useDelayedFlag(active: boolean, delay: number) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => setShown(true), delay);
    return () => {
      window.clearTimeout(timer);
      setShown(false);
    };
  }, [active, delay]);
  return active && shown;
}

// 지도를 불러오거나 그리는 중일 때 지도 가운데에 띄우는 안내 (지도 화면·동 상세 공용)
export function MapLoading({ show, className }: { show: boolean; className?: string }) {
  const visible = useDelayedFlag(show, SHOW_DELAY_MS);
  if (!visible) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("pointer-events-none absolute inset-0 z-[5] grid place-items-center px-4", className)}
    >
      <div className={cn(GLASS, "flex items-center gap-3 rounded-[14px] px-4 py-3")}>
        <span className="grid shrink-0 grid-cols-2 gap-[3px]" aria-hidden>
          {PIXELS.map((pixel) => (
            <span
              key={pixel.color}
              className="pixel-loading size-2.5 rounded-[2px]"
              style={{ backgroundColor: pixel.color, animationDelay: `${pixel.delay}ms` }}
            />
          ))}
        </span>
        <span className="text-sm font-bold text-ink">픽셀이 지도를 채우는 중이에요</span>
      </div>
    </div>
  );
}
