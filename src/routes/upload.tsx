import { createFileRoute, redirect } from "@tanstack/react-router";
import { useAuthStore } from "../stores/auth-store";
import { PhotoUploadPage } from "../pages/photo-upload/photo-upload-page";

export const Route = createFileRoute("/upload")({
  beforeLoad: () => {
    if (!useAuthStore.getState().tokens) throw redirect({ to: "/login" });
  },
  component: PhotoUploadPage,
});
