import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { logout } from "../../api/auth";
import { AuthLayout } from "../../components/layout/auth-layout";
import { useAuthStore } from "../../stores/auth-store";

export function HomePage() {
  const navigate = useNavigate();
  const tokens = useAuthStore((state) => state.tokens);
  const clearTokens = useAuthStore((state) => state.clearTokens);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      if (tokens) await logout(tokens.accessToken);
    } catch {
      // 토큰이 만료돼 서버 로그아웃이 실패해도 이 기기에서는 로그아웃 처리
    } finally {
      clearTokens();
      navigate({ to: "/login" });
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-3xl font-extrabold text-gray-900">로그인되었어요</h1>
      <p className="mt-3 text-gray-600">픽셀의 다른 기능은 준비 중이에요.</p>
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="mt-8 h-12 w-full rounded-xl border border-[#ddd8ce] bg-white text-gray-900 transition-colors hover:bg-[#f7f5f0] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
      </button>
    </AuthLayout>
  );
}
