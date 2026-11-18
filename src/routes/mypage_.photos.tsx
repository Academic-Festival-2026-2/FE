import { createFileRoute } from "@tanstack/react-router";
import { MyPhotosPage } from "../pages/mypage/my-photos-page";
import { requireLogin } from "../utils/auth-guard";

// /mypage/photos 경로이지만 /mypage의 중첩 UI(<Outlet />)에는 의존하지 않는다.
export const Route = createFileRoute("/mypage_/photos")({
  beforeLoad: requireLogin,
  component: MyPhotosPage,
});
