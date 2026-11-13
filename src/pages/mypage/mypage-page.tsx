import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../api/client";
import { getMyBadges, type MyBadges } from "../../api/badge";
import { getMyMap, type MyMap } from "../../api/mymap";
import { getMyInfo, type MyInfoResponse } from "../../api/user";
import { AuthHeader } from "../../components/layout/auth-header";
import { isSessionExpired, useExpireSession } from "../../hooks/use-expire-session";
import { useUserStore } from "../../stores/user-store";
import { BadgeSection } from "./badge-section";
import { DEFAULT_REGION, DEFAULT_SEASON } from "./my-map-filters";
import { summarizeMyMap } from "./my-map-stats";
import { MyMapProgressSection } from "./my-map-progress-section";
import { ProfileSummary } from "./profile-summary";
import { RecentPhotosSection } from "./recent-photos-section";
import { SettingsSection } from "./settings-section";
import { ShareSection } from "./share-section";

// 활동 중심 마이페이지 (#86): 요약 → 내 사진 → 나의 지도 현황 → 활동 배지 → 나의 지도 공유 → 설정
export function MyPage() {
  const expireSession = useExpireSession();
  const [info, setInfo] = useState<MyInfoResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // 요약 카드 숫자(칠한 동·배지)와 아래 영역이 같이 쓰는 데이터
  // 나의 지도 현황에서 고른 지역·계절 (지금은 부천·가을만)
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [season, setSeason] = useState(DEFAULT_SEASON);
  const [myMap, setMyMap] = useState<{ key: string; data: MyMap } | null>(null);
  const [myMapErrorKey, setMyMapErrorKey] = useState<string | null>(null);
  const [badges, setBadges] = useState<MyBadges | null>(null);
  const [badgesError, setBadgesError] = useState(false);

  useEffect(() => {
    // 화면을 떠난 뒤 도착한 응답은 무시
    let ignore = false;
    const handleError = (error: unknown, onOther: () => void) => {
      if (ignore) return;
      if (isSessionExpired(error)) expireSession();
      else onOther();
    };

    getMyInfo()
      .then((data) => {
        if (ignore) return;
        setInfo(data);
        // 헤더 프로필 메뉴도 최신 정보로
        useUserStore.getState().setMe(data);
      })
      .catch((error: unknown) =>
        handleError(error, () =>
          setLoadError(error instanceof ApiError ? error.message : "내 정보를 불러오지 못했어요."),
        ),
      );
    getMyBadges()
      .then((data) => {
        if (!ignore) setBadges(data);
      })
      .catch((error: unknown) => handleError(error, () => setBadgesError(true)));

    return () => {
      ignore = true;
    };
  }, [expireSession]);

  // 지역·계절이 바뀌면 나의 지도를 다시 받음
  const myMapKey = `${region}:${season}`;
  useEffect(() => {
    let ignore = false;
    getMyMap({ season, regionCode: region })
      .then((data) => {
        if (!ignore) setMyMap({ key: `${region}:${season}`, data });
      })
      .catch((error: unknown) => {
        if (ignore) return;
        if (isSessionExpired(error)) expireSession();
        else setMyMapErrorKey(`${region}:${season}`);
      });
    return () => {
      ignore = true;
    };
  }, [region, season, expireSession]);

  // 지금 고른 지역·계절의 응답만 사용 (바꾸는 중에는 불러오는 중으로)
  const currentMyMap = myMap?.key === myMapKey ? myMap.data : null;
  const stats = useMemo(() => (currentMyMap ? summarizeMyMap(currentMyMap) : null), [currentMyMap]);
  const earnedBadges = badges ? badges.badges.filter((badge) => badge.earned).length : null;

  // 수정 API는 결과를 돌려주지 않아서 보낸 값으로 화면을 갱신
  function handleUpdated(changes: Partial<MyInfoResponse>) {
    setInfo((prev) => (prev ? { ...prev, ...changes } : prev));
    useUserStore.getState().updateMe(changes);
  }

  return (
    <div className="min-h-screen bg-page">
      {/* 사진 업로드는 "내 사진" 영역에 있어서 헤더 업로드 버튼은 두지 않음 */}
      <AuthHeader />
      {/* 본문 폭 1160px(양옆 여백 16px 포함 1192px), 다른 화면과 비슷한 폭 */}
      <main className="mx-auto w-full max-w-[1192px] px-4 pt-4 pb-12">
        <p className="mt-2 font-mono text-[13px] tracking-[1.04px] text-brand-strong">MY PAGE</p>
        <h1 className="mt-3 text-[30px] font-extrabold tracking-[-0.9px] text-ink">마이페이지</h1>

        {loadError && (
          <p role="alert" className="mt-6 text-sm text-danger">
            {loadError}
          </p>
        )}
        {!info && !loadError && <p className="mt-6 text-sm text-ink-muted">불러오는 중...</p>}
        {info && (
          <div className="mt-4 flex flex-col gap-4">
            <ProfileSummary
              info={info}
              filledDongs={stats ? stats.filledDongs : null}
              earnedBadges={earnedBadges}
              onUpdated={handleUpdated}
            />
            <RecentPhotosSection />
            {/* PC(1024px 이상)에서는 두 칸, 그보다 좁으면 한 줄. 같은 줄 카드는 높이를 맞춤 */}
            <div className="grid gap-4 lg:grid-cols-2">
              <MyMapProgressSection
                stats={stats}
                error={myMapErrorKey === myMapKey}
                region={region}
                season={season}
                onRegionChange={setRegion}
                onSeasonChange={setSeason}
              />
              <BadgeSection data={badges} error={badgesError} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <ShareSection />
              <SettingsSection info={info} onUpdated={handleUpdated} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
