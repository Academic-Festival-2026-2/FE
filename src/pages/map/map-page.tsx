import { useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useAuthStore } from "../../stores/auth-store";
import type { TimeBand } from "../../api/map";
import { AuthHeader } from "../../components/layout/auth-header";
import { ProfileMenu } from "../../components/layout/profile-menu";
import { bandLabel, seasonOf, useBoundaries, useDongColors, useMyMap } from "./map-data";
import { MapTooltip } from "./map-tooltip";
import { LoginPromptDialog } from "./login-prompt-dialog";
import {
  ErrorBanner,
  MapModeToggle,
  MapTitlePanel,
  RankPanel,
  SeasonTimeBar,
  MyMapPanel,
} from "./map-ui";
import { SvgMap } from "./svg-map";

// 지도 제목에 들어가는 지역 이름. 경기도 전체로 확장하면 고른 지역 값으로 바꿀 자리
const REGION_NAME = "부천";

export function MapPage() {
  const { timeBand, mode } = useSearch({ from: "/map" });
  const navigate = useNavigate();
  const loggedIn = useAuthStore((state) => state.tokens !== null);
  const mine = mode === "mine" && loggedIn;
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const { boundaries, error: boundaryError } = useBoundaries();
  const { dongs, topDongs, season, error: colorError, loading } = useDongColors(timeBand);
  const myMap = useMyMap(mine, timeBand);
  const shownDongs = mine ? myMap.dongs : dongs;
  const shownLoading = mine ? myMap.loading : loading;
  const shownError = mine ? myMap.error : colorError;

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
            <Link
              to="/upload"
              className="flex h-10 items-center rounded-[10px] bg-brand px-4 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
            >
              사진 업로드
            </Link>
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
          <section className="relative h-[560px] min-w-0 overflow-hidden rounded-[20px] border border-card-line bg-white sm:h-[680px]">
            <div
              className={`absolute -top-[22px] right-0 -bottom-[48px] left-0 transition-opacity sm:right-10 ${shownLoading ? "opacity-50" : ""}`}
            >
              {boundaries && (
                <SvgMap
                  boundaries={boundaries}
                  dongs={shownDongs}
                  hoveredCode={hoveredCode}
                  onHover={setHoveredCode}
                  onSelect={(dongCode) =>
                    navigate({
                      to: "/dong/$dongCode",
                      params: { dongCode },
                      search: { timeBand, mode },
                    })
                  }
                  controlsClassName="right-6 bottom-[72px] sm:-right-4"
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

            <div className="absolute top-[23px] left-[23px]">
              {/* 공유·내 지도는 옆 토글이 알려 주므로 제목은 같게 */}
              <MapTitlePanel title={`${REGION_NAME}의 ${bandLabel(timeBand)}`}>
                {mine ? "칠한 동 " : "칠해진 동 "}
                <b className="text-ink">
                  {filledCount}/{shownDongs.size}
                </b>
                {mine ? " · 내 사진 " : " · 사진 "}
                <b className="text-ink">{totalPhotos.toLocaleString()}</b>장
              </MapTitlePanel>
              <div className="mt-2 max-w-[360px]">
                <ErrorBanner message={boundaryError ?? shownError} />
              </div>
            </div>

            <div className="absolute top-[23px] right-6 max-sm:top-[106px] max-sm:right-auto max-sm:left-[23px]">
              <MapModeToggle mine={mine} onChange={changeMode} />
            </div>

            <div className="absolute bottom-[27px] left-1/2 w-max -translate-x-1/2">
              <SeasonTimeBar season={season} timeBand={timeBand} onTimeBandChange={changeTimeBand} />
            </div>
          </section>

          <aside
            className={`flex flex-col gap-4 transition-opacity ${shownLoading ? "opacity-50" : ""}`}
          >
            {mine ? (
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
