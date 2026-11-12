import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { currentTimeBand } from "../../utils/time-band";
import { LogoMark } from "./logo-mark";

export function AuthHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="border-b border-line">
      <div className="flex h-[66px] items-center justify-between px-5 sm:px-12">
        <Link to="/map" search={{ timeBand: currentTimeBand() }} className="flex items-center gap-2.5">
          <LogoMark />
          <span className="text-2xl font-black tracking-[-0.5px] text-ink">픽셀</span>
        </Link>
        {children}
      </div>
    </header>
  );
}
