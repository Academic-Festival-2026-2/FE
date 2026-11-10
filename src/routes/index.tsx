import { createFileRoute, redirect } from "@tanstack/react-router";
import { currentTimeBand } from "../utils/time-band";

// 홈 화면 없음: 로그인 여부와 상관없이 첫 화면은 지도
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/map", search: { timeBand: currentTimeBand() }, replace: true });
  },
});
