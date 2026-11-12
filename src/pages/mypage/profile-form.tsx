import { useState, type FormEvent } from "react";
import { ApiError } from "../../api/client";
import { updateMyInfo, type MyInfoResponse } from "../../api/user";
import { TextField } from "../../components/form/text-field";
import { TermsDialog } from "../../components/terms-dialog";
import { LOCATION_TERMS } from "../../constants/terms/location-terms";
import { isSessionExpired, useExpireSession } from "../../hooks/use-expire-session";
import { cn } from "../../utils/cn";
import { validateNickname } from "../../utils/validation";

type ProfileFormProps = {
  info: MyInfoResponse;
  onUpdated: (changes: Partial<MyInfoResponse>) => void;
};

export function ProfileForm({ info, onUpdated }: ProfileFormProps) {
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
      await updateMyInfo({ nickname: trimmed });
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
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  async function handleToggleLocation() {
    const next = !locationAgreed;
    // 먼저 바꾸고, 실패하면 되돌림
    setLocationAgreed(next);
    setLocationError(null);
    setIsSavingLocation(true);
    try {
      await updateMyInfo({ locationAgreed: next });
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
    <section className="rounded-2xl border border-card-line bg-white px-6 py-5">
      <h2 className="flex items-baseline gap-2.5 text-[17px] leading-[25px] font-bold text-ink">
        <span className="font-mono text-xs font-normal text-brand-strong">01</span>프로필
      </h2>

      <form className="mt-3.5" onSubmit={handleSaveNickname} noValidate>
        <TextField
          id="nickname"
          size="sm"
          label="닉네임"
          value={nickname}
          onChange={handleNicknameChange}
          error={nicknameError ?? clientError}
          hint={nicknameNotice ?? "2~16자, 다른 사람과 겹치지 않는 이름"}
          action={
            <button
              type="submit"
              disabled={!canSaveNickname}
              className="h-10 shrink-0 rounded-[10px] bg-brand px-4 text-sm font-bold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingNickname ? "저장 중" : "저장"}
            </button>
          }
        />
      </form>

      <hr className="my-6 border-divider" />

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-ink">
            위치정보 이용 동의 <span className="text-ink-muted">(선택)</span>
          </p>
          <p className="mt-1.5 text-xs leading-[18px] text-ink-muted">
            사진이 찍힌 동을 찾고, 공유 지도 색칠과 지도의 사진 위치 점 표시에 써요.{" "}
            <button
              type="button"
              onClick={() => setIsTermsOpen(true)}
              className="whitespace-nowrap text-ink-muted underline underline-offset-4 hover:text-ink"
            >
              약관 보기
            </button>
          </p>
          {locationError && (
            <p role="alert" className="mt-1 text-xs text-danger">
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
            "relative h-[26px] w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
            locationAgreed ? "bg-brand" : "bg-[#c5ccda]",
          )}
        >
          <span
            className={cn(
              "absolute top-[3px] left-[3px] size-5 rounded-full bg-white transition-transform",
              locationAgreed && "translate-x-[18px]",
            )}
          />
        </button>
      </div>

      {isTermsOpen && <TermsDialog term={LOCATION_TERMS} onClose={() => setIsTermsOpen(false)} />}
    </section>
  );
}
