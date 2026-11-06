import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { signUp } from "../../api/auth";
import { ApiError } from "../../api/client";
import { TextField } from "../../components/form/text-field";
import { AuthLayout } from "../../components/layout/auth-layout";
import {
  EMAIL_PATTERN,
  PASSWORD_PATTERN,
  PASSWORD_RULE_MESSAGE,
  validateNickname,
} from "../../utils/validation";

const FIELDS = ["email", "password", "passwordConfirm", "nickname"] as const;
type Field = (typeof FIELDS)[number];
type FormValues = Record<Field, string>;

type Term = "service" | "privacy" | "location" | "notification";

const TERMS: { key: Term; label: string; required: boolean }[] = [
  { key: "service", label: "서비스 이용약관", required: true },
  { key: "privacy", label: "개인정보 수집·이용", required: true },
  { key: "location", label: "위치정보 이용 (사진 촬영 위치)", required: true },
  // 저장할 BE 필드가 아직 없어 화면에만 표시
  { key: "notification", label: "색 알림 수신", required: false },
];

function validate(values: FormValues): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};

  if (values.email.trim() === "") errors.email = "이메일을 입력해 주세요.";
  else if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = "이메일 형식이 올바르지 않아요.";

  if (values.password === "") errors.password = "비밀번호를 입력해 주세요.";
  else if (!PASSWORD_PATTERN.test(values.password))
    errors.password = PASSWORD_RULE_MESSAGE;

  if (values.passwordConfirm === "") errors.passwordConfirm = "비밀번호를 한 번 더 입력해 주세요.";
  else if (values.passwordConfirm !== values.password)
    errors.passwordConfirm = "비밀번호가 일치하지 않아요.";

  const nicknameError = validateNickname(values.nickname);
  if (nicknameError) errors.nickname = nicknameError;

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
        termsAgreed: agreements.service,
        privacyAgreed: agreements.privacy,
        locationAgreed: agreements.location,
      });
      navigate({ to: "/login", search: { signedUp: true } });
    } catch (error) {
      if (error instanceof ApiError && error.code === "USER409_1") {
        setServerErrors({ email: error.message });
      } else if (error instanceof ApiError && error.code === "USER409_2") {
        setServerErrors({ nickname: error.message });
      } else if (error instanceof ApiError && error.fieldErrors) {
        setServerErrors(error.fieldErrors);
        // 입력칸이 없는 에러(약관 동의 등)는 버튼 위에 표시
        const otherErrors = Object.entries(error.fieldErrors)
          .filter(([field]) => !(FIELDS as readonly string[]).includes(field))
          .map(([, message]) => message);
        if (otherErrors.length > 0) setFormError(otherErrors.join(" "));
      } else {
        setFormError(error instanceof ApiError ? error.message : "회원가입 중 오류가 발생했어요.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout cardClassName="max-w-[1000px] px-5 py-8 sm:px-12 sm:py-12">
      <h1 className="text-3xl font-extrabold tracking-[-0.5px] text-gray-900">회원가입</h1>
      <p className="mt-2 text-[15px] text-[#55524c]">
        내 사진이 동네의 색이 되도록, 계정을 만들어 주세요.
      </p>

      <form
        className="mt-8 grid gap-x-10 gap-y-5 md:grid-cols-2"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="flex flex-col gap-5">
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
          />
          <TextField
            id="password"
            label="비밀번호"
            type="password"
            autoComplete="new-password"
            placeholder="8~20자, 영문+숫자"
            value={values.password}
            onChange={(value) => handleChange("password", value)}
            onBlur={() => markTouched("password")}
            error={errorOf("password")}
          />
          <TextField
            id="passwordConfirm"
            label="비밀번호 확인"
            type="password"
            autoComplete="new-password"
            placeholder="한 번 더"
            value={values.passwordConfirm}
            onChange={(value) => handleChange("passwordConfirm", value)}
            onBlur={() => markTouched("passwordConfirm")}
            error={errorOf("passwordConfirm")}
          />
          <TextField
            id="nickname"
            label="닉네임"
            autoComplete="nickname"
            placeholder="2–16자 · 동 지도에서 사진 올린 사람으로 표시돼요"
            value={values.nickname}
            onChange={(value) => handleChange("nickname", value)}
            onBlur={() => markTouched("nickname")}
            error={errorOf("nickname")}
          />
        </div>

        <div className="flex flex-col gap-5">
          {/* 약관 박스가 남는 높이를 채워 버튼 아랫선을 왼쪽 닉네임 칸과 맞춤 */}
          <fieldset className="flex-1 rounded-2xl border border-[#e2ded5] px-5 pt-1 pb-4">
            <legend className="px-1 text-sm font-bold text-gray-900">약관 동의</legend>
            <label className="flex cursor-pointer items-center gap-3 border-b border-[#ece8e1] py-3 font-bold text-gray-900">
              <input
                type="checkbox"
                checked={allAgreed}
                onChange={(event) => toggleAll(event.target.checked)}
                className="h-5 w-5 shrink-0 accent-[#ff8a3d]"
              />
              전체 동의
            </label>
            <div className="mt-2 flex flex-col">
              {TERMS.map((term) => (
                <div key={term.key} className="flex items-center justify-between gap-3 py-1.5">
                  <label className="flex min-w-0 cursor-pointer items-center gap-3 text-gray-800">
                    <input
                      type="checkbox"
                      checked={agreements[term.key]}
                      onChange={(event) =>
                        setAgreements((prev) => ({ ...prev, [term.key]: event.target.checked }))
                      }
                      className="h-5 w-5 shrink-0 accent-[#ff8a3d]"
                    />
                    <span>
                      <b className={term.required ? "text-[#b5470e]" : "text-[#6b675f]"}>
                        {term.required ? "[필수]" : "[선택]"}
                      </b>{" "}
                      {term.label}
                    </span>
                  </label>
                  {/* 약관 본문이 아직 없어 안내만 표시 */}
                  <button
                    type="button"
                    onClick={() => showNotReady("약관 보기")}
                    className="shrink-0 text-[13px] whitespace-nowrap text-[#6b675f] underline underline-offset-4 hover:text-gray-900"
                  >
                    보기
                  </button>
                </div>
              ))}
            </div>
            {notice && (
              <p role="status" className="mt-2 text-sm text-gray-500">
                {notice}
              </p>
            )}
          </fieldset>

          {formError && (
            <p role="alert" className="text-sm text-red-500">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="h-12 w-full shrink-0 rounded-xl bg-[#ff8a3d] font-extrabold text-gray-900 transition-colors hover:bg-[#f57a2a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "가입 중..." : "가입하기"}
          </button>
        </div>
      </form>

      <p className="mt-8 text-center text-sm text-[#55524c]">
        이미 계정이 있으신가요?{" "}
        <Link to="/login" className="font-bold text-[#b5470e] underline underline-offset-4 hover:text-[#8a350a]">
          로그인
        </Link>
      </p>
    </AuthLayout>
  );
}
