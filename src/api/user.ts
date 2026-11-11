import { authRequest } from "./client";

export type MyInfoResponse = {
  userId: number;
  email: string;
  nickname: string;
  // 예) "CAT_CHEESE"(캐릭터), "COLOR_SKY"(단색). 가입하면 캐릭터 중 랜덤 (BE #116)
  profileImage: string;
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
  // 목록에 없는 값이면 COMMON400
  profileImage?: string;
};

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

// 로그인 필요: 토큰은 authRequest가 스토어에서 꺼내고, 만료되면 재발급
export function getMyInfo() {
  return authRequest<MyInfoResponse>("/api/users/me");
}

// 아래 세 API는 성공해도 result가 없음(BE ApiResponse<Void>)
export function updateMyInfo(body: UpdateMyInfoRequest) {
  return authRequest<void>("/api/users/me", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function changePassword(body: ChangePasswordRequest) {
  return authRequest<void>("/api/users/me/password", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function withdraw(password: string) {
  return authRequest<void>("/api/users/me", {
    method: "DELETE",
    body: JSON.stringify({ password }),
  });
}
