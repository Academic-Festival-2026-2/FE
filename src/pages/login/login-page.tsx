import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { login } from "../../api/auth";
import { ApiError } from "../../api/client";
import { TextField } from "../../components/form/text-field";
import { AuthHeader } from "../../components/layout/auth-header";
import { useAuthStore } from "../../stores/auth-store";
import loginHero from "../../assets/login-hero.png";

export function LoginPage() {
  const navigate = useNavigate();
  const { signedUp, passwordChanged, withdrawn, expired } = useSearch({ from: "/login" });
  const setTokens = useAuthStore((state) => state.setTokens);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = email.trim() !== "" && password !== "" && !isSubmitting;

  // 다른 화면에서 이동해 왔을 때 보여줄 안내
  const loginNotice = signedUp
    ? "회원가입이 완료되었어요. 가입한 이메일로 로그인해 주세요."
    : passwordChanged
      ? "비밀번호를 바꿨어요. 새 비밀번호로 로그인해 주세요."
      : withdrawn
        ? "탈퇴가 완료되었어요. 그동안 이용해 주셔서 고마워요."
        : expired
          ? "로그인이 만료되었어요. 다시 로그인해 주세요."
          : null;

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
    <div className="min-h-screen bg-[#f3f1ec]">
      <AuthHeader />
      <main className="mx-auto grid w-full max-w-[1440px] gap-6 px-4 py-12 sm:px-12 sm:pt-14 sm:pb-6 xl:grid-cols-[1.25fr_1fr]">
        {/* 소개 그림: 좁은 화면에서는 숨기고 로그인 카드만 표시 */}
        <section
          aria-label="픽셀 소개"
          className="relative hidden min-h-[620px] overflow-hidden rounded-3xl border border-[#e6e2da] bg-white xl:block"
        >
          <img
            src={loginHero}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-left-top"
          />
          <p className="absolute right-10 bottom-10 left-10 text-[clamp(32px,3.5vw,50px)] leading-[1.22] font-extrabold tracking-[-2px] text-gray-900">
            사진의 색으로 그리는
            <br />
            <span className="mt-1.5 inline-block rounded-lg bg-[#ff8a3d] px-3 pt-0.5 pb-1">
              동네 여행 지도
            </span>
          </p>
        </section>

        <section className="mx-auto flex w-full max-w-[480px] flex-col rounded-3xl border border-[#e6e2da] bg-white px-6 py-10 sm:px-[46px] sm:pt-11 sm:pb-[34px] xl:max-w-none">
          <h1 className="text-[32px] font-extrabold tracking-[-0.5px] text-gray-900">로그인</h1>
          <p className="mt-2.5 text-[15px] text-[#55524c]">
            사진을 올리고 내 기록을 보려면 로그인해 주세요.
          </p>

          {loginNotice && (
            <p role="status" className="mt-6 rounded-xl bg-[#fff1e6] px-4 py-3 text-sm text-[#b9541a]">
              {loginNotice}
            </p>
          )}

          <form className="mt-[30px] flex flex-col gap-[18px]" onSubmit={handleSubmit} noValidate>
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
              placeholder="비밀번호"
              value={password}
              onChange={setPassword}
            />

            <div className="flex items-center justify-between text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-[#55524c]">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  className="h-[18px] w-[18px] accent-[#ff8a3d]"
                />
                로그인 유지
              </label>
              <button
                type="button"
                onClick={() => showNotReady("비밀번호 찾기")}
                className="text-[#55524c] underline underline-offset-4 hover:text-gray-900"
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
              className="h-[52px] w-full rounded-xl bg-[#ff8a3d] font-extrabold text-gray-900 transition-colors hover:bg-[#f57a2a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "로그인 중..." : "로그인"}
            </button>
          </form>

          {notice && (
            <p role="status" className="mt-3 text-center text-sm text-gray-500">
              {notice}
            </p>
          )}

          {/* 카드 바닥에 붙는 링크 */}
          <div className="mt-auto flex flex-col items-center gap-2.5 pt-8 text-sm text-[#55524c]">
            <p>
              처음이신가요?{" "}
              <Link
                to="/signup"
                className="font-bold text-[#b5470e] underline underline-offset-4 hover:text-[#8a350a]"
              >
                회원가입
              </Link>
            </p>
            {/* /map은 로그인 없이 볼 수 있음, 시간대는 지도 화면 기본값(SUNSET)과 같게 */}
            <Link
              to="/map"
              search={{ timeBand: "SUNSET" }}
              className="text-[13px] text-[#6b675f] underline underline-offset-4 hover:text-gray-900"
            >
              로그인 없이 지도 둘러보기
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
