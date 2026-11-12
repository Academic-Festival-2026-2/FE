import { createFileRoute, redirect } from "@tanstack/react-router";
import { useAuthStore } from "../stores/auth-store";
import { currentTimeBand } from "../utils/time-band";

// 홈 화면 없음: 로그인하지 않았으면 로그인 화면, 로그인했으면 지도가 첫 화면
// /map은 로그인 없이도 열리므로(로그인 화면의 지도 링크·공유받은 링크) 여기서만 나눔
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (!useAuthStore.getState().tokens) throw redirect({ to: "/login", replace: true });
    throw redirect({ to: "/map", search: { timeBand: currentTimeBand() }, replace: true });
  },
});
