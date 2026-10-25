import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { login } from "../../api/auth";
import { ApiError } from "../../api/client";
import { TextField } from "../../components/form/text-field";
import { AuthLayout } from "../../components/layout/auth-layout";
import { useAuthStore } from "../../stores/auth-store";

export function LoginPage() {
  const navigate = useNavigate();
  const { signedUp } = useSearch({ from: "/login" });
  const setTokens = useAuthStore((state) => state.setTokens);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = email.trim() !== "" && password !== "" && !isSubmitting;

  // 아직 BE API가 없는 기능
  function showNotReady(feature: string) {
    setNotice(`${feature} 기능은 준비 중이에요.`);
  }

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
    <AuthLayout headerLink={{ to: "/signup", label: "회원가입" }}>
      <h1 className="text-3xl font-extrabold text-gray-900">로그인</h1>
      <p className="mt-3 text-gray-600">사진을 올리고 내 기록을 보려면 로그인해 주세요.</p>

      {signedUp && (
        <p role="status" className="mt-6 rounded-xl bg-[#fff1e6] px-4 py-3 text-sm text-[#b9541a]">
          회원가입이 완료되었어요. 가입한 이메일로 로그인해 주세요.
        </p>
      )}

      <form className="mt-6 flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
        <TextField
          id="email"
          label="이메일"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          value={email}
          onChange={setEmail}
        />
        <TextField
          id="password"
          label="비밀번호"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
        />

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="h-5 w-5 accent-[#ff8a3d]"
            />
            로그인 유지
          </label>
          <button
            type="button"
            onClick={() => showNotReady("비밀번호 찾기")}
            className="text-sm text-gray-600 underline underline-offset-4 hover:text-gray-900"
          >
            비밀번호 찾기
          </button>
        </div>

        {errorMessage && (
          <p role="alert" className="text-sm text-red-500">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="h-12 w-full rounded-xl bg-[#ff8a3d] font-bold text-gray-900 transition-colors hover:bg-[#f57a2a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-4 text-xs text-gray-500">
        <span className="h-px flex-1 bg-[#e8e4dc]" />
        또는
        <span className="h-px flex-1 bg-[#e8e4dc]" />
      </div>

      <button
        type="button"
        onClick={() => showNotReady("카카오 로그인")}
        className="h-12 w-full rounded-xl border border-[#ddd8ce] bg-white text-gray-900 transition-colors hover:bg-[#f7f5f0]"
      >
        카카오로 계속하기
      </button>

      {notice && (
        <p role="status" className="mt-3 text-center text-sm text-gray-500">
          {notice}
        </p>
      )}

      <p className="mt-6 text-center text-gray-600">
        처음이신가요?{" "}
        <Link to="/signup" className="font-bold text-[#c4581a] underline underline-offset-4">
          회원가입
        </Link>
      </p>
      <p className="mt-4 text-center">
        <button
          type="button"
          onClick={() => showNotReady("지도 둘러보기")}
          className="text-sm text-gray-600 underline underline-offset-4 hover:text-gray-900"
        >
          로그인 없이 지도 둘러보기
        </button>
      </p>
    </AuthLayout>
  );
}
