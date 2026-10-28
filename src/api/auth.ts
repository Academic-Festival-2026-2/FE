import { request } from "./client";

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

export function logout(accessToken: string) {
  return request<void>("/api/auth/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function login(body: LoginRequest) {
  return request<TokenResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
