import { createFileRoute } from "@tanstack/react-router";
import { requireLogin } from "../utils/auth-guard";
import { PhotoUploadPage } from "../pages/photo-upload/photo-upload-page";

export const Route = createFileRoute("/upload")({
  beforeLoad: requireLogin,
  component: PhotoUploadPage,
});
