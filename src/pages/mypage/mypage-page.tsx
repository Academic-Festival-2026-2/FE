import { useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import { getMyInfo, type MyInfoResponse } from "../../api/user";
import { AuthHeader } from "../../components/layout/auth-header";
import { isSessionExpired, useExpireSession } from "../../hooks/use-expire-session";
import { useAuthStore } from "../../stores/auth-store";
import { ProfileForm } from "./profile-form";
import { ProfileSummary } from "./profile-summary";

export function MyPage() {
  const accessToken = useAuthStore((state) => state.tokens?.accessToken);
  const expireSession = useExpireSession();
  const [info, setInfo] = useState<MyInfoResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    // 화면을 떠난 뒤 도착한 응답은 무시
    let ignore = false;
    getMyInfo(accessToken)
      .then((data) => {
        if (!ignore) setInfo(data);
      })
      .catch((error: unknown) => {
        if (ignore) return;
        if (isSessionExpired(error)) expireSession();
        else setLoadError(error instanceof ApiError ? error.message : "내 정보를 불러오지 못했어요.");
      });
    return () => {
      ignore = true;
    };
  }, [accessToken, expireSession]);

  // 수정 API는 결과를 돌려주지 않아서 보낸 값으로 화면을 갱신
  function handleUpdated(changes: Partial<MyInfoResponse>) {
    setInfo((prev) => (prev ? { ...prev, ...changes } : prev));
  }

  return (
    // 공통 헤더(별도 이슈)가 생기면 AuthHeader 자리를 AppLayout으로 교체
    <div className="min-h-screen bg-[#f7f5f0]">
      <AuthHeader />
      <main className="mx-auto w-full max-w-[1160px] px-4 py-8">
        <p className="font-mono text-xs tracking-widest text-[#c4581a]">MY PAGE</p>
        <h1 className="mt-2 text-3xl font-extrabold text-gray-900">마이페이지</h1>
        <p className="mt-2 text-sm text-gray-600">내 정보와 계정 설정을 관리해요.</p>

        {loadError && (
          <p role="alert" className="mt-6 text-sm text-red-500">
            {loadError}
          </p>
        )}
        {!info && !loadError && <p className="mt-6 text-sm text-gray-500">불러오는 중...</p>}
        {info && accessToken && (
          <div className="mt-5 flex flex-col gap-4">
            <ProfileSummary info={info} />
            <div className="grid items-start gap-4 md:grid-cols-2">
              <ProfileForm accessToken={accessToken} info={info} onUpdated={handleUpdated} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
