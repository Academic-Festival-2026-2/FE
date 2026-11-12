import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useAuthStore } from "../../stores/auth-store";
import { peekReturnFrom, prepareDongTransition } from "../../utils/view-transition";
import type { TimeBand } from "../../api/map";
import { AuthHeader } from "../../components/layout/auth-header";
import { ProfileMenu } from "../../components/layout/profile-menu";
import { UploadButton } from "../../components/layout/upload-button";
import { REGION_NAME, bandLabel, seasonOf, useBoundaries, useDongColors, useMyMap } from "./map-data";
import { MapTooltip } from "./map-tooltip";
import { LoginPromptDialog } from "./login-prompt-dialog";
import {
  ErrorBanner,
  MapModeToggle,
  EmptyMyMapCard,
  MapTitlePanel,
  MyMapGuidePanel,
  RankPanel,
  TimeBandBar,
  MyMapPanel,
} from "./map-ui";
import { MapLoading } from "./map-loading";
import { SvgMap } from "./svg-map";

// 시간대 탭 순서 (지도 아래 바 왼쪽부터)
const BAND_ORDER: TimeBand[] = ["DAWN", "DAY", "SUNSET", "NIGHT"];

export function MapPage() {
  const { timeBand, mode } = useSearch({ from: "/map" });
  const navigate = useNavigate();
  const loggedIn = useAuthStore((state) => state.tokens !== null);
  const mine = mode === "mine" && loggedIn;
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  // 지도 색이 번져 나가는 방향: 시간대 탭이나 지도 종류 토글이 오른쪽으로 가면 왼쪽 → 오른쪽, 왼쪽으로 가면 반대
  // (직전 값과 비교해 바뀌는 순간 방향을 정함. 렌더 중 이전 값 비교는 React 권장 방식)
  const [wave, setWave] = useState<{ timeBand: TimeBand; mine: boolean; direction: "ltr" | "rtl" }>(
    { timeBand, mine, direction: "ltr" },
  );
  if (wave.timeBand !== timeBand || wave.mine !== mine) {
    const forward =
      wave.timeBand !== timeBand
        ? BAND_ORDER.indexOf(timeBand) > BAND_ORDER.indexOf(wave.timeBand)
        : mine;
    setWave({ timeBand, mine, direction: forward ? "ltr" : "rtl" });
  }
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  // 동을 눌러 그 동으로 확대하는 중 (지도 위 패널을 숨기고 동 상세로 넘어갈 준비)
  // 동 상세에서 돌아왔으면 그 동 (지도가 그 동에서 줄어들며 시작)
  const [returnFrom] = useState(peekReturnFrom);
  const [leaving, setLeaving] = useState(returnFrom !== null);
  // 지도를 못 그리는 경우(경계 불러오기 실패 등)에도 패널이 숨겨진 채 남지 않게
  useEffect(() => {
    if (!returnFrom) return;
    const timer = window.setTimeout(() => setLeaving(false), 1200);
    return () => window.clearTimeout(timer);
  }, [returnFrom]);
  // 지도 카드 (동을 누르면 svg-map이 이 크기에서 화면 전체로 커지며 확대)
  const stageRef = useRef<HTMLElement>(null);
  // 숨길 때는 바로 숨김(유리 패널의 backdrop-filter가 움직이는 지도 위에서 무거움), 다시 보일 때만 서서히
  const leaveFade = leaving ? "invisible opacity-0" : "opacity-100 transition-opacity duration-300";
  const { boundaries, error: boundaryError } = useBoundaries();
  const { dongs, topDongs, season, error: colorError, loading } = useDongColors(timeBand);
  const myMap = useMyMap(mine, timeBand);
  const shownDongs = mine ? myMap.dongs : dongs;
  const shownLoading = mine ? myMap.loading : loading;
  const shownError = mine ? myMap.error : colorError;
  // 내 지도인데 어느 시간대에도 칠한 칸이 없으면 안내 카드·패널을 보여 줌
  const myMapEmpty = mine && myMap.empty;

  const seasonInfo = seasonOf(season);
  const totalPhotos = [...shownDongs.values()].reduce((sum, dong) => sum + dong.photoCount, 0);
  const filledCount = mine
    ? myMap.filledCount
    : [...shownDongs.values()].filter((dong) => dong.dominantColor).length;
  const hoveredDong = hoveredCode ? shownDongs.get(hoveredCode) : undefined;
  const hoveredGu = boundaries?.features.find(
    (feature) => feature.properties.dongCode === hoveredCode,
  )?.properties.guName;

  function changeTimeBand(value: TimeBand) {
    navigate({ to: "/map", search: (prev) => ({ ...prev, timeBand: value }), replace: true });
  }

  function changeMode(nextMine: boolean) {
    if (nextMine && !loggedIn) {
      setLoginPromptOpen(true);
      return;
    }
    navigate({ to: "/map", search: { timeBand, mode: nextMine ? "mine" : undefined } });
  }

  return (
    <div className="min-h-screen bg-page">
      <AuthHeader>
        {loggedIn ? (
          // 사진 올리기는 오른쪽 위 프로필 옆에 둠 (오른쪽 칸의 업로드 카드 대신)
          <div className="flex items-center gap-4">
            <UploadButton />
            <ProfileMenu />
          </div>
        ) : (
          <div className="flex items-center gap-4 text-sm">
            <Link to="/login" className="text-ink-sub underline underline-offset-4 hover:text-ink">
              로그인
            </Link>
            <Link
              to="/signup"
              className="flex h-10 items-center rounded-[10px] bg-brand px-4 font-bold text-white transition-colors hover:bg-brand-hover"
            >
              회원가입
            </Link>
          </div>
        )}
      </AuthHeader>
      <main className="mx-auto w-full max-w-[1440px] px-5 pt-4 pb-12 sm:px-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* 지도를 카드에 꽉 채우고 조작부는 유리 패널로 위에 띄움 (피그마 "지도 카드 · D2") */}
          {/* 동을 누르면 이 카드 크기에서 지도가 화면 전체로 커지며 동으로 확대됨 (svg-map) */}
          <section
            ref={stageRef}
            className="relative h-[560px] min-w-0 overflow-hidden rounded-[20px] border border-card-line bg-white sm:h-[680px]"
          >
            <div
              className={`absolute -top-[22px] right-0 -bottom-[48px] left-0 transition-opacity ${shownLoading ? "opacity-50" : ""}`}
            >
              {boundaries && (
                <SvgMap
                  boundaries={boundaries}
                  dongs={shownDongs}
                  hoveredCode={hoveredCode}
                  onHover={setHoveredCode}
                  stageRef={stageRef}
                  fillWave={wave.direction}
                  returnFrom={returnFrom}
                  onReturnEnd={() => setLeaving(false)}
                  onSelectStart={() => setLeaving(true)}
                  onSelect={(dongCode) =>
                    navigate({
                      to: "/dong/$dongCode",
                      params: { dongCode },
                      search: { timeBand, mode },
                      // 확대가 끝난 화면과 동 상세가 같은 모습이라 아주 짧게만 겹쳐 바꿈 (미지원·동작 줄이기면 바로 이동)
                      viewTransition: prepareDongTransition(),
                    })
                  }
                  controlsClassName="right-6 bottom-[72px]"
                  tooltip={
                    !shownLoading &&
                    hoveredDong && (
                      <MapTooltip
                        dong={hoveredDong}
                        guName={hoveredGu ?? ""}
                        bandLabel={`${mine ? "내 " : ""}${bandLabel(timeBand)}`}
                        hint="눌러서 확대 →"
                      />
                    )
                  }
                />
              )}
            </div>

            {/* 경계·색을 받는 중 (오류면 오류 배너만) */}
            <MapLoading
              show={!leaving && ((!boundaries && !boundaryError) || (shownLoading && !shownError))}
            />

            {/* 동으로 확대하는 동안 지도 위 패널은 숨김 */}
            <div className={`absolute top-[23px] left-[23px] ${leaveFade}`}>
              {/* 공유·내 지도는 옆 토글이 알려 주므로 제목은 같게 */}
              <MapTitlePanel title={`${REGION_NAME}의 ${bandLabel(timeBand)}`}>
                {mine ? "칠한 동 " : "칠해진 동 "}
                <b className="text-ink">
                  {filledCount}/{shownDongs.size}
                </b>
                {mine ? " · 내 사진 " : " · 사진 "}
                <b className="text-ink">{totalPhotos.toLocaleString()}</b>장
              </MapTitlePanel>
              <div className="mt-2 flex">
                <MapModeToggle mine={mine} onChange={changeMode} />
              </div>
              <div className="mt-2 max-w-[360px]">
                <ErrorBanner message={boundaryError ?? shownError} />
              </div>
            </div>


            {/* 피그마처럼 카드 정중앙보다 30px 아래 (지도 가운데 근처) */}
            {myMapEmpty && (
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 sm:top-[calc(50%+30px)] ${leaveFade}`}>
                <EmptyMyMapCard />
              </div>
            )}

            <div className={`absolute bottom-[27px] left-1/2 w-max -translate-x-1/2 ${leaveFade}`}>
              <TimeBandBar season={season} timeBand={timeBand} onChange={changeTimeBand} />
            </div>
          </section>

          <aside
            className={`flex flex-col gap-4 transition-opacity ${shownLoading ? "opacity-50" : ""}`}
          >
            {myMapEmpty ? (
              <MyMapGuidePanel regionName={REGION_NAME} dongCount={shownDongs.size || 37} />
            ) : mine ? (
              <MyMapPanel
                timeBand={timeBand}
                dongs={[...shownDongs.values()]}
                onHover={setHoveredCode}
              />
            ) : (
              <RankPanel
                timeBand={timeBand}
                season={seasonInfo}
                topDongs={topDongs}
                onHover={setHoveredCode}
              />
            )}
          </aside>
        </div>
        <LoginPromptDialog open={loginPromptOpen} onClose={() => setLoginPromptOpen(false)} />
      </main>
    </div>
  );
}
