import { useState } from "react";
import { ApiError } from "../../api/client";
import { updateMyInfo, type MyInfoResponse } from "../../api/user";
import { TermsDialog } from "../../components/terms-dialog";
import { LOCATION_TERMS } from "../../constants/terms/location-terms";
import { isSessionExpired, useExpireSession } from "../../hooks/use-expire-session";
import { useLogout } from "../../hooks/use-logout";
import { cn } from "../../utils/cn";
import { PasswordDialog } from "./password-dialog";
import { WithdrawDialog } from "./withdraw-dialog";

type SettingsSectionProps = {
  info: MyInfoResponse;
  onUpdated: (changes: Partial<MyInfoResponse>) => void;
};

const ROW = "flex items-center justify-between gap-4 border-b border-divider py-3.5";

// 설정: 비밀번호 변경(팝업), 위치정보 동의(바로 저장), 로그아웃·회원 탈퇴
export function SettingsSection({ info, onUpdated }: SettingsSectionProps) {
  const expireSession = useExpireSession();
  const { logout, isLoggingOut } = useLogout();
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  // 위치정보 동의: 누르면 바로 저장. 먼저 바꾸고, 실패하면 되돌림
  const [locationAgreed, setLocationAgreed] = useState(info.locationAgreed);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSavingLocation, setIsSavingLocation] = useState(false);

  async function handleToggleLocation() {
    const next = !locationAgreed;
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
    <section className="rounded-2xl border border-card-line bg-white px-6 pt-5 pb-2">
      <h2 className="text-[17px] leading-[25px] font-bold text-ink">설정</h2>

      <button
        type="button"
        onClick={() => setIsPasswordOpen(true)}
        className={cn(ROW, "mt-2 w-full text-left text-sm font-bold text-ink transition-colors hover:text-brand-strong")}
      >
        비밀번호 변경
        <span aria-hidden className="text-lg leading-none font-normal text-ink-muted">
          ›
        </span>
      </button>

      <div className={ROW}>
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">
            위치정보 이용 동의 <span className="font-normal text-ink-muted">(선택)</span>
          </p>
          <p className="mt-1 text-xs leading-[18px] text-ink-muted">
            사진이 찍힌 동을 찾고, 공유 지도 색칠과 지도의 사진 위치 점 표시에 써요.{" "}
            <button
              type="button"
              onClick={() => setIsTermsOpen(true)}
              className="whitespace-nowrap underline underline-offset-4 hover:text-ink"
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

      <div className="flex items-center justify-between gap-4 py-3.5">
        <button
          type="button"
          onClick={logout}
          disabled={isLoggingOut}
          className="text-sm font-bold text-ink-sub transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
        </button>
        <button
          type="button"
          onClick={() => setIsWithdrawOpen(true)}
          className="text-[13px] text-danger transition-colors hover:underline hover:underline-offset-4"
        >
          회원 탈퇴
        </button>
      </div>

      {isPasswordOpen && <PasswordDialog onClose={() => setIsPasswordOpen(false)} />}
      {isTermsOpen && <TermsDialog term={LOCATION_TERMS} onClose={() => setIsTermsOpen(false)} />}
      <WithdrawDialog open={isWithdrawOpen} onClose={() => setIsWithdrawOpen(false)} />
    </section>
  );
}
