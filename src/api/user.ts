import { request } from "./client";

export type MyInfoResponse = {
  userId: number;
  email: string;
  nickname: string;
  locationAgreed: boolean;
  // 예) "2026-10-01T12:34:56"
  createdAt: string;
  // 내가 올린 사진 전체 수
  photoCount: number;
  // 나의 지도(GET /api/users/me/map)의 filledCellCount와 같은 값
  filledCellCount: number;
};

export type UpdateMyInfoRequest = {
  nickname?: string;
  locationAgreed?: boolean;
};

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

function authHeader(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

export function getMyInfo(accessToken: string) {
  return request<MyInfoResponse>("/api/users/me", {
    headers: authHeader(accessToken),
  });
}

// 아래 세 API는 성공해도 result가 없음(BE ApiResponse<Void>)
export function updateMyInfo(accessToken: string, body: UpdateMyInfoRequest) {
  return request<void>("/api/users/me", {
    method: "PATCH",
    headers: authHeader(accessToken),
    body: JSON.stringify(body),
  });
}

export function changePassword(accessToken: string, body: ChangePasswordRequest) {
  return request<void>("/api/users/me/password", {
    method: "PATCH",
    headers: authHeader(accessToken),
    body: JSON.stringify(body),
  });
}

export function withdraw(accessToken: string, password: string) {
  return request<void>("/api/users/me", {
    method: "DELETE",
    headers: authHeader(accessToken),
    body: JSON.stringify({ password }),
  });
}
