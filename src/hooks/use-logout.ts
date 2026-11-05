import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { logout as logoutApi } from "../api/auth";
import { useAuthStore } from "../stores/auth-store";

export function useLogout() {
  const navigate = useNavigate();
  const accessToken = useAuthStore((state) => state.tokens?.accessToken);
  const clearTokens = useAuthStore((state) => state.clearTokens);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function logout() {
    setIsLoggingOut(true);
    try {
      if (accessToken) await logoutApi(accessToken);
    } catch {
      // 토큰이 만료돼 서버 로그아웃이 실패해도 이 기기에서는 로그아웃 처리
    } finally {
      clearTokens();
      navigate({ to: "/login" });
    }
  }

  return { logout, isLoggingOut };
}
