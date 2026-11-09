import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { logout as logoutApi } from "../api/auth";
import { useAuthStore } from "../stores/auth-store";

export function useLogout() {
  const navigate = useNavigate();
  const clearTokens = useAuthStore((state) => state.clearTokens);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function logout() {
    setIsLoggingOut(true);
    try {
      await logoutApi();
    } catch {
      // 재발급까지 실패해 서버 로그아웃이 안 돼도 이 기기에서는 로그아웃 처리
    } finally {
      clearTokens();
      navigate({ to: "/login" });
    }
  }

  return { logout, isLoggingOut };
}
