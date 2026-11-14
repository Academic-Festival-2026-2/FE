import { useCallback, useMemo, useState } from "react";
import { getRouteApi, Link } from "@tanstack/react-router";
import type { TimeBand } from "../../api/map";
import { AuthHeader } from "../../components/layout/auth-header";
import { bandLabel, useRegionBoundaries, useRegionList, useSharedMap } from "../map/map-data";
import { fitView, regionAt, regionsInView, unproject, type View } from "../map/map-geometry";
import { MapLoading } from "../map/map-loading";
import { MapTooltip } from "../map/map-tooltip";
import { ErrorBanner, MapTitlePanel, TimeBandBar } from "../map/map-ui";
import { SvgMap } from "../map/svg-map";

const route = getRouteApi("/shared/$shareKey");

// 공유받은 나의 지도 (로그인 없이, 보기만). 메인 지도와 같은 경기도 지도에 공유한 사람이 칠한 동만 색칠
export function SharedMapPage() {
  const { shareKey } = route.useParams();
  const { timeBand } = route.useSearch();
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
  const shared = useSharedMap(shareKey, timeBand, visibleCodes);

  // 화면 이동이 멈추면 가운데 지역을 다시 정함 (공유 화면은 주소에 지역을 남기지 않음)
  const handleViewChange = useCallback(
    (next: View) => {
      setView(next);
      const code = regionAt(regions, unproject([next.x + next.size / 2, next.y + next.size / 2]));
      if (code) setCenterCode(code);
    },
    [regions],
  );

  function changeTimeBand(value: TimeBand) {
    navigate({ search: { timeBand: value }, replace: true });
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
            search={{ timeBand }}
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
              <MapTitlePanel title={`${shared.owner.nickname}님의 ${currentRegion.name} ${bandLabel(timeBand)}`}>
                칠한 동{" "}
                <b className="text-ink">
                  {filledCount}/{currentRegion.dongCount}
                </b>
              </MapTitlePanel>
            )}
            <div className="mt-2 max-w-[360px]">
              <ErrorBanner message={regionError ?? boundaryError ?? shared.error} />
            </div>
          </div>

          <div className="absolute bottom-[27px] left-1/2 w-max -translate-x-1/2">
            <TimeBandBar season={shared.season} timeBand={timeBand} onChange={changeTimeBand} />
          </div>
        </section>
      </main>
    </div>
  );
}
