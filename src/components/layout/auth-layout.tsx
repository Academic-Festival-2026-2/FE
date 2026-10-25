import type { ReactNode } from "react";
import { cn } from "../../utils/cn";
import { AuthHeader } from "./auth-header";

type AuthLayoutProps = {
  headerLink: { to: "/login" | "/signup"; label: string };
  cardClassName?: string;
  children: ReactNode;
};

export function AuthLayout({ headerLink, cardClassName, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f7f5f0]">
      <AuthHeader link={headerLink} />
      <main className="flex justify-center px-4 py-12 sm:py-16">
        <div
          className={cn(
            "w-full max-w-[440px] rounded-3xl border border-[#e8e4dc] bg-white px-6 py-10 sm:px-10",
            cardClassName,
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
