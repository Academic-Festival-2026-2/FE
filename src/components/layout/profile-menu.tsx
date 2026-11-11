import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { isSessionExpired } from "../../hooks/use-expire-session";
import { useLogout } from "../../hooks/use-logout";
import { useAuthStore } from "../../stores/auth-store";
import { useUserStore } from "../../stores/user-store";
import { Avatar } from "../avatar";

// 헤더 오른쪽 위 프로필 버튼 + 드롭다운 (로그인 상태에서만 사용)
export function ProfileMenu() {
  const me = useUserStore((state) => state.me);
  const loadMe = useUserStore((state) => state.loadMe);
  const clearTokens = useAuthStore((state) => state.clearTokens);
  const { logout, isLoggingOut } = useLogout();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMe().catch((error: unknown) => {
      // 헤더는 화면을 옮기지 않고 토큰만 지움 → 공개 지도는 그대로 보이고 헤더만 비로그인으로 바뀜
      // 로그인이 꼭 필요한 화면은 각자 처리. 그 외 실패는 빈 원으로 표시
      if (isSessionExpired(error)) clearTokens();
    });
  }, [loadMe, clearTokens]);

  // 바깥 클릭·Esc로 닫기
  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const nickname = me?.nickname ?? "";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="내 정보 메뉴"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`block rounded-full p-0.5 ring-2 ${
          open ? "ring-[#ff8a3d]" : "ring-transparent hover:ring-[#e3dfd7]"
        }`}
      >
        <Avatar image={me?.profileImage} nickname={nickname} size={36} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-[#e8e4dc] bg-white shadow-lg"
        >
          <div className="flex items-center gap-3 px-4 py-4">
            <Avatar image={me?.profileImage} nickname={nickname} size={40} />
            <div className="min-w-0">
              <p className="truncate font-bold text-gray-900">{nickname}</p>
              <p className="truncate text-sm text-gray-500">{me?.email}</p>
            </div>
          </div>
          <Link
            to="/mypage"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 border-t border-[#eeebe5] px-4 py-3 text-sm text-gray-900 hover:bg-[#f7f5f0]"
          >
            {/* 사람 아이콘 */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
            </svg>
            마이페이지
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled={isLoggingOut}
            onClick={logout}
            className="flex w-full items-center gap-2.5 border-t border-[#eeebe5] px-4 py-3 text-sm text-[#c4581a] hover:bg-[#fdf3ec] disabled:opacity-50"
          >
            {/* 나가기 아이콘 */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
          </button>
        </div>
      )}
    </div>
  );
}
