import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { login } from "../../api/auth";
import { ApiError } from "../../api/client";
import { Checkbox } from "../../components/form/checkbox";
import { TextField } from "../../components/form/text-field";
import { AuthHeader } from "../../components/layout/auth-header";
import { useAuthStore } from "../../stores/auth-store";
import { currentTimeBand } from "../../utils/time-band";
import loginHero from "../../assets/login-hero.svg";

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
      navigate({ to: "/map", search: { timeBand: currentTimeBand() }, replace: true });
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "로그인 중 오류가 발생했어요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <AuthHeader />
      {/*
        2단일 때 카드 높이 = 화면 높이 - 헤더(67px) - 위아래 여백(56px×2), 단 620~760px 사이.
        화면 축소 등으로 창이 아주 높으면 760px에서 멈추고 세로 가운데 정렬,
        창이 낮으면 620px을 유지하고 스크롤
      */}
      <main className="mx-auto grid w-full max-w-[1440px] flex-1 content-start gap-6 px-4 py-12 sm:px-12 sm:py-14 xl:grid-cols-[1.25fr_1fr] xl:grid-rows-[clamp(620px,calc(100svh-179px),760px)] xl:content-center">
        {/* 소개 그림: 좁은 화면에서는 숨기고 로그인 카드만 표시 */}
        <section
          aria-label="픽셀 소개"
          className="relative hidden min-h-[620px] overflow-hidden rounded-3xl border border-card-line bg-white xl:block"
        >
          {/*
            그림은 시안처럼 56px 위로 올리고, 크기는 카드 폭에만 맞춤.
            창이 높거나(화면 축소) 낮아도 그림이 커지거나 줄지 않아 문구와 겹치지 않음
          */}
          <img
            src={loginHero}
            alt=""
            className="absolute -top-[57px] -left-px h-auto max-w-[calc(100%+2px)]"
          />
          <p className="absolute right-10 bottom-10 left-10 text-[clamp(32px,3.5vw,50px)] leading-[1.22] font-black tracking-[-2px] text-ink">
            사진의 색으로 그리는
            <br />
            <span className="mt-1.5 inline-block rounded-lg bg-brand px-3 pt-0.5 pb-1 text-white">
              동네 여행 지도
            </span>
          </p>
        </section>

        <section className="mx-auto flex w-full max-w-[480px] flex-col rounded-3xl border border-card-line bg-white px-6 py-10 sm:px-[46px] sm:pt-9 sm:pb-7 xl:max-w-none">
          <h1 className="text-[32px] font-black tracking-[-0.5px] text-ink">로그인</h1>
          <p className="mt-2.5 text-[15px] text-ink-sub">
            사진을 올리고 내 기록을 보려면 로그인해 주세요.
          </p>

          {loginNotice && (
            <p role="status" className="mt-6 rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand-strong">
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
              <label className="flex cursor-pointer items-center gap-2 text-ink-sub">
                <Checkbox checked={remember} onChange={setRemember} />
                로그인 유지
              </label>
              <button
                type="button"
                onClick={() => showNotReady("비밀번호 찾기")}
                className="text-ink-sub underline underline-offset-4 hover:text-ink"
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
              className="h-[52px] w-full rounded-xl bg-brand font-black text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "로그인 중..." : "로그인"}
            </button>
          </form>

          {notice && (
            <p role="status" className="mt-3 text-center text-sm text-ink-muted">
              {notice}
            </p>
          )}

          {/* 카드 바닥에 붙는 링크 */}
          <div className="mt-auto flex flex-col items-center gap-2.5 pt-8 text-sm text-ink-sub">
            <p>
              처음이신가요?{" "}
              <Link
                to="/signup"
                className="font-bold text-brand-strong underline underline-offset-4 hover:text-brand"
              >
                회원가입
              </Link>
            </p>
            {/* /map은 로그인 없이 볼 수 있음, 시간대는 지금 시각 기준 */}
            <Link
              to="/map"
              search={{ timeBand: currentTimeBand() }}
              className="text-[13px] text-ink-muted underline underline-offset-4 hover:text-ink"
            >
              로그인 없이 지도 둘러보기
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
