import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { login } from "../../api/auth";
import { ApiError } from "../../api/client";
import { AuthHeader } from "../../components/layout/auth-header";
import { useAuthStore } from "../../stores/auth-store";

const inputClass =
  "h-12 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#3b6fb6] focus:bg-white";

export function LoginPage() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((state) => state.setTokens);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = email.trim() !== "" && password !== "" && !isSubmitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const tokens = await login({ email: email.trim(), password });
      setTokens(tokens, remember);
      navigate({ to: "/" });
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "로그인 중 오류가 발생했어요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-white">
      <AuthHeader />
      <main className="px-5 pt-8">
        <h1 className="text-2xl font-bold text-gray-900">로그인</h1>
        <p className="mt-2 text-sm text-gray-500">플랩스터디에서 더 많은 기능을 만나보세요.</p>

        <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              이메일
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="이메일 주소를 입력해주세요"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="비밀번호를 입력해주세요"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
            />
          </div>

          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="h-4 w-4 accent-[#3b6fb6]"
            />
            로그인 상태 유지
          </label>

          {errorMessage && (
            <p role="alert" className="text-sm text-red-500">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-2 h-12 w-full rounded-lg bg-[#3b6fb6] text-sm font-semibold text-white transition-colors hover:bg-[#335f9e] disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isSubmitting ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-3 text-sm text-gray-500">
          {/* TODO: 회원가입 라우트를 만들면 <Link to="/signup">으로 교체 */}
          <a href="/signup" className="hover:text-gray-900">
            회원가입
          </a>
          <span className="h-3 w-px bg-gray-300" />
          {/* 비밀번호 찾기 API가 없어 비활성 */}
          <span className="cursor-not-allowed text-gray-300">비밀번호 찾기</span>
        </div>
      </main>
    </div>
  );
}
