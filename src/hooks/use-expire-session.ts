import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ApiError, SESSION_CHANGED } from "../api/client";
import { useAuthStore } from "../stores/auth-store";

// 401: 토큰 만료, 탈퇴 회원(BE #62 이후) / USER403_1: BE #62 이전의 탈퇴·비활성 회원
// SESSION_CHANGED: 요청 중에 이미 로그아웃·다른 계정 로그인을 한 것 → 지금 세션을 끊지 않음
export function isSessionExpired(error: unknown) {
  return (
    error instanceof ApiError &&
    error.code !== SESSION_CHANGED &&
    (error.status === 401 || error.code === "USER403_1")
  );
}

export function useExpireSession() {
  const navigate = useNavigate();
  const clearTokens = useAuthStore((state) => state.clearTokens);

  // useEffect 의존성에 넣어도 매번 새로 만들어지지 않도록 useCallback 사용
  return useCallback(() => {
    clearTokens();
    navigate({ to: "/login", search: { expired: true } });
  }, [clearTokens, navigate]);
}
