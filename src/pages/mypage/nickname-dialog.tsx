import { useState, type FormEvent } from "react";
import { ApiError } from "../../api/client";
import { updateMyInfo, type MyInfoResponse } from "../../api/user";
import { TextField } from "../../components/form/text-field";
import { isSessionExpired, useExpireSession } from "../../hooks/use-expire-session";
import { validateNickname } from "../../utils/validation";
import { DialogActions, DialogShell } from "./dialog-shell";

type NicknameDialogProps = {
  current: string;
  onClose: () => void;
  onUpdated: (changes: Partial<MyInfoResponse>) => void;
};

// 닉네임 변경 팝업 (요약 카드의 연필 버튼)
export function NicknameDialog({ current, onClose, onUpdated }: NicknameDialogProps) {
  const expireSession = useExpireSession();
  const [nickname, setNickname] = useState(current);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const trimmed = nickname.trim();
  const isChanged = trimmed !== current;
  const clientError = isChanged ? validateNickname(nickname) : null;
  const canSave = isChanged && !clientError && !isSaving;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;

    setIsSaving(true);
    try {
      await updateMyInfo({ nickname: trimmed });
      onUpdated({ nickname: trimmed });
      onClose();
    } catch (error) {
      if (isSessionExpired(error)) return expireSession();
      // USER409_2(중복)는 서버 문구, COMMON400은 필드 문구
      if (error instanceof ApiError) setServerError(error.fieldErrors?.nickname ?? error.message);
      else setServerError("닉네임을 바꾸지 못했어요.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <DialogShell eyebrow="NICKNAME" title="닉네임 변경" titleId="nickname-dialog-title" busy={isSaving} onClose={onClose}>
      <form className="mt-4" onSubmit={handleSubmit} noValidate>
        <TextField
          id="nickname"
          size="sm"
          label="닉네임"
          value={nickname}
          onChange={(value) => {
            setNickname(value);
            setServerError(null);
          }}
          error={serverError ?? clientError}
          hint="2~16자, 다른 사람과 겹치지 않는 이름"
        />
        <DialogActions
          busy={isSaving}
          canSubmit={canSave}
          submitLabel="저장"
          busyLabel="저장 중..."
          onCancel={onClose}
        />
      </form>
    </DialogShell>
  );
}
