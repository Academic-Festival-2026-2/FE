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
  RankPanel,
  SeasonChip,
  TimeBandTabs,
  MyMapPanel,
} from "./map-ui";
import { SvgMap } from "./svg-map";

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
          <section className="flex min-w-0 flex-col rounded-[20px] border border-card-line bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <h1 className="text-[26px] font-extrabold tracking-[-0.78px] text-ink">부천시</h1>
              <div className="flex flex-wrap items-center gap-2">
                <TimeBandTabs value={timeBand} onChange={changeTimeBand} />
                {seasonInfo && <SeasonChip season={seasonInfo} />}
              </div>
            </div>

            <div className="mt-4">
              <MapModeToggle mine={mine} onChange={changeMode} />
            </div>

            <div
              className={`relative mt-2 h-[560px] transition-opacity ${shownLoading ? "opacity-50" : ""}`}
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
              <div className="absolute left-2 top-2">
                <ErrorBanner message={boundaryError ?? shownError} />
              </div>
            </div>

            <p className="mt-2 text-xs text-ink-muted">
              {mine ? "색칠된 동 = 내가 사진을 올린 동" : "동에 마우스를 올리면 그 동만 선명해지고, 누르면 확대돼요"}
            </p>
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
