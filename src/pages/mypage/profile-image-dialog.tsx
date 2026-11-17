import { useState, type FormEvent } from "react";
import { ApiError } from "../../api/client";
import { updateMyInfo, type MyInfoResponse } from "../../api/user";
import { Avatar } from "../../components/avatar";
import { DialogActions, DialogShell } from "../../components/dialog/dialog-shell";
import { isSessionExpired, useExpireSession } from "../../hooks/use-expire-session";
import { cn } from "../../utils/cn";
import { PROFILE_CHARACTERS, PROFILE_COLORS, profileLabel } from "../../utils/profile-image";

// 열 때만 렌더링하고 닫으면 사라짐 → 다시 열면 고르던 값·오류가 초기화되고 지금 사진에서 시작
type ProfileImageDialogProps = {
  current: string;
  onClose: () => void;
  onUpdated: (changes: Partial<MyInfoResponse>) => void;
};

// 팝업 안쪽 폭 기준(컨테이너 쿼리): 좁으면 한 줄 4개, 384px 이상이면 8개(캐릭터 두 종류씩)
const GRID = "grid grid-cols-4 justify-items-center gap-y-2 @sm:grid-cols-8";

// 프로필 사진 변경: 골라서 미리 보고 저장 버튼으로 반영
export function ProfileImageDialog({ current, onClose, onUpdated }: ProfileImageDialogProps) {
  const expireSession = useExpireSession();
  const [draft, setDraft] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canSave = draft !== current && !isSaving;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    setIsSaving(true);
    setError(null);
    try {
      await updateMyInfo({ profileImage: draft });
      onUpdated({ profileImage: draft });
      onClose();
    } catch (error) {
      if (isSessionExpired(error)) return expireSession();
      setError(error instanceof ApiError ? error.message : "프로필 사진을 바꾸지 못했어요.");
    } finally {
      setIsSaving(false);
    }
  }

  function renderOption(option: { key: string; label: string }) {
    const isSelected = option.key === draft;
    return (
      <button
        key={option.key}
        type="button"
        aria-label={option.label}
        aria-pressed={isSelected}
        title={option.label}
        disabled={isSaving}
        onClick={() => {
          setDraft(option.key);
          setError(null);
        }}
        className={cn(
          "grid h-11 w-11 place-items-center rounded-full transition-shadow",
          isSelected
            ? "ring-2 ring-brand ring-offset-2"
            : "hover:ring-2 hover:ring-line hover:ring-offset-2",
        )}
      >
        <Avatar image={option.key} size={40} />
      </button>
    );
  }

  return (
    <DialogShell
      eyebrow="PROFILE"
      title="프로필 사진 변경"
      titleId="profile-image-title"
      busy={isSaving}
      onClose={onClose}
    >
      <div className="mt-4 flex flex-col items-center gap-2 rounded-[10px] bg-field py-4">
        <Avatar image={draft} size={96} />
        <p className="text-sm text-ink-sub">{profileLabel(draft)}</p>
      </div>

      <div className="@container">
        <p className="mt-4 text-xs text-ink-muted">단색</p>
        <div className={cn(GRID, "mt-2")}>{PROFILE_COLORS.map(renderOption)}</div>

        <p className="mt-4 text-xs text-ink-muted">캐릭터</p>
        <div className={cn(GRID, "mt-2")}>{PROFILE_CHARACTERS.map(renderOption)}</div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {error && (
          <p role="alert" className="mt-3 text-xs text-danger">
            {error}
          </p>
        )}
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
