import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { isSessionExpired } from "../../hooks/use-expire-session";
import { useLogout } from "../../hooks/use-logout";
import { useAuthStore } from "../../stores/auth-store";
import { useUserStore } from "../../stores/user-store";
import logOutIcon from "../../assets/icons/log-out.svg";
import userIcon from "../../assets/icons/user.svg";
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
          open ? "ring-navy" : "ring-transparent hover:ring-line"
        }`}
      >
        <Avatar image={me?.profileImage} size={36} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 z-50 mt-2 w-[260px] overflow-hidden rounded-[14px] border border-line bg-white pb-1.5 shadow-[0_8px_20px_rgba(22,22,26,0.1)]"
        >
          <div className="flex items-center gap-3 border-b border-divider p-4">
            <Avatar image={me?.profileImage} size={40} />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold text-ink">{nickname}</p>
              <p className="mt-0.5 truncate text-[13px] text-ink-muted">{me?.email}</p>
            </div>
          </div>
          <Link
            to="/mypage"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex h-11 items-center gap-2.5 border-b border-divider px-4 text-sm text-ink hover:bg-field"
          >
            <img src={userIcon} alt="" width={18} height={18} />
            마이페이지
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled={isLoggingOut}
            onClick={logout}
            className="flex h-11 w-full items-center gap-2.5 px-4 text-sm text-[#c2402f] hover:bg-danger-soft disabled:opacity-50"
          >
            <span aria-hidden className="size-[18px] shrink-0 bg-[#c2402f]" style={{ maskImage: `url("${logOutIcon}")`, WebkitMaskImage: `url("${logOutIcon}")`, maskSize: "100% 100%", WebkitMaskSize: "100% 100%" }} />
            {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
          </button>
        </div>
      )}
    </div>
  );
}
