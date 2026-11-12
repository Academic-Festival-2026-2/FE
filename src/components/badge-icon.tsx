import type { ReactNode } from "react";
import type { BadgeType } from "../api/badge";
import { cn } from "../utils/cn";

const INK = "#3a3631";
const line = {
  stroke: INK,
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// 반짝이 (네 갈래 별)
function Sparkle({ x, y, r = 3 }: { x: number; y: number; r?: number }) {
  return (
    <path
      d={`M${x} ${y - r}V${y + r}M${x - r} ${y}H${x + r}`}
      stroke={INK}
      strokeWidth={1.6}
      strokeLinecap="round"
    />
  );
}

// 배지 그림: 64×64 선 그림. 색은 지도 시간대 색과 브랜드 주황을 씀
const GLYPHS: Record<BadgeType, ReactNode> = {
  // 사진 한 장 안의 주황 픽셀 하나
  FIRST_PHOTO: (
    <>
      <rect x="17" y="15" width="30" height="34" rx="4" fill="white" {...line} />
      <rect x="23" y="21" width="18" height="18" rx="2" fill="#ff8a3d" {...line} />
      <path d="M23 44h18" {...line} />
      <Sparkle x={50} y={13} />
      <Sparkle x={13} y={46} r={2.5} />
    </>
  ),
  // 언덕 위에 꽂은 깃발
  DONG_FIRST: (
    <>
      <path d="M10 50c6-7 14-10 22-10s16 3 22 10z" fill="#cfe8cf" {...line} />
      <path d="M30 41V13" {...line} />
      <path d="M30 14l16 5-16 6z" fill="#ff8a3d" {...line} />
      <Sparkle x={48} y={31} />
      <Sparkle x={16} y={22} r={2.5} />
    </>
  ),
  // 리본 달린 10 메달
  DONG_TOP10: (
    <>
      <path d="M24 10l-4 16 8-3 4 7 2-18z" fill="#a9c8f0" {...line} />
      <path d="M40 10l4 16-8-3-4 7-2-18z" fill="#f5b5c4" {...line} />
      <circle cx="32" cy="38" r="14" fill="#ffd36e" {...line} />
      <text x="32" y="43" textAnchor="middle" fontSize="13" fontWeight="800" fill={INK}>
        10
      </text>
    </>
  ),
  // 점선으로 이은 동 다섯 칸
  DONG_FIVE: (
    <>
      <path d="M14 46l10-12 10 8 9-14 8-10" stroke={INK} strokeWidth={1.6} strokeDasharray="2 3" />
      <rect x="9" y="41" width="10" height="10" rx="2" fill="#ffb37a" {...line} />
      <rect x="19" y="29" width="10" height="10" rx="2" fill="#ffd36e" {...line} />
      <rect x="29" y="37" width="10" height="10" rx="2" fill="#cfe8cf" {...line} />
      <rect x="38" y="23" width="10" height="10" rx="2" fill="#a9c8f0" {...line} />
      <rect x="46" y="13" width="10" height="10" rx="2" fill="#c9b6ec" {...line} />
    </>
  ),
  // 새벽·낮·노을·밤 네 조각 해
  ALL_TIME_BANDS: (
    <>
      <path d="M32 32V14a18 18 0 0 1 18 18z" fill="#f5b5c4" />
      <path d="M32 32h18a18 18 0 0 1-18 18z" fill="#ffd36e" />
      <path d="M32 32v18a18 18 0 0 1-18-18z" fill="#ff8a3d" />
      <path d="M32 32H14a18 18 0 0 1 18-18z" fill="#4b5a8c" />
      <circle cx="32" cy="32" r="18" fill="none" {...line} />
      <path d="M32 14v36M14 32h36" {...line} />
      <Sparkle x={53} y={12} />
    </>
  ),
  // 겹쳐 쌓은 사진 위의 10
  PHOTO_TEN: (
    <>
      <rect x="20" y="12" width="28" height="32" rx="4" fill="#f2efe8" {...line} transform="rotate(8 34 28)" />
      <rect x="16" y="16" width="28" height="32" rx="4" fill="white" {...line} />
      <rect x="21" y="21" width="18" height="14" rx="2" fill="#a9c8f0" {...line} />
      <circle cx="44" cy="46" r="9" fill="#ff8a3d" {...line} />
      <text x="44" y="50" textAnchor="middle" fontSize="10" fontWeight="800" fill="white">
        10
      </text>
    </>
  ),
};

type BadgeIconProps = {
  type: BadgeType;
  earned?: boolean;
  size?: number;
};

// 받은 배지는 은은한 원 배경과 함께, 못 받은 배지는 흐리게 + 자물쇠
export function BadgeIcon({ type, earned = true, size = 72 }: BadgeIconProps) {
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full",
        earned ? "bg-[#fff1e5]" : "bg-[#f2f0eb]",
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        viewBox="0 0 64 64"
        width={size * 0.82}
        height={size * 0.82}
        fill="none"
        className={cn(!earned && "opacity-35 grayscale")}
      >
        {GLYPHS[type]}
      </svg>
      {!earned && (
        <span className="absolute right-0 bottom-0 grid h-6 w-6 place-items-center rounded-full border border-[#e2ded5] bg-white">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8a857c" strokeWidth="2.4" strokeLinecap="round">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        </span>
      )}
    </span>
  );
}
