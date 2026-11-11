import { useState } from "react";
import { ApiError } from "../../api/client";
import { updateMyInfo, type MyInfoResponse } from "../../api/user";
import { Avatar } from "../../components/avatar";
import { isSessionExpired, useExpireSession } from "../../hooks/use-expire-session";
import { cn } from "../../utils/cn";
import { PROFILE_CHARACTERS, PROFILE_COLORS } from "../../utils/profile-image";

type ProfileImagePickerProps = {
  info: MyInfoResponse;
  onUpdated: (changes: Partial<MyInfoResponse>) => void;
};

// 칸 하나 크기 44px, 카드 폭에 맞춰 한 줄 개수가 정해짐
const GRID = "grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-2";

// 프로필 사진: 누르면 바로 저장
export function ProfileImagePicker({ info, onUpdated }: ProfileImagePickerProps) {
  const expireSession = useExpireSession();
  const [selected, setSelected] = useState(info.profileImage);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSelect(key: string) {
    if (key === selected || isSaving) return;
    const previous = selected;
    // 먼저 바꾸고, 실패하면 되돌림
    setSelected(key);
    setError(null);
    setIsSaving(true);
    try {
      await updateMyInfo({ profileImage: key });
      onUpdated({ profileImage: key });
    } catch (error) {
      setSelected(previous);
      if (isSessionExpired(error)) return expireSession();
      setError(error instanceof ApiError ? error.message : "프로필 사진을 바꾸지 못했어요.");
    } finally {
      setIsSaving(false);
    }
  }

  function renderOption(option: { key: string; label: string }) {
    const isSelected = option.key === selected;
    return (
      <button
        key={option.key}
        type="button"
        aria-label={option.label}
        aria-pressed={isSelected}
        title={option.label}
        disabled={isSaving}
        onClick={() => handleSelect(option.key)}
        className={cn(
          "grid aspect-square place-items-center rounded-full transition-shadow disabled:cursor-wait",
          isSelected
            ? "ring-2 ring-gray-900 ring-offset-2"
            : "hover:ring-2 hover:ring-[#e3dfd7] hover:ring-offset-2",
        )}
      >
        <Avatar image={option.key} nickname={info.nickname} size={40} />
      </button>
    );
  }

  return (
    <div>
      <p className="text-sm font-bold text-gray-900">프로필 사진</p>
      <p className="mt-1 text-xs text-gray-500">고르면 바로 저장돼요.</p>

      <p className="mt-3 text-[11px] text-gray-500">단색</p>
      <div className={cn(GRID, "mt-1.5")}>{PROFILE_COLORS.map(renderOption)}</div>

      <p className="mt-3 text-[11px] text-gray-500">캐릭터</p>
      <div className={cn(GRID, "mt-1.5")}>{PROFILE_CHARACTERS.map(renderOption)}</div>

      {error && (
        <p role="alert" className="mt-2 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
