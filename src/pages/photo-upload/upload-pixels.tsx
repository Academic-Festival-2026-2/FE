import { useEffect, useState } from "react";
import { BAND_PIXEL, EMPTY_FILL } from "../map/map-data";

// 바깥 8칸이 시계 방향으로 차오르는 순서 (3×3 칸 번호, 가운데 4번은 내 사진 자리)
const FILL_ORDER = [0, 1, 2, 5, 8, 7, 6, 3];
// 차오르는 순서대로 로고 4색(새벽·낮·노을·밤)을 두 번 돌려 씀
const FILL_COLORS = [
  BAND_PIXEL.DAWN,
  BAND_PIXEL.DAY,
  BAND_PIXEL.SUNSET,
  BAND_PIXEL.NIGHT,
  BAND_PIXEL.DAWN,
  BAND_PIXEL.DAY,
  BAND_PIXEL.SUNSET,
  BAND_PIXEL.NIGHT,
];
// 한 칸씩 차오르는 간격, 다 찬 뒤 보여 주는 시간, 비운 뒤 다시 시작까지 (로딩 픽셀보다 느긋하게)
const STEP_MS = 550;
const HOLD_STEPS = 3;
const REST_STEPS = 2;
const CYCLE = FILL_ORDER.length + HOLD_STEPS + REST_STEPS;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// 지금 차 있는 칸 수 (0~8). 다 차면 잠깐 유지 → 비우고 → 다시 시작
function useFilledCount(full: boolean) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (full || prefersReducedMotion()) return;
    const timer = window.setInterval(() => setStep((value) => (value + 1) % CYCLE), STEP_MS);
    return () => window.clearInterval(timer);
  }, [full]);
  // 사진을 끌어다 놓는 중이거나 "동작 줄이기"면 다 찬 모습으로 멈춤
  if (full || prefersReducedMotion()) return FILL_ORDER.length;
  // 0~8: 한 칸씩 차오름 → 다 찬 채 HOLD_STEPS 동안 유지 → REST_STEPS 동안 비움
  if (step <= FILL_ORDER.length) return step;
  if (step <= FILL_ORDER.length + HOLD_STEPS) return FILL_ORDER.length;
  return 0;
}

// 업로드 첫 화면 그림: 지도 조각 3×3. 바깥 칸이 로딩 픽셀처럼 하나씩 칠해지고 가운데는 내 사진 자리
export function UploadPixels({ dragging }: { dragging: boolean }) {
  const filled = useFilledCount(dragging);

  return (
    <div className="grid grid-cols-3 gap-[5px]" aria-hidden>
      {Array.from({ length: 9 }, (_, cell) => {
        if (cell === 4) {
          return (
            <span
              key={cell}
              className={`grid size-8 place-items-center rounded-[5px] border-2 border-dashed border-brand text-base leading-none font-bold text-brand transition-colors duration-300 ${dragging ? "bg-white" : "bg-brand-soft"}`}
            >
              +
            </span>
          );
        }
        const order = FILL_ORDER.indexOf(cell);
        const on = order < filled;
        return (
          <span
            key={cell}
            className="size-8 rounded-[5px] transition-colors duration-500 ease-out"
            style={{ backgroundColor: on ? FILL_COLORS[order] : EMPTY_FILL }}
          />
        );
      })}
    </div>
  );
}
