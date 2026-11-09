import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function AuthHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="border-b border-[#e3dfd7]">
      <div className="flex h-[66px] items-center justify-between px-5 sm:px-12">
        <Link to="/" className="flex items-center gap-2.5">
          <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
            <rect x="0" y="0" width="14" height="14" fill="#ff8a3d" />
            <rect x="16" y="0" width="14" height="14" fill="#7fb0e0" />
            <rect x="0" y="16" width="14" height="14" fill="#5e6a91" />
            <rect x="16" y="16" width="14" height="14" fill="#c9cbd3" />
          </svg>
          <span className="text-2xl font-extrabold tracking-[-0.5px] text-gray-900">픽셀</span>
        </Link>
        {children}
      </div>
    </header>
  );
}
