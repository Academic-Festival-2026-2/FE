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

// 재발급 결과는 재발급을 시작한 세션이 그대로일 때만 저장소에 반영
// (응답을 기다리는 사이 로그아웃·다른 계정 로그인을 했으면 이전 토큰을 되살리거나 새 세션을 끊지 않음)
async function reissueAccessToken(): Promise<string> {
  const { tokens: current, session } = useAuthStore.getState();
  const refreshToken = current?.refreshToken;
  if (!refreshToken) {
    useAuthStore.getState().clearTokens();
    throw new ApiError(401, "COMMON401", "로그인이 만료되었어요. 다시 로그인해 주세요.");
  }

  try {
    const tokens = await request<TokenResponse>("/api/auth/reissue", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
    if (useAuthStore.getState().session === session) useAuthStore.getState().updateTokens(tokens);
    return tokens.accessToken;
  } catch (error) {
    // 서버 연결 실패·5xx는 로그아웃시키지 않고 그대로 던짐
    if (!(error instanceof ApiError) || error.status === 0 || error.status >= 500) throw error;
    // USER401_2(잘못된·만료된 refresh), USER403_1(비활성 회원) 등 → 세션 만료
    if (useAuthStore.getState().session === session) useAuthStore.getState().clearTokens();
    throw new ApiError(401, error.code, "로그인이 만료되었어요. 다시 로그인해 주세요.");
  }
}

// 여러 요청이 동시에 401을 받아도 재발급은 한 번만 (Rotation이라 두 번 부르면 두 번째가 실패)
// 진행 중인 재발급은 세션별로 기억 → 다른 계정으로 로그인한 뒤의 요청이 이전 세션의 재발급 결과를 받지 않음
let reissuing: { session: number; promise: Promise<string> } | null = null;
function reissueOnce() {
  const session = useAuthStore.getState().session;
  if (reissuing?.session !== session) {
    const promise = reissueAccessToken().finally(() => {
      if (reissuing?.promise === promise) reissuing = null;
    });
    reissuing = { session, promise };
  }
  return reissuing.promise;
}

// 로그인이 필요한 API: access token이 만료(401)되면 재발급 후 한 번만 다시 보냄
// 로그인 API는 실패도 401(USER401_1)이라 request를 그대로 사용
// 기다리는 사이 로그아웃·다른 계정 로그인을 했으면 다시 보내지 않음
// (이전 계정 토큰으로 좋아요 등을 보내거나, 새 계정이 누르지 않은 요청을 새 계정으로 보내지 않게)
// 이때 오류 코드는 SESSION_CHANGED → 세션 만료로 보지 않음 (새로 로그인한 계정을 로그아웃시키지 않게)
export const SESSION_CHANGED = "SESSION_CHANGED";
export async function authRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { tokens, session } = useAuthStore.getState();
  const accessToken = tokens?.accessToken;
  if (!accessToken) throw new ApiError(401, "COMMON401", "로그인이 필요해요.");
  const assertSameSession = () => {
    if (useAuthStore.getState().session !== session) {
      throw new ApiError(401, SESSION_CHANGED, "로그인 상태가 바뀌어 요청을 보내지 않았어요.");
    }
  };

  try {
    return await request<T>(path, withAuth(init, accessToken));
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    assertSameSession();
    // 그사이 다른 요청이 이미 재발급했으면 그 토큰으로 바로 재시도
    const latest = useAuthStore.getState().tokens?.accessToken;
    const newToken = latest && latest !== accessToken ? latest : await reissueOnce();
    assertSameSession();
    return request<T>(path, withAuth(init, newToken));
  }
}

// 만료 직전 토큰도 미리 재발급 (보내는 사이 만료되거나 기기 시계가 조금 어긋나도 안전하게)
const EXPIRY_MARGIN_MS = 30_000;

// access token(JWT)의 만료 시각(ms). 읽을 수 없으면 null
function tokenExpiresAt(token: string): number | null {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const exp = (JSON.parse(atob(payload)) as { exp?: unknown }).exp;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

// 로그인 없이도 되는 API: 로그인했으면 토큰을 붙여 보냄 (사진 상세의 내 좋아요 여부 등)
// 공개 API는 BE가 만료된 토큰을 401 없이 비로그인으로 처리함 → 401을 기다리지 않고
// 보내기 전에 만료를 확인해 미리 재발급 (안 하면 이미 누른 사진도 빈 하트로 보임)
// 세션이 끝나 재발급까지 실패하면(401) 토큰 없이 보냄 → 비로그인과 같은 결과
export async function optionalAuthRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = useAuthStore.getState().tokens?.accessToken;
  if (!accessToken) return request<T>(path, init);
  try {
    const expiresAt = tokenExpiresAt(accessToken);
    if (expiresAt !== null && expiresAt - EXPIRY_MARGIN_MS <= Date.now()) await reissueOnce();
    return await authRequest<T>(path, init);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    return request<T>(path, init);
  }
}
