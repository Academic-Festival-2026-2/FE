import { redirect } from "@tanstack/react-router";
import { useAuthStore } from "../stores/auth-store";

// 로그인이 필요한 화면의 beforeLoad. 로그인하지 않았으면 로그인 화면으로 보냄
export function requireLogin() {
  if (!useAuthStore.getState().tokens) throw redirect({ to: "/login" });
}
