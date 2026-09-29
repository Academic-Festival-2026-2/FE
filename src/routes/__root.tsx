import { createRootRoute } from "@tanstack/react-router";
import { AppShell } from "../components/layout/app-shell";

export const Route = createRootRoute({
  component: AppShell,
  notFoundComponent: () => <main className="mx-auto max-w-5xl px-6 py-24"><h1 className="font-[family-name:var(--font-display)] text-4xl font-bold">Page not found</h1></main>,
});
