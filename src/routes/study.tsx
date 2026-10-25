 
import { createFileRoute } from "@tanstack/react-router";
import { StudyPage } from "../pages/study/study-page";

 
export const Route = createFileRoute("/study")({
  component: StudyPage,
});