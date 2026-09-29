/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from "@tanstack/react-router";
import { StudyPage } from "../pages/study/study-page";

// eslint-disable-next-line react-refresh/only-export-components
export const Route = createFileRoute("/study")({
  component: StudyPage,
});