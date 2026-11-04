import { useState, type FormEvent } from "react";
import { ApiError } from "../../api/client";
import { updateMyInfo, type MyInfoResponse } from "../../api/user";
import { TextField } from "../../components/form/text-field";
import { isSessionExpired, useExpireSession } from "../../hooks/use-expire-session";
import { cn } from "../../utils/cn";
import { validateNickname } from "../../utils/validation";

type ProfileFormProps = {
  accessToken: string;
  info: MyInfoResponse;
  onUpdated: (changes: Partial<MyInfoResponse>) => void;
};

export function ProfileForm({ accessToken, info, onUpdated }: ProfileFormProps) {
  const expireSession = useExpireSession();

  // 닉네임
  const [nickname, setNickname] = useState(info.nickname);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [nicknameNotice, setNicknameNotice] = useState<string | null>(null);
  const [isSavingNickname, setIsSavingNickname] = useState(false);

  const trimmed = nickname.trim();
  const isChanged = trimmed !== info.nickname;
  const clientError = isChanged ? validateNickname(nickname) : null;
  const canSaveNickname = isChanged && !clientError && !isSavingNickname;

  function handleNicknameChange(value: string) {
    setNickname(value);
    setNicknameError(null);
    setNicknameNotice(null);
  }

  async function handleSaveNickname(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSaveNickname) return;

    setIsSavingNickname(true);
    try {
      await updateMyInfo(accessToken, { nickname: trimmed });
      onUpdated({ nickname: trimmed });
      setNickname(trimmed);
      setNicknameNotice("닉네임을 바꿨어요.");
    } catch (error) {
      if (isSessionExpired(error)) return expireSession();
      // USER409_2(중복)는 서버 문구, COMMON400은 필드 문구
      if (error instanceof ApiError) setNicknameError(error.fieldErrors?.nickname ?? error.message);
      else setNicknameError("닉네임을 바꾸지 못했어요.");
    } finally {
      setIsSavingNickname(false);
    }
  }

  // 위치정보 동의: 누르면 바로 저장
  const [locationAgreed, setLocationAgreed] = useState(info.locationAgreed);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSavingLocation, setIsSavingLocation] = useState(false);

  async function handleToggleLocation() {
    const next = !locationAgreed;
    // 먼저 바꾸고, 실패하면 되돌림
    setLocationAgreed(next);
    setLocationError(null);
    setIsSavingLocation(true);
    try {
      await updateMyInfo(accessToken, { locationAgreed: next });
      onUpdated({ locationAgreed: next });
    } catch (error) {
      setLocationAgreed(!next);
      if (isSessionExpired(error)) return expireSession();
      setLocationError(error instanceof ApiError ? error.message : "설정을 바꾸지 못했어요.");
    } finally {
      setIsSavingLocation(false);
    }
  }

  return (
    <section className="rounded-3xl border border-[#e8e4dc] bg-white p-6">
      <h2 className="text-lg font-bold text-gray-900">
        <span className="mr-2 font-mono text-sm text-[#c4581a]">01</span>프로필
      </h2>

      <form className="mt-5" onSubmit={handleSaveNickname} noValidate>
        <TextField
          id="nickname"
          label="닉네임"
          value={nickname}
          onChange={handleNicknameChange}
          error={nicknameError ?? clientError}
          hint={nicknameNotice ?? "2~16자, 다른 사람과 겹치지 않는 이름"}
          action={
            <button
              type="submit"
              disabled={!canSaveNickname}
              className="h-12 shrink-0 rounded-xl bg-[#ff8a3d] px-4 font-bold text-gray-900 transition-colors hover:bg-[#f57a2a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingNickname ? "저장 중" : "저장"}
            </button>
          }
        />
      </form>

      <hr className="my-6 border-[#e8e4dc]" />

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-bold text-gray-900">
            위치정보 이용 동의 <span className="font-normal text-gray-500">(선택)</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">[위치정보 이용 목적 안내 문구]</p>
          {locationError && (
            <p role="alert" className="mt-1 text-xs text-red-500">
              {locationError}
            </p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={locationAgreed}
          aria-label="위치정보 이용 동의"
          disabled={isSavingLocation}
          onClick={handleToggleLocation}
          className={cn(
            "relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50",
            locationAgreed ? "bg-gray-900" : "bg-[#ddd8ce]",
          )}
        >
          <span
            className={cn(
              "absolute top-1 left-1 h-5 w-5 rounded-full transition-transform",
              locationAgreed ? "translate-x-5 bg-[#ff8a3d]" : "bg-white",
            )}
          />
        </button>
      </div>
    </section>
  );
}
