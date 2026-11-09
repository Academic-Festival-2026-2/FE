import { authRequest, request } from "./client";

export type SignUpRequest = {
  email: string;
  nickname: string;
  password: string;
  termsAgreed: boolean;
  privacyAgreed: boolean;
  locationAgreed: boolean;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type TokenResponse = {
  accessToken: string;
  refreshToken: string;
};

export function signUp(body: SignUpRequest) {
  return request<void>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// access token이 만료됐으면 재발급 후 로그아웃해서 서버의 refresh token까지 지움
export function logout() {
  return authRequest<void>("/api/auth/logout", { method: "POST" });
}

export function login(body: LoginRequest) {
  return request<TokenResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
