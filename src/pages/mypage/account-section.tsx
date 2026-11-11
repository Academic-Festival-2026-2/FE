import { useState } from "react";
import { useLogout } from "../../hooks/use-logout";
import { WithdrawDialog } from "./withdraw-dialog";

export function AccountSection() {
  const { logout, isLoggingOut } = useLogout();
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  return (
    <section className="flex flex-wrap items-center gap-x-[18px] gap-y-3 rounded-2xl border border-card-line bg-white px-6 py-4">
      <h2 className="flex-1 text-[15px] leading-[23px] font-bold text-ink">계정</h2>
      <button
        type="button"
        onClick={() => setIsWithdrawOpen(true)}
        className="mr-1.5 text-[13px] text-ink-muted transition-colors hover:text-ink"
      >
        회원 탈퇴
      </button>
      <button
        type="button"
        onClick={logout}
        disabled={isLoggingOut}
        className="h-10 rounded-[10px] border border-card-line bg-white px-4 text-sm font-bold text-[#c2402f] transition-colors hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
      </button>
      <WithdrawDialog open={isWithdrawOpen} onClose={() => setIsWithdrawOpen(false)} />
    </section>
  );
}
