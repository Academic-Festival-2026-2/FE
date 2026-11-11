import { useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import { getMyInfo, type MyInfoResponse } from "../../api/user";
import { AuthHeader } from "../../components/layout/auth-header";
import { isSessionExpired, useExpireSession } from "../../hooks/use-expire-session";
import { useUserStore } from "../../stores/user-store";
import { AccountSection } from "./account-section";
import { PasswordForm } from "./password-form";
import { ProfileForm } from "./profile-form";
import { ProfileSummary } from "./profile-summary";

export function MyPage() {
  const expireSession = useExpireSession();
  const [info, setInfo] = useState<MyInfoResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // 화면을 떠난 뒤 도착한 응답은 무시
    let ignore = false;
    getMyInfo()
      .then((data) => {
        if (ignore) return;
        setInfo(data);
        // 헤더 프로필 메뉴도 최신 정보로
        useUserStore.getState().setMe(data);
      })
      .catch((error: unknown) => {
        if (ignore) return;
        if (isSessionExpired(error)) expireSession();
        else setLoadError(error instanceof ApiError ? error.message : "내 정보를 불러오지 못했어요.");
      });
    return () => {
      ignore = true;
    };
  }, [expireSession]);

  // 수정 API는 결과를 돌려주지 않아서 보낸 값으로 화면을 갱신
  function handleUpdated(changes: Partial<MyInfoResponse>) {
    setInfo((prev) => (prev ? { ...prev, ...changes } : prev));
    useUserStore.getState().updateMe(changes);
  }

  return (
    // 공통 헤더(별도 이슈)가 생기면 AuthHeader 자리를 AppLayout으로 교체
    <div className="min-h-screen bg-page">
      <AuthHeader />
      {/* 본문 폭 1160px(양옆 여백 16px 포함 1192px) */}
      <main className="mx-auto w-full max-w-[1192px] px-4 pt-4 pb-12">
        {/* 업로드 화면 "UPLOAD / 사진 한 장, 픽셀 하나"와 같은 크기·굵기 */}
        <p className="mt-2 font-mono text-[13px] tracking-[1.04px] text-brand-strong">MY PAGE</p>
        <h1 className="mt-3 text-[30px] font-extrabold tracking-[-0.9px] text-ink">마이페이지</h1>

        {loadError && (
          <p role="alert" className="mt-6 text-sm text-[#c2402f]">
            {loadError}
          </p>
        )}
        {!info && !loadError && <p className="mt-6 text-sm text-ink-muted">불러오는 중...</p>}
        {info && (
          <div className="mt-4 flex flex-col gap-4">
            <ProfileSummary info={info} onUpdated={handleUpdated} />
            {/* 피그마 비율 프로필 516 : 비밀번호 628, 두 카드 높이는 같게(stretch) */}
            <div className="grid gap-4 md:grid-cols-[minmax(0,516fr)_minmax(0,628fr)]">
              <ProfileForm info={info} onUpdated={handleUpdated} />
              <PasswordForm />
            </div>
            <AccountSection />
          </div>
        )}
      </main>
    </div>
  );
}
