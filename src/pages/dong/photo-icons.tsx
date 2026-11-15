// 사진 카드·크게 보기(라이트박스)가 같이 쓰는 아이콘

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

export function CloseIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden>
      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
