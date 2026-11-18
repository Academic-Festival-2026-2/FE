import { createFileRoute } from "@tanstack/react-router";
import { MyPage } from "../pages/mypage/mypage-page";
import { requireLogin } from "../utils/auth-guard";

export const Route = createFileRoute("/mypage")({
  // 로그인하지 않았으면 로그인 화면으로 보냄
  beforeLoad: requireLogin,
  component: MyPage,
});
