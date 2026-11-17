import type { RegionList } from "../../api/map";
import { DEFAULT_REGION_CODE } from "../map/map-data";
import { SEASON_OPTIONS } from "../../utils/season";

export type FilterOption = {
  value: string;
  label: string;
  // 아직 데이터가 없는 항목 (목록에는 보이지만 고를 수 없음)
  disabled?: boolean;
};

// 나의 지도 현황 지역 선택: BE 지역 목록(경기도 시·군)을 가나다순으로.
// 목록을 받기 전이나 못 받았을 때는 기본 지역(부천) 하나만
export function toRegionOptions(regionList: RegionList | null): FilterOption[] {
  if (!regionList?.regions.length) return [{ value: DEFAULT_REGION_CODE, label: "부천시" }];
  return regionList.regions
    .map((region) => ({ value: region.regionCode, label: region.name }))
    .sort((a, b) => a.label.localeCompare(b.label, "ko"));
}

// 사계절 모두 조회 가능. 같은 계절의 연도 구분은 후속 작업.
export const SEASON_FILTER_OPTIONS: FilterOption[] = SEASON_OPTIONS.map((option) => ({
  value: option.value,
  label: option.name,
}));
