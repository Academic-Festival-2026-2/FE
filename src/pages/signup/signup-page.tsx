import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { signUp } from "../../api/auth";
import { ApiError } from "../../api/client";
import { Checkbox } from "../../components/form/checkbox";
import { TextField } from "../../components/form/text-field";
import { AuthLayout } from "../../components/layout/auth-layout";
import { TermsDialog } from "../../components/terms-dialog";
import { LOCATION_TERMS } from "../../constants/terms/location-terms";
import { PRIVACY_TERMS } from "../../constants/terms/privacy-terms";
import { SERVICE_TERMS } from "../../constants/terms/service-terms";
import type { TermContent } from "../../constants/terms/types";
import {
  EMAIL_PATTERN,
  PASSWORD_PATTERN,
  PASSWORD_RULE_MESSAGE,
  validateNickname,
} from "../../utils/validation";

const FIELDS = ["email", "password", "passwordConfirm", "nickname"] as const;
type Field = (typeof FIELDS)[number];
type FormValues = Record<Field, string>;

type Term = "age" | "service" | "privacy" | "location" | "notification";

const TERMS: { key: Term; label: string; required: boolean; content?: TermContent }[] = [
  { key: "age", label: "만 14세 이상입니다", required: true },
  { key: "service", label: "서비스 이용약관", required: true, content: SERVICE_TERMS },
  { key: "privacy", label: "개인정보 수집·이용", required: true, content: PRIVACY_TERMS },
  { key: "location", label: "위치정보 이용 (사진 촬영 위치)", required: false, content: LOCATION_TERMS },
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
    age: false,
    service: false,
    privacy: false,
    location: false,
    notification: false,
  });
  // 지금 열려 있는 약관 (null이면 팝업 닫힘)
  const [openTerm, setOpenTerm] = useState<TermContent | null>(null);
  const [serverErrors, setServerErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
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
    setAgreements({ age: checked, service: checked, privacy: checked, location: checked, notification: checked });
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
    // 시안: 모바일 Signup-A, PC Signup-B
    <AuthLayout cardClassName="max-w-[1000px] rounded-[20px] px-5 pt-7 pb-6 sm:rounded-3xl sm:px-[46px] sm:pt-11 sm:pb-[34px]">
      <h1 className="text-[26px] font-black tracking-[-0.5px] text-ink sm:text-[32px]">
        회원가입
      </h1>
      <p className="mt-2 text-[15px] text-ink-sub sm:mt-2.5">
        내 사진이 동네의 색이 되도록,
        <br className="sm:hidden" /> 계정을 만들어 주세요.
      </p>

      {/* 폼 폭이 680px(320px × 2 + 간격 40px) 이상이면 2단 */}
      <form
        className="@container mt-6 grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-x-10 gap-y-[18px] sm:mt-[30px]"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="flex flex-col gap-[18px]">
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
          {/* 1단이고 폭이 넉넉하면 비밀번호 두 칸을 나란히, 2단에서는 세로로 */}
          <div className="flex flex-wrap gap-x-3 gap-y-[18px] @min-[680px]:flex-col">
            <div className="min-w-0 flex-[1_1_200px] @min-[680px]:flex-none">
              <TextField
                id="password"
                label="비밀번호"
                type="password"
                autoComplete="new-password"
                placeholder="8~20자, 영문+숫자"
                hint="영문과 숫자를 함께 넣어 8~20자"
                value={values.password}
                onChange={(value) => handleChange("password", value)}
                onBlur={() => markTouched("password")}
                error={errorOf("password")}
              />
            </div>
            <div className="min-w-0 flex-[1_1_200px] @min-[680px]:flex-none">
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
            </div>
          </div>
          <TextField
            id="nickname"
            label="닉네임"
            autoComplete="nickname"
            placeholder="2~16자"
            hint="2~16자, 동 지도에서 사진 올린 사람으로 표시돼요"
            value={values.nickname}
            onChange={(value) => handleChange("nickname", value)}
            onBlur={() => markTouched("nickname")}
            error={errorOf("nickname")}
          />
        </div>

        <div className="flex flex-col gap-[18px]">
          {/* 약관 박스가 남는 높이를 채우고(줄 간격은 고르게) 버튼 아랫선을 왼쪽 닉네임 칸과 맞춤 */}
          <fieldset className="flex flex-1 flex-col justify-between gap-2 rounded-xl border border-field-line px-3.5 pt-1.5 pb-3.5 text-sm sm:px-4">
            <legend className="px-1 text-sm font-bold text-ink">약관 동의</legend>
            <label className="flex cursor-pointer items-center gap-2.5 border-b border-divider pt-1.5 pb-3 font-bold text-ink">
              <Checkbox checked={allAgreed} onChange={toggleAll} />
              전체 동의
            </label>
            {TERMS.map((term) => (
              <div key={term.key} className="flex items-center justify-between gap-3">
                <label className="flex min-w-0 cursor-pointer items-center gap-2.5 text-ink">
                  <Checkbox
                    checked={agreements[term.key]}
                    onChange={(checked) =>
                      setAgreements((prev) => ({ ...prev, [term.key]: checked }))
                    }
                  />
                  <span>
                    <b className={term.required ? "text-brand-strong" : "text-ink-muted"}>
                      {term.required ? "[필수]" : "[선택]"}
                    </b>{" "}
                    {term.label}
                  </span>
                </label>
                {/* 약관 본문이 있는 항목만 보기 버튼 표시 */}
                {term.content && (
                  <button
                    type="button"
                    onClick={() => setOpenTerm(term.content ?? null)}
                    className="shrink-0 text-[13px] whitespace-nowrap text-ink-muted underline underline-offset-4 hover:text-ink"
                  >
                    보기
                  </button>
                )}
              </div>
            ))}
          </fieldset>

          {formError && (
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="h-[52px] w-full shrink-0 rounded-xl bg-brand font-black text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "가입 중..." : "가입하기"}
          </button>
        </div>
      </form>

      {/* form 밖에 둬야 팝업 안 버튼이 가입 폼을 제출하지 않음 */}
      {openTerm && <TermsDialog term={openTerm} onClose={() => setOpenTerm(null)} />}

      <p className="mt-[26px] text-center text-sm text-ink-sub">
        이미 계정이 있으신가요?{" "}
        <Link to="/login" className="font-bold text-brand-strong underline underline-offset-4 hover:text-brand">
          로그인
        </Link>
      </p>
    </AuthLayout>
  );
}
