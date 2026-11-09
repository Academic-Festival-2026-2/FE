import { createFileRoute, redirect } from "@tanstack/react-router";
import { HomePage } from "../pages/home/home-page";
import { useAuthStore } from "../stores/auth-store";

export const Route = createFileRoute("/")({
  // 로그인하지 않았으면 로그인 화면으로 보냄
  beforeLoad: () => {
    if (!useAuthStore.getState().tokens) throw redirect({ to: "/login" });
  },
  component: HomePage,
});
