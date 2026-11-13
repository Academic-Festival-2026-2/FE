import { REGION_NAME, SEASON_OPTIONS } from "../map/map-data";

export type FilterOption = {
  value: string;
  label: string;
  // 아직 데이터가 없는 항목 (목록에는 보이지만 고를 수 없음)
  disabled?: boolean;
};

// 나의 지도 현황 지역 선택. 지금은 부천(3105)만 있음
// TODO: 경기도 확장 때 BE 지역 목록 API로 바꾸기 (BE #119 regions)
export const DEFAULT_REGION = "3105";
export const REGION_OPTIONS: FilterOption[] = [
  { value: DEFAULT_REGION, label: REGION_NAME },
  // 확장 예정 안내용 (고를 수 없음)
  { value: "upcoming", label: "경기도 다른 시", disabled: true },
];

// 나의 지도 현황 계절 선택. 연도 없이 계절 이름만 ("가을")
// TODO: 시즌이 추가되면 열린 계절 목록을 BE에서 받기. 같은 계절이 여러 해가 되면 연도 구분 필요
export const DEFAULT_SEASON = "AUTUMN";
const OPEN_SEASONS = new Set([DEFAULT_SEASON]);
export const SEASON_FILTER_OPTIONS: FilterOption[] = SEASON_OPTIONS.map((option) => ({
  value: option.value,
  label: option.name,
  disabled: !OPEN_SEASONS.has(option.value),
}));
