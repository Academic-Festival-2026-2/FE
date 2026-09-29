import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useAppStore } from "../../stores/app-store";
import { cn } from "../../utils/cn";

const navigation = [
  { to: "/", label: "홈", englishLabel: "Home" },
  { to: "/study", label: "스터디", englishLabel: "Study" },
  { to: "/my-info", label: "내 정보", englishLabel: "My Info" },
] as const;

export function AppShell() {
  const closeNav = useAppStore((state) => state.closeNav);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className="min-h-screen bg-[#f5f2ec] pb-24 text-[#25231f]">
      <header className="flex h-20 items-center border-b border-[#dcd7ce] px-6 lg:px-12">
        <Link to="/" className="font-[family-name:var(--font-display)] text-lg font-bold tracking-[-0.04em]">
          ACADEMIC / 26
        </Link>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex h-20 max-w-2xl items-center justify-around border-t border-[#dcd7ce] bg-[#f5f2ec]/95 px-5 backdrop-blur" aria-label="하단 메뉴">
        {navigation.map((item) => (
          <Link key={item.to} to={item.to} onClick={closeNav} className={cn("flex min-w-20 flex-col items-center gap-1 text-[#938b80] transition-colors", pathname === item.to && "font-semibold text-[#9a7251]")}>
            <span className="text-[10px] uppercase tracking-[0.12em]">{item.englishLabel}</span>
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
