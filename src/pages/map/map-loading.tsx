import { useEffect, useState } from "react";
import { cn } from "../../utils/cn";
import { EMPTY_FILL } from "./map-data";

// 로고 4칸 (logo-mark.tsx와 같은 배치·색: 라벤더·하늘 / 주황·남색). order: 불이 들어오는 순서 (시계 방향)
const PIXELS = [
  { color: "#c4b7e9", order: 0 }, // 왼쪽 위
  { color: "#8ab4e9", order: 1 }, // 오른쪽 위
  { color: "#ee8156", order: 3 }, // 왼쪽 아래
  { color: "#2d2670", order: 2 }, // 오른쪽 아래
];
// 한 칸씩 불이 들어오는 간격. 0칸 → 1칸 → … → 4칸(잠깐 유지) → 다시 0칸
const STEP_MS = 320;
const STEPS = [0, 1, 2, 3, 4, 4];
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

// 켜진 칸 수 (움직임 줄이기 설정이면 4칸 모두 켠 채로 둠)
function useLitCount(active: boolean) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setStep((value) => (value + 1) % STEPS.length), STEP_MS);
    return () => {
      window.clearInterval(timer);
      setStep(0);
    };
  }, [active]);
  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return 4;
  }
  return STEPS[step];
}

// 지도를 불러오거나 그리는 중일 때 지도 가운데에 띄우는 안내 (지도 화면·동 상세 공용)
export function MapLoading({ show, className }: { show: boolean; className?: string }) {
  const visible = useDelayedFlag(show, SHOW_DELAY_MS);
  const lit = useLitCount(visible);
  if (!visible) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("pointer-events-none absolute inset-0 z-[5] grid place-items-center px-4", className)}
    >
      <div className="flex items-center gap-3.5 rounded-[16px] border border-card-line bg-white px-5 py-3.5 shadow-[0_8px_24px_rgba(26,36,64,0.12)]">
        {/* 픽셀 로고: 꺼진 칸은 지도 빈 동 회색, 시계 방향으로 한 칸씩 불이 들어옴 */}
        <span className="grid shrink-0 grid-cols-2 gap-[2px]" aria-hidden>
          {PIXELS.map((pixel) => (
            <span
              key={pixel.color}
              className="size-[13px] rounded-[2px] transition-colors duration-200"
              style={{ backgroundColor: pixel.order < lit ? pixel.color : EMPTY_FILL }}
            />
          ))}
        </span>
        <span className="text-sm font-bold text-ink">픽셀이 지도를 채우는 중이에요</span>
      </div>
    </div>
  );
}
