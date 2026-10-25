import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "../pages/login/login-page";

type LoginSearch = {
  // 회원가입 직후 이동했을 때 완료 안내를 띄움
  signedUp?: boolean;
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    signedUp: search.signedUp === true ? true : undefined,
  }),
  component: LoginPage,
});
