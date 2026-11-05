import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "../pages/login/login-page";

type LoginSearch = {
  // 회원가입 직후 이동했을 때 완료 안내를 띄움
  signedUp?: boolean;
  // 비밀번호 변경 후 이동했을 때 다시 로그인 안내를 띄움
  passwordChanged?: boolean;
  // 회원 탈퇴 후 이동했을 때 완료 안내를 띄움
  withdrawn?: boolean;
  // 토큰 만료·탈퇴 회원 등으로 로그인이 풀려 이동했을 때 안내를 띄움
  expired?: boolean;
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    signedUp: search.signedUp === true ? true : undefined,
    passwordChanged: search.passwordChanged === true ? true : undefined,
    withdrawn: search.withdrawn === true ? true : undefined,
    expired: search.expired === true ? true : undefined,
  }),
  component: LoginPage,
});
