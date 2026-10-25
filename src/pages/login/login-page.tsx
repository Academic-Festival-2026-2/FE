import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { login } from "../../api/auth";
import { ApiError } from "../../api/client";
import { TextField } from "../../components/form/text-field";
import { AuthHeader } from "../../components/layout/auth-header";
import { useAuthStore } from "../../stores/auth-store";

export function LoginPage() {
  const navigate = useNavigate();
  const { signedUp } = useSearch({ from: "/login" });
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

        {signedUp && (
          <p role="status" className="mt-6 rounded-lg bg-[#eef3fa] px-4 py-3 text-sm text-[#3b6fb6]">
            회원가입이 완료되었어요. 가입한 이메일로 로그인해주세요.
          </p>
        )}

        <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <TextField
            id="email"
            label="이메일"
            type="email"
            autoComplete="email"
            placeholder="이메일 주소를 입력해주세요"
            value={email}
            onChange={setEmail}
          />
          <TextField
            id="password"
            label="비밀번호"
            type="password"
            autoComplete="current-password"
            placeholder="비밀번호를 입력해주세요"
            value={password}
            onChange={setPassword}
          />

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
          <Link to="/signup" className="hover:text-gray-900">
            회원가입
          </Link>
          <span className="h-3 w-px bg-gray-300" />
          {/* 비밀번호 찾기 API가 없어 비활성 */}
          <span className="cursor-not-allowed text-gray-300">비밀번호 찾기</span>
        </div>
      </main>
    </div>
  );
}
