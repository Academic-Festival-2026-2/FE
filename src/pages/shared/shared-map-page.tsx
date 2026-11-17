import { useCallback, useMemo, useState } from "react";
import { getRouteApi, Link } from "@tanstack/react-router";
import type { SeasonType, TimeBand } from "../../api/map";
import { AuthHeader } from "../../components/layout/auth-header";
import { bandLabel, seasonOf, useRegionBoundaries, useRegionList, useSharedMap } from "../map/map-data";
import { fitView, regionAt, regionsInView, unproject, type View } from "../map/map-geometry";
import { MapLoading } from "../map/map-loading";
import { MapTooltip } from "../map/map-tooltip";
import { ErrorBanner, MapTitlePanel, TimeBandBar } from "../map/map-ui";
import { SvgMap } from "../map/svg-map";
import { Avatar } from "../../components/avatar";
import { preferredSeason, rememberSeason } from "../../utils/season";

const route = getRouteApi("/shared/$shareKey");

// 다른 공유 링크로 바로 넘어가도 앞 사람의 칸·오류(notFound)가 남지 않게, 키마다 화면을 새로 만듦
export function SharedMapPage() {
  const { shareKey } = route.useParams();
  return <SharedMap key={shareKey} shareKey={shareKey} />;
}

// 공유받은 나의 지도 (로그인 없이, 보기만). 메인 지도와 같은 경기도 지도에 공유한 사람이 칠한 동만 색칠
function SharedMap({ shareKey }: { shareKey: string }) {
  const { timeBand, season: urlSeason } = route.useSearch();
  const selectedSeason = preferredSeason(urlSeason);
  const navigate = route.useNavigate();
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);

  const { regionList, error: regionError } = useRegionList();
  // 첫 화면: 기본 지역(부천)이 꽉 차게
  const homeView = useMemo(() => {
    const start = regionList?.regions.find((r) => r.regionCode === regionList.defaultRegionCode);
    return start ? fitView(start.bbox) : null;
  }, [regionList]);
  const [view, setView] = useState<View | null>(null);
  const shownView = view ?? homeView;
  // 화면 가운데 지역 (제목 기준)
  const [centerCode, setCenterCode] = useState<string | null>(null);
  const currentCode = centerCode ?? regionList?.defaultRegionCode ?? null;
  // 화면에 보이는 지역 (가운데 지역을 맨 앞에)
  const visibleCodes = useMemo(() => {
    if (!regionList || !shownView) return [];
    const codes = regionsInView(regionList.regions, shownView);
    return currentCode && codes.includes(currentCode)
      ? [currentCode, ...codes.filter((c) => c !== currentCode)]
      : codes;
  }, [regionList, shownView, currentCode]);
  const { regions, error: boundaryError } = useRegionBoundaries(visibleCodes);
  const shared = useSharedMap(shareKey, timeBand, visibleCodes, selectedSeason);

  // 화면 이동이 멈추면 가운데 지역을 다시 정함 (공유 화면은 주소에 지역을 남기지 않음)
  const handleViewChange = useCallback(
    (next: View) => {
      setView(next);
      const code = regionAt(regions, unproject([next.x + next.size / 2, next.y + next.size / 2]));
      if (code) setCenterCode(code);
    },
    [regions],
  );

  function changeSeason(value: SeasonType) {
    rememberSeason(value);
    navigate({ search: (prev) => ({ ...prev, season: value }), replace: true });
  }

  function changeTimeBand(value: TimeBand) {
    navigate({ search: (prev) => ({ ...prev, timeBand: value }), replace: true });
  }

  const currentRegion = regionList?.regions.find((r) => r.regionCode === currentCode);
  const filledCount = [...shared.dongsOf(currentCode).values()].filter((dong) => dong.dominantColor).length;
  const hoveredDong = hoveredCode ? shared.dongs.get(hoveredCode) : undefined;
  const hoveredGu = regions
  .flatMap((b) => b.features)
  .find((feature) => feature.properties.dongCode === hoveredCode)?.properties.guName;

  // 공유를 껐거나 없는 링크
  if (shared.notFound) {
    return (
      <div className="min-h-screen bg-page">
        <AuthHeader />
        <main className="mx-auto flex max-w-[480px] flex-col items-center px-5 pt-24 text-center">
          <h1 className="text-xl font-extrabold text-ink">공유가 끝났거나 없는 지도예요</h1>
          <p className="mt-2 text-sm text-ink-sub">공유한 사람이 공유를 껐거나 링크가 잘못됐을 수 있어요.</p>
          <Link
            to="/map"
            search={{ timeBand, season: selectedSeason }}
            className="mt-6 flex h-11 items-center rounded-[10px] bg-brand px-5 font-bold text-white transition-colors hover:bg-brand-hover"
          >
            지도 둘러보기
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page">
      <AuthHeader />
      <main className="mx-auto w-full max-w-[1440px] px-5 pt-4 pb-12 sm:px-12">
        <section className="relative h-[560px] min-w-0 overflow-hidden rounded-[20px] border border-card-line bg-white sm:h-[680px]">
          <div
            className={`absolute -top-[22px] right-0 -bottom-[48px] left-0 transition-opacity ${shared.loading ? "opacity-50" : ""}`}
          >
            {homeView && regions.length > 0 && (
              <SvgMap
                regions={regions}
                focusRegion={currentCode}
                homeView={homeView}
                dongs={shared.dongs}
                hoveredCode={hoveredCode}
                onHover={setHoveredCode}
                onViewChange={handleViewChange}
                controlsClassName="right-6 bottom-[72px]"
                tooltip={
                  !shared.loading &&
                  hoveredDong && (
                    <MapTooltip dong={hoveredDong} guName={hoveredGu ?? null} bandLabel={bandLabel(timeBand)} hint="" />
                  )
                }
              />
            )}
          </div>

          <MapLoading
            show={(regions.length === 0 && !boundaryError) || (shared.loading && !shared.error)}
          />

          <div className="absolute top-[23px] left-[23px]">
            {shared.owner && currentRegion && (
              <div className="flex items-start gap-2">
                <Avatar image={shared.owner.profileImage} size={40} />
                <MapTitlePanel
                  title={`${shared.owner.nickname}님의 ${seasonOf(shared.season)?.name ?? ""} ${bandLabel(timeBand)}`}
                >
                  {currentRegion.name} · 칠한 동{" "}
                  <b className="text-ink">
                    {filledCount}/{currentRegion.dongCount}
                  </b>
                </MapTitlePanel>
              </div>
            )}
            <div className="mt-2 max-w-[360px]">
              <ErrorBanner message={regionError ?? boundaryError ?? shared.error} />
            </div>
          </div>

          <div className="absolute bottom-[27px] left-1/2 w-max -translate-x-1/2">
            <TimeBandBar season={selectedSeason} timeBand={timeBand} onChange={changeTimeBand} onSeasonChange={changeSeason} />
          </div>
        </section>
      </main>
    </div>
  );
}
