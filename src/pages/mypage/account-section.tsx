import { useState } from "react";
import { useLogout } from "../../hooks/use-logout";
import { WithdrawDialog } from "./withdraw-dialog";

export function AccountSection() {
  const { logout, isLoggingOut } = useLogout();
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  return (
    <section className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-3xl border border-[#e8e4dc] bg-white px-6 py-4">
      <h2 className="text-[15px] font-bold text-gray-900">계정</h2>
      <p className="flex-1 text-xs text-gray-500">
        로그아웃해도 올린 사진과 나의 지도는 그대로 남아요.
      </p>
      <button
        type="button"
        onClick={() => setIsWithdrawOpen(true)}
        className="text-[13px] text-gray-500 transition-colors hover:text-gray-900"
      >
        회원 탈퇴
      </button>
      <button
        type="button"
        onClick={logout}
        disabled={isLoggingOut}
        className="h-10 rounded-[10px] border border-[#ddd8ce] bg-white px-4 text-sm font-bold text-[#c4581a] transition-colors hover:bg-[#f7f5f0] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
      </button>
      <WithdrawDialog open={isWithdrawOpen} onClose={() => setIsWithdrawOpen(false)} />
    </section>
  );
}
