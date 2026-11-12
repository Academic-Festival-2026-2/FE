import { useEffect, useRef, useState } from "react";
import { ApiError } from "../../api/client";
import { updateMyInfo, type MyInfoResponse } from "../../api/user";
import { Avatar } from "../../components/avatar";
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const expireSession = useExpireSession();
  const [draft, setDraft] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 화면에 나타나면 모달로 열기 (showModal: 배경 어둡게, 뒤쪽 클릭 막기, 포커스 가두기)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function handleClose() {
    if (isSaving) return;
    onClose();
  }

  async function handleSave() {
    if (draft === current || isSaving) return;
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
    <dialog
      ref={dialogRef}
      aria-labelledby="profile-image-title"
      onClose={handleClose}
      // ESC: 브라우저 기본 닫기를 막고 직접 닫음. 저장 중에는 닫지 않음
      onCancel={(event) => {
        event.preventDefault();
        handleClose();
      }}
      // 어두운 바깥을 누르면 닫기. 바깥(::backdrop) 클릭은 target이 dialog 자체로 들어옴
      // dialog에 padding을 주면 흰 상자 여백 클릭도 dialog로 잡혀 닫히므로, padding은 안쪽 div에 줌
      onClick={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
      className="m-auto w-[min(440px,calc(100%-32px))] rounded-[18px] bg-white p-0 shadow-[0_12px_32px_rgba(0,0,0,0.1)] backdrop:bg-black/40"
    >
      <div className="p-6">
        <p className="font-mono text-[11px] tracking-[1.2px] text-brand-strong">PROFILE</p>
        <h2 id="profile-image-title" className="mt-1 text-xl leading-7 font-bold text-ink">
          프로필 사진 변경
        </h2>

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

        {error && (
          <p role="alert" className="mt-3 text-xs text-danger">
            {error}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleClose}
            className="h-11 rounded-[10px] border border-card-line bg-white text-sm text-ink transition-colors hover:bg-field disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            disabled={draft === current || isSaving}
            onClick={handleSave}
            className="h-11 rounded-[10px] bg-brand text-sm font-bold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
