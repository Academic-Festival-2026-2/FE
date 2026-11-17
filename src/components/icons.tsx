// 여러 화면이 같이 쓰는 아이콘 (사진 카드·크게 보기·팝업 닫기 등)

export function Chevron({ left, size = 14 }: { left?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden>
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

// 좋아요 하트. filled면 속을 채움
export function HeartIcon({ filled, size = 16 }: { filled?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <path
        d="M8 13.6S1.8 9.9 1.8 5.7A3.2 3.2 0 0 1 8 4.4a3.2 3.2 0 0 1 6.2 1.3c0 4.2-6.2 7.9-6.2 7.9Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 닫기 X. 사진 위 둥근 버튼은 굵게(2), 팝업 오른쪽 위 네모 버튼은 가늘게(1.6)
export function CloseIcon({ size = 11, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden>
      <path
        d="M2 2l10 10M12 2L2 12"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}

// 동그라미 안 i (설명 보기)
export function InfoIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden>
      <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 6.2v3.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="7" cy="4.2" r="0.85" fill="currentColor" />
    </svg>
  );
}

// SVG 파일 모양에 배경색(className의 bg-*)을 칠한 아이콘. 파일 색과 상관없이 원하는 색으로 쓸 때
export function MaskIcon({ src, className }: { src: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        maskImage: `url("${src}")`,
        WebkitMaskImage: `url("${src}")`,
        maskSize: "100% 100%",
        WebkitMaskSize: "100% 100%",
      }}
    />
  );
}
