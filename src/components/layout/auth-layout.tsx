import type { ReactNode } from "react";
import { cn } from "../../utils/cn";
import { AuthHeader } from "./auth-header";

type AuthLayoutProps = {
  cardClassName?: string;
  children: ReactNode;
};

export function AuthLayout({ cardClassName, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f3f1ec]">
      <AuthHeader />
      <main className="flex justify-center px-4 py-12 sm:py-14">
        <div
          className={cn(
            "w-full max-w-[440px] rounded-3xl border border-[#e6e2da] bg-white px-6 py-10 sm:px-10",
            cardClassName,
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
