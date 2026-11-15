import type { RegionList } from "../../api/map";
import { SEASON_OPTIONS } from "../map/map-data";

export type FilterOption = {
  value: string;
  label: string;
  // 아직 데이터가 없는 항목 (목록에는 보이지만 고를 수 없음)
  disabled?: boolean;
};

// 나의 지도 현황 처음 지역 (BE 나의 지도 기본 지역과 같음: 부천 3105)
export const DEFAULT_REGION = "3105";

// 나의 지도 현황 지역 선택: BE 지역 목록(경기도 시·군)을 가나다순으로.
// 목록을 받기 전이나 못 받았을 때는 기본 지역 하나만
export function toRegionOptions(regionList: RegionList | null): FilterOption[] {
  if (!regionList?.regions.length) return [{ value: DEFAULT_REGION, label: "부천시" }];
  return regionList.regions
    .map((region) => ({ value: region.regionCode, label: region.name }))
    .sort((a, b) => a.label.localeCompare(b.label, "ko"));
}

// 나의 지도 현황 계절 선택. 연도 없이 계절 이름만 ("가을")
// TODO: 시즌이 추가되면 열린 계절 목록을 BE에서 받기. 같은 계절이 여러 해가 되면 연도 구분 필요
export const DEFAULT_SEASON = "AUTUMN";
const OPEN_SEASONS = new Set([DEFAULT_SEASON]);
export const SEASON_FILTER_OPTIONS: FilterOption[] = SEASON_OPTIONS.map((option) => ({
  value: option.value,
  label: option.name,
  disabled: !OPEN_SEASONS.has(option.value),
}));
