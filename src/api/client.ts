import { useAuthStore } from "../stores/auth-store";
import type { TokenResponse } from "./auth";

export type ApiResponse<T> = {
  isSuccess: boolean;
  code: string;
  message: string;
  result?: T;
};

export class ApiError extends Error {
  status: number;
  code: string;
  // 검증 실패(COMMON400) 시 { 필드명: 메시지 }
  fieldErrors?: Record<string, string>;

  constructor(status: number, code: string, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

// 검증 실패(COMMON400)의 { 필드명: 메시지 }만 fieldErrors로 사용
// (COMMON500은 result에 "Error Trace ID: ..." 문자열이 들어옴)
function toFieldErrors(body: ApiResponse<unknown> | null): Record<string, string> | undefined {
  const result = body?.result;
  if (body?.code !== "COMMON400" || !result || typeof result !== "object" || Array.isArray(result)) {
    return undefined;
  }
  return result as Record<string, string>;
}

const BASE_URL =import.meta.env.VITE_API_BASE_URL ?? "";

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body instanceof FormData) {
    headers.delete("Content-Type");
  } else if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "서버에 연결할 수 없어요.");
  }

  const body = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !body?.isSuccess) {
    throw new ApiError(
      response.status,
      body?.code ?? "UNKNOWN",
      body?.message ?? "알 수 없는 오류가 발생했어요.",
      toFieldErrors(body),
    );
  }

  return body.result as T;
}

function withAuth(init: RequestInit, accessToken: string): RequestInit {
  return { ...init, headers: { ...init.headers, Authorization: `Bearer ${accessToken}` } };
}

async function reissueAccessToken(): Promise<string> {
  const refreshToken = useAuthStore.getState().tokens?.refreshToken;
  if (!refreshToken) {
    useAuthStore.getState().clearTokens();
    throw new ApiError(401, "COMMON401", "로그인이 만료되었어요. 다시 로그인해 주세요.");
  }

  try {
    const tokens = await request<TokenResponse>("/api/auth/reissue", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
    useAuthStore.getState().updateTokens(tokens);
    return tokens.accessToken;
  } catch (error) {
    // 서버 연결 실패·5xx는 로그아웃시키지 않고 그대로 던짐
    if (!(error instanceof ApiError) || error.status === 0 || error.status >= 500) throw error;
    // USER401_2(잘못된·만료된 refresh), USER403_1(비활성 회원) 등 → 세션 만료
    useAuthStore.getState().clearTokens();
    throw new ApiError(401, error.code, "로그인이 만료되었어요. 다시 로그인해 주세요.");
  }
}

// 여러 요청이 동시에 401을 받아도 재발급은 한 번만 (Rotation이라 두 번 부르면 두 번째가 실패)
let reissuing: Promise<string> | null = null;
function reissueOnce() {
  reissuing ??= reissueAccessToken().finally(() => {
    reissuing = null;
  });
  return reissuing;
}

// 로그인이 필요한 API: access token이 만료(401)되면 재발급 후 한 번만 다시 보냄
// 로그인 API는 실패도 401(USER401_1)이라 request를 그대로 사용
export async function authRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = useAuthStore.getState().tokens?.accessToken;
  if (!accessToken) throw new ApiError(401, "COMMON401", "로그인이 필요해요.");

  try {
    return await request<T>(path, withAuth(init, accessToken));
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    // 그사이 다른 요청이 이미 재발급했으면 그 토큰으로 바로 재시도
    const latest = useAuthStore.getState().tokens?.accessToken;
    const newToken = latest && latest !== accessToken ? latest : await reissueOnce();
    return request<T>(path, withAuth(init, newToken));
  }
}
