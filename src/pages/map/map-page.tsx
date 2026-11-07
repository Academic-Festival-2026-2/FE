import { useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useAuthStore } from "../../stores/auth-store";
import type { TimeBand } from "../../api/map";
import { AuthHeader } from "../../components/layout/auth-header";
import { bandLabel, seasonOf, useBoundaries, useDongColors, useMyMap } from "./map-data";
import { MapTooltip } from "./map-tooltip";
import {
  ErrorBanner,
  MapModeToggle,
  RankPanel,
  SeasonChip,
  TimeBandTabs,
  UploadCta,
} from "./map-ui";
import { SvgMap } from "./svg-map";

export function MapPage() {
  const { timeBand, mode } = useSearch({ from: "/map" });
  const navigate = useNavigate();
  const loggedIn = useAuthStore((state) => state.tokens !== null);
  const mine = mode === "mine" && loggedIn;
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const { boundaries, error: boundaryError } = useBoundaries();
  const { dongs, topDongs, season, error: colorError, loading } = useDongColors(timeBand);
  const myMap = useMyMap(mine, timeBand);
  const shownDongs = mine ? myMap.dongs : dongs;
  const shownLoading = mine ? myMap.loading : loading;
  const shownError = mine ? myMap.error : colorError;

  const seasonInfo = seasonOf(season);
  const totalPhotos = [...shownDongs.values()].reduce((sum, dong) => sum + dong.photoCount, 0);
  const title = [seasonInfo?.name, `${bandLabel(timeBand)}의 ${mine ? "내 " : ""}부천`]
    .filter(Boolean)
    .join(" ");
  const hoveredDong = hoveredCode ? shownDongs.get(hoveredCode) : undefined;
  const hoveredGu = boundaries?.features.find(
    (feature) => feature.properties.dongCode === hoveredCode,
  )?.properties.guName;

  function changeTimeBand(value: TimeBand) {
    navigate({ to: "/map", search: (prev) => ({ ...prev, timeBand: value }), replace: true });
  }

  function changeMode(nextMine: boolean) {
    if (nextMine && !loggedIn) {
      navigate({ to: "/login" });
      return;
    }
    navigate({ to: "/map", search: { timeBand, mode: nextMine ? "mine" : undefined } });
  }

  return (
    <div className="min-h-screen bg-[#f7f5f0]">
      <AuthHeader>
        {loggedIn ? (
          <Link to="/mypage" className="text-sm font-bold text-gray-900 hover:text-[#b5470e]">
            내 정보
          </Link>
        ) : (
          <div className="flex items-center gap-3 text-sm">
            <Link to="/login" className="text-[#55524c] hover:text-gray-900">
              로그인
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-[#ff8a3d] px-3 py-1.5 font-bold text-gray-900 hover:bg-[#f57a2a]"
            >
              회원가입
            </Link>
          </div>
        )}
      </AuthHeader>
      <main className="mx-auto w-full max-w-[1192px] px-4 pt-7 pb-12">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="flex min-w-0 flex-col rounded-3xl border border-[#e8e4dc] bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-[26px] font-extrabold text-gray-900">{title}</h1>
                <p className="mt-1 text-sm text-gray-500">
                  {mine
                    ? `내 사진 ${totalPhotos}장 · 칠한 동 ${myMap.filledCount}/${shownDongs.size}곳`
                    : `사진 ${totalPhotos.toLocaleString()}장 · 동 ${shownDongs.size}곳`}
                </p>
              </div>
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
                    navigate({ to: "/dong/$dongCode", params: { dongCode }, search: { timeBand } })
                  }
                  tooltip={
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

            <p className="mt-2 text-xs text-gray-500">
              동에 마우스를 올리면 그 동만 선명해지고, 누르면 확대돼요
            </p>
          </section>

          <aside
            className={`flex flex-col gap-4 transition-opacity ${loading ? "opacity-50" : ""}`}
          >
            {!mine && (
              <RankPanel
                timeBand={timeBand}
                season={seasonInfo}
                topDongs={topDongs}
                onHover={setHoveredCode}
              />
            )}
            <UploadCta />
          </aside>
        </div>
      </main>
    </div>
  );
}
