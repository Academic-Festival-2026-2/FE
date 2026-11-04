import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ApiError } from "../../api/client";
import { changePassword } from "../../api/user";
import { TextField } from "../../components/form/text-field";
import { isSessionExpired, useExpireSession } from "../../hooks/use-expire-session";
import { useAuthStore } from "../../stores/auth-store";
import { PASSWORD_PATTERN, PASSWORD_RULE_MESSAGE } from "../../utils/validation";

type Field = "currentPassword" | "newPassword" | "newPasswordConfirm";
type Errors = Partial<Record<Field, string>>;

export function PasswordForm({ accessToken }: { accessToken: string }) {
  const navigate = useNavigate();
  const clearTokens = useAuthStore((state) => state.clearTokens);
  const expireSession = useExpireSession();

  const [values, setValues] = useState<Record<Field, string>>({
    currentPassword: "",
    newPassword: "",
    newPasswordConfirm: "",
  });
  const [serverErrors, setServerErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 입력하는 동안 바로 보여줄 검사(새 비밀번호 확인은 FE에서만 검사)
  const clientErrors: Errors = {};
  if (values.newPassword && !PASSWORD_PATTERN.test(values.newPassword))
    clientErrors.newPassword = PASSWORD_RULE_MESSAGE;
  if (values.newPasswordConfirm && values.newPasswordConfirm !== values.newPassword)
    clientErrors.newPasswordConfirm = "새 비밀번호가 일치하지 않아요.";

  const allFilled = Object.values(values).every((value) => value !== "");
  const canSubmit = allFilled && Object.keys(clientErrors).length === 0 && !isSubmitting;

  function handleChange(field: Field, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setServerErrors((prev) => ({ ...prev, [field]: undefined }));
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      await changePassword(accessToken, {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      // 서버에서 refresh token이 지워졌으니 이 기기도 로그아웃
      clearTokens();
      navigate({ to: "/login", search: { passwordChanged: true } });
    } catch (error) {
      if (isSessionExpired(error)) return expireSession();
      if (!(error instanceof ApiError)) setFormError("비밀번호를 바꾸지 못했어요.");
      else if (error.code === "USER400_1") setServerErrors({ currentPassword: error.message });
      else if (error.code === "USER400_2") setServerErrors({ newPassword: error.message });
      else if (error.fieldErrors) setServerErrors(error.fieldErrors);
      else setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const errorOf = (field: Field) => serverErrors[field] ?? clientErrors[field];

  return (
    <section className="rounded-3xl border border-[#e8e4dc] bg-white p-6">
      <h2 className="flex items-baseline gap-2 text-[17px] font-bold text-gray-900">
        <span className="font-mono text-xs font-normal text-[#c4581a]">02</span>비밀번호 변경
      </h2>

      <form className="mt-4 flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
        <TextField
          id="currentPassword"
          size="sm"
          label="현재 비밀번호"
          type="password"
          autoComplete="current-password"
          value={values.currentPassword}
          onChange={(value) => handleChange("currentPassword", value)}
          error={errorOf("currentPassword")}
        />
        <TextField
          id="newPassword"
          size="sm"
          label="새 비밀번호"
          type="password"
          autoComplete="new-password"
          value={values.newPassword}
          onChange={(value) => handleChange("newPassword", value)}
          error={errorOf("newPassword")}
          hint="영문과 숫자를 함께 넣어 8~20자"
        />
        <TextField
          id="newPasswordConfirm"
          size="sm"
          label="새 비밀번호 확인"
          type="password"
          autoComplete="new-password"
          value={values.newPasswordConfirm}
          onChange={(value) => handleChange("newPasswordConfirm", value)}
          error={errorOf("newPasswordConfirm")}
        />

        {formError && (
          <p role="alert" className="text-sm text-red-500">
            {formError}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-4 pt-2">
          <p className="text-xs text-gray-500">변경하면 다시 로그인해야 해요.</p>
          <button
            type="submit"
            disabled={!canSubmit}
            className="h-10 shrink-0 rounded-[10px] bg-gray-900 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? "변경 중..." : "비밀번호 변경"}
          </button>
        </div>
      </form>
    </section>
  );
}
