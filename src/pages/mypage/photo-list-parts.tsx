import { useState } from "react";
import { Link } from "@tanstack/react-router";

// 내 사진 모아보기·좋아요 표시한 사진 화면이 같이 쓰는 부품

// 화면 맨 위: 작은 영문 표시 + 마이페이지로 돌아가는 버튼 + 제목 + 설명
export function PhotoListTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <>
      <p className="mt-2 font-mono text-[13px] tracking-[1.04px] text-brand-strong">{eyebrow}</p>
      <div className="mt-3 flex items-center gap-3">
        <Link
          to="/mypage"
          aria-label="마이페이지로 돌아가기"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-ink-sub transition-colors hover:bg-field hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <path
              d="M10 3L5 8l5 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <h1 className="text-[30px] font-extrabold tracking-[-0.9px] text-ink">{title}</h1>
      </div>
      <p className="mt-2 text-base text-ink-sub">{description}</p>
    </>
  );
}

// 목록 카드의 사진. 썸네일이 없거나 못 받으면 사진 대표색 위에 "미리보기 없음"
export function PhotoThumbnail({
  photo,
}: {
  photo: { thumbnailUrl: string | null; name: string; color: string };
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-preview">
      {photo.thumbnailUrl && !failed ? (
        <img
          src={photo.thumbnailUrl}
          alt={`${photo.name}에서 촬영한 사진`}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="grid h-full place-items-center" style={{ backgroundColor: photo.color }}>
          <span className="rounded-lg bg-white/80 px-3 py-1 text-xs font-bold text-ink-sub">
            미리보기 없음
          </span>
        </div>
      )}
    </div>
  );
}
