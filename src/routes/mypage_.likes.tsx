import { createFileRoute } from "@tanstack/react-router";
import { LikedPhotosPage } from "../pages/mypage/liked-photos-page";
import { requireLogin } from "../utils/auth-guard";

// /mypage/likes 경로이지만 /mypage의 중첩 UI(<Outlet />)에는 의존하지 않는다.
export const Route = createFileRoute("/mypage_/likes")({
  beforeLoad: requireLogin,
  component: LikedPhotosPage,
});
