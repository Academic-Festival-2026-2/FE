import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { signUp } from "../../api/auth";
import { ApiError } from "../../api/client";
import { TextField } from "../../components/form/text-field";
import { AuthLayout } from "../../components/layout/auth-layout";

type Field = "email" | "password" | "passwordConfirm" | "nickname";
type FormValues = Record<Field, string>;

type Term = "service" | "privacy" | "location" | "notification";

const TERMS: { key: Term; label: string; required: boolean }[] = [
  { key: "service", label: "[필수] 서비스 이용약관", required: true },
  { key: "privacy", label: "[필수] 개인정보 수집·이용", required: true },
  { key: "location", label: "[필수] 위치정보 이용 (사진 촬영 위치)", required: true },
  // 저장할 BE 필드가 아직 없어 화면에만 표시
  { key: "notification", label: "[선택] 색 알림 수신", required: false },
];

// BE SignUpRequest 검증 규칙과 동일하게 유지
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)[\x21-\x7E]{8,20}$/;

function validate(values: FormValues): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  const nickname = values.nickname.trim();

  if (values.email.trim() === "") errors.email = "이메일을 입력해 주세요.";
  else if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = "이메일 형식이 올바르지 않아요.";

  if (values.password === "") errors.password = "비밀번호를 입력해 주세요.";
  else if (!PASSWORD_PATTERN.test(values.password))
    errors.password = "공백 없이 영문과 숫자를 함께 넣어 8~20자로 입력해 주세요.";

  if (values.passwordConfirm === "") errors.passwordConfirm = "비밀번호를 한 번 더 입력해 주세요.";
  else if (values.passwordConfirm !== values.password)
    errors.passwordConfirm = "비밀번호가 일치하지 않아요.";

  if (nickname === "") errors.nickname = "닉네임을 입력해 주세요.";
  else if (nickname.length < 2 || nickname.length > 16) errors.nickname = "닉네임은 2~16자로 입력해 주세요.";

  return errors;
}

export function SignUpPage() {
  const navigate = useNavigate();

  const [values, setValues] = useState<FormValues>({
    email: "",
    password: "",
    passwordConfirm: "",
    nickname: "",
  });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [agreements, setAgreements] = useState<Record<Term, boolean>>({
    service: false,
    privacy: false,
    location: false,
    notification: false,
  });
  const [serverErrors, setServerErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const errors = validate(values);
  const allAgreed = TERMS.every((term) => agreements[term.key]);
  const requiredAgreed = TERMS.every((term) => !term.required || agreements[term.key]);
  const canSubmit = Object.keys(errors).length === 0 && requiredAgreed && !isSubmitting;

  function handleChange(field: Field, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    // 값을 고치면 해당 칸의 서버 에러는 지움
    setServerErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function errorOf(field: Field) {
    return serverErrors[field] ?? (touched[field] ? errors[field] : undefined);
  }

  function markTouched(field: Field) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function toggleAll(checked: boolean) {
    setAgreements({ service: checked, privacy: checked, location: checked, notification: checked });
  }

  // 아직 BE API가 없는 기능
  function showNotReady(feature: string) {
    setNotice(`${feature} 기능은 준비 중이에요.`);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ email: true, password: true, passwordConfirm: true, nickname: true });
    if (!canSubmit) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      await signUp({
        email: values.email.trim(),
        nickname: values.nickname.trim(),
        password: values.password,
      });
      navigate({ to: "/login", search: { signedUp: true } });
    } catch (error) {
      if (error instanceof ApiError && error.code === "USER409_1") {
        setServerErrors({ email: error.message });
      } else if (error instanceof ApiError && error.fieldErrors) {
        setServerErrors(error.fieldErrors);
      } else {
        setFormError(error instanceof ApiError ? error.message : "회원가입 중 오류가 발생했어요.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout headerLink={{ to: "/login", label: "로그인" }} cardClassName="max-w-[480px]">
      <h1 className="text-3xl font-extrabold text-gray-900">회원가입</h1>
      <p className="mt-3 text-gray-600">내 사진이 동네의 색이 되도록, 계정을 만들어 주세요.</p>

      <form className="mt-6 flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
        <TextField
          id="email"
          label="이메일"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          value={values.email}
          onChange={(value) => handleChange("email", value)}
          onBlur={() => markTouched("email")}
          error={errorOf("email")}
          action={
            <button
              type="button"
              onClick={() => showNotReady("이메일 인증")}
              className="h-12 shrink-0 rounded-xl border border-gray-900 bg-white px-4 text-sm text-gray-900 transition-colors hover:bg-[#f7f5f0]"
            >
              인증 메일
            </button>
          }
        />
        <TextField
          id="password"
          label="비밀번호"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={(value) => handleChange("password", value)}
          onBlur={() => markTouched("password")}
          error={errorOf("password")}
          hint="8자 이상, 영문과 숫자를 함께"
        />
        <TextField
          id="passwordConfirm"
          label="비밀번호 확인"
          type="password"
          autoComplete="new-password"
          value={values.passwordConfirm}
          onChange={(value) => handleChange("passwordConfirm", value)}
          onBlur={() => markTouched("passwordConfirm")}
          error={errorOf("passwordConfirm")}
        />
        <TextField
          id="nickname"
          label="닉네임"
          autoComplete="nickname"
          value={values.nickname}
          onChange={(value) => handleChange("nickname", value)}
          onBlur={() => markTouched("nickname")}
          error={errorOf("nickname")}
          hint="2–16자 · 동 지도에서 사진 올린 사람으로 표시"
        />

        <fieldset className="rounded-2xl border border-[#e8e4dc] px-4 pt-1 pb-4">
          <legend className="px-2 text-sm text-gray-600">약관 동의</legend>
          <label className="flex cursor-pointer items-center gap-3 border-b border-[#e8e4dc] py-3 font-bold text-gray-900">
            <input
              type="checkbox"
              checked={allAgreed}
              onChange={(event) => toggleAll(event.target.checked)}
              className="h-5 w-5 accent-[#ff8a3d]"
            />
            전체 동의
          </label>
          <div className="mt-2 flex flex-col">
            {TERMS.map((term) => (
              <label key={term.key} className="flex cursor-pointer items-center gap-3 py-2 text-gray-800">
                <input
                  type="checkbox"
                  checked={agreements[term.key]}
                  onChange={(event) =>
                    setAgreements((prev) => ({ ...prev, [term.key]: event.target.checked }))
                  }
                  className="h-5 w-5 accent-[#ff8a3d]"
                />
                {term.label}
              </label>
            ))}
          </div>
        </fieldset>

        {formError && (
          <p role="alert" className="text-sm text-red-500">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="h-12 w-full rounded-xl bg-[#ff8a3d] font-bold text-gray-900 transition-colors hover:bg-[#f57a2a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "가입 중..." : "가입하기"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => showNotReady("카카오 가입")}
        className="mt-4 h-12 w-full rounded-xl border border-[#ddd8ce] bg-white text-gray-900 transition-colors hover:bg-[#f7f5f0]"
      >
        카카오로 가입
      </button>

      {notice && (
        <p role="status" className="mt-3 text-center text-sm text-gray-500">
          {notice}
        </p>
      )}

      <p className="mt-6 text-center text-gray-600">
        이미 계정이 있으신가요?{" "}
        <Link to="/login" className="font-bold text-[#c4581a] underline underline-offset-4">
          로그인
        </Link>
      </p>
    </AuthLayout>
  );
}
