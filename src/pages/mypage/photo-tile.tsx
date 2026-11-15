import { useState } from "react";
import { Link } from "@tanstack/react-router";

// 마이페이지 사진 미리보기 한 칸 (내 사진·좋아요한 사진). 누르면 to 화면으로 이동
export function PhotoTile({
  to,
  thumbnailUrl,
  color,
  label,
}: {
  to: "/mypage/photos" | "/mypage/likes";
  thumbnailUrl: string | null;
  // 썸네일이 없거나 받는 중이면 보이는 사진 대표색
  color: string;
  label: string;
}) {
  const [failed, setFailed] = useState(false);
  // 다 받기 전에는 감춰서 받는 중·실패 때 깨진 이미지 아이콘이 보이지 않게 (그동안은 사진 대표색)
  const [loaded, setLoaded] = useState(false);
  return (
    <Link
      to={to}
      aria-label={label}
      className="block aspect-square overflow-hidden rounded-[10px] transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      style={{ backgroundColor: color }}
    >
      {thumbnailUrl && !failed && (
        <img
          src={thumbnailUrl}
          alt=""
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </Link>
  );
}
