import { createFileRoute, redirect } from "@tanstack/react-router";
import { MyPhotosPage } from "../pages/mypage/my-photos-page";
import { useAuthStore } from "../stores/auth-store";

// /mypage/photos 경로이지만 /mypage의 중첩 UI(<Outlet />)에는 의존하지 않는다.
export const Route = createFileRoute("/mypage_/photos")({
  beforeLoad: () => {
    if (!useAuthStore.getState().tokens) throw redirect({ to: "/login" });
  },
  component: MyPhotosPage,
});
