/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from "@tanstack/react-router";
import { MyInfoPage } from "../pages/my-info/my-info-page";

// eslint-disable-next-line react-refresh/only-export-components
export const Route = createFileRoute("/my-info")({
  component: MyInfoPage,
});