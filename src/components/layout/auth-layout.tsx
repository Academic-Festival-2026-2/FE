import type { ReactNode } from "react";
import { cn } from "../../utils/cn";
import { AuthHeader } from "./auth-header";

type AuthLayoutProps = {
  cardClassName?: string;
  children: ReactNode;
};

export function AuthLayout({ cardClassName, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-page">
      <AuthHeader />
      <main className="flex justify-center px-4 pt-4 pb-6 sm:px-5 sm:pt-14">
        <div
          className={cn(
            "w-full max-w-[440px] rounded-3xl border border-card-line bg-white px-6 py-10 sm:px-10",
            cardClassName,
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
