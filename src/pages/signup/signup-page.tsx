import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { signUp } from "../../api/auth";
import { ApiError } from "../../api/client";
import { TextField } from "../../components/form/text-field";
import { AuthHeader } from "../../components/layout/auth-header";

type Field = "name" | "email" | "password" | "passwordConfirm";
type FormValues = Record<Field, string>;

// BE SignUpRequest 검증 규칙과 동일하게 유지
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@catholic\.ac\.kr$/;
const PASSWORD_PATTERN = /^[\x21-\x7E]{8,20}$/;

function validate(values: FormValues): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  const name = values.name.trim();

  if (name === "") errors.name = "이름을 입력해주세요.";
  else if (name.length > 30) errors.name = "이름은 30자 이하여야 해요.";

  if (values.email.trim() === "") errors.email = "이메일을 입력해주세요.";
  else if (!EMAIL_PATTERN.test(values.email.trim()))
    errors.email = "가톨릭대학교 이메일(@catholic.ac.kr)만 사용할 수 있어요.";

  if (values.password === "") errors.password = "비밀번호를 입력해주세요.";
  else if (!PASSWORD_PATTERN.test(values.password))
    errors.password = "공백 없는 영문, 숫자, 특수문자 8~20자로 입력해주세요.";

  if (values.passwordConfirm === "") errors.passwordConfirm = "비밀번호를 한 번 더 입력해주세요.";
  else if (values.passwordConfirm !== values.password)
    errors.passwordConfirm = "비밀번호가 일치하지 않아요.";

  return errors;
}

export function SignUpPage() {
  const navigate = useNavigate();

  const [values, setValues] = useState<FormValues>({
    name: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [agreed, setAgreed] = useState(false);
  const [serverErrors, setServerErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const errors = validate(values);
  const canSubmit = Object.keys(errors).length === 0 && agreed && !isSubmitting;

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ name: true, email: true, password: true, passwordConfirm: true });
    if (!canSubmit) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      await signUp({
        name: values.name.trim(),
        email: values.email.trim(),
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
    <div className="mx-auto min-h-screen max-w-md bg-white">
      <AuthHeader />
      <main className="px-5 pt-8 pb-12">
        <h1 className="text-2xl font-bold text-gray-900">회원가입</h1>
        <p className="mt-2 text-sm text-gray-500">가톨릭대학교 이메일로 가입할 수 있어요.</p>

        <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <TextField
            id="name"
            label="이름"
            autoComplete="name"
            placeholder="이름을 입력해주세요"
            value={values.name}
            onChange={(value) => handleChange("name", value)}
            onBlur={() => markTouched("name")}
            error={errorOf("name")}
          />
          <TextField
            id="email"
            label="이메일"
            type="email"
            autoComplete="email"
            placeholder="example@catholic.ac.kr"
            value={values.email}
            onChange={(value) => handleChange("email", value)}
            onBlur={() => markTouched("email")}
            error={errorOf("email")}
            hint="@catholic.ac.kr 이메일만 가입할 수 있어요."
          />
          <TextField
            id="password"
            label="비밀번호"
            type="password"
            autoComplete="new-password"
            placeholder="비밀번호를 입력해주세요"
            value={values.password}
            onChange={(value) => handleChange("password", value)}
            onBlur={() => markTouched("password")}
            error={errorOf("password")}
            hint="공백 없는 영문, 숫자, 특수문자 8~20자"
          />
          <TextField
            id="passwordConfirm"
            label="비밀번호 확인"
            type="password"
            autoComplete="new-password"
            placeholder="비밀번호를 다시 입력해주세요"
            value={values.passwordConfirm}
            onChange={(value) => handleChange("passwordConfirm", value)}
            onBlur={() => markTouched("passwordConfirm")}
            error={errorOf("passwordConfirm")}
          />

          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              className="h-4 w-4 accent-[#3b6fb6]"
            />
            이용약관 및 개인정보처리방침에 동의합니다.
          </label>

          {formError && (
            <p role="alert" className="text-sm text-red-500">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-2 h-12 w-full rounded-lg bg-[#3b6fb6] text-sm font-semibold text-white transition-colors hover:bg-[#335f9e] disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isSubmitting ? "가입 중..." : "가입하기"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          이미 계정이 있나요?{" "}
          <Link to="/login" className="font-semibold text-[#3b6fb6] hover:underline">
            로그인
          </Link>
        </p>
      </main>
    </div>
  );
}
