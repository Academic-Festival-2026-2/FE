import { createFileRoute, redirect } from "@tanstack/react-router";
import { MyPage } from "../pages/mypage/mypage-page";
import { useAuthStore } from "../stores/auth-store";

export const Route = createFileRoute("/mypage")({
  // 로그인하지 않았으면 로그인 화면으로 보냄
  beforeLoad: () => {
    if (!useAuthStore.getState().tokens) throw redirect({ to: "/login" });
  },
  component: MyPage,
});
