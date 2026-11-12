import { Link } from "@tanstack/react-router";

// 헤더 오른쪽 "사진 업로드" 버튼 (지도 화면·마이페이지 공용)
export function UploadButton() {
  return (
    <Link
      to="/upload"
      className="flex h-10 items-center rounded-[10px] bg-brand px-4 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
    >
      사진 업로드
    </Link>
  );
}
