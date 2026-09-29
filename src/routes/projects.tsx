import { createFileRoute } from "@tanstack/react-router";
import { ProjectsPage } from "../pages/projects/projects-page";

export const Route = createFileRoute("/projects")({
  component: ProjectsPage,
});
