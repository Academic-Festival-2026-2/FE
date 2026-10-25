import { createFileRoute } from "@tanstack/react-router";
import { SignUpPage } from "../pages/signup/signup-page";

export const Route = createFileRoute("/signup")({
  component: SignUpPage,
});
