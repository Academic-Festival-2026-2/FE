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

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
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
      body?.result as Record<string, string> | undefined,
    );
  }

  return body.result as T;
}
