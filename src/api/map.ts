import { request } from "./client";

export type TimeBand = "DAWN" | "DAY" | "SUNSET" | "NIGHT";
export type CellStatus = "OK" | "INSUFFICIENT" | "EMPTY";

export type DongProperties = {
  dongCode: string;
  name: string;
  // 구가 없는 시나 군(광명, 시흥 등)은 null
  guName: string | null;
};

export type BoundaryFeature = {
  type: "Feature";
  properties: DongProperties;
  geometry: { type: "MultiPolygon"; coordinates: number[][][][] };
};

export type Boundaries = {
  version: string;
  regionCode: string;
  regionName: string;
  type: "FeatureCollection";
  features: BoundaryFeature[];
};

export type DongColor = {
  dongCode: string;
  name: string;
  dominantColor: string | null;
  photoCount: number;
  status: CellStatus;
  colorRatio: ColorRatio[];
};

export type ColorRatio = {
  hex: string;
  ratio: number;
};

export type TopDong = {
  dongCode: string;
  name: string;
  guName: string | null;
  photoCount: number;
  colorRatio: ColorRatio[];
};

export type MapDongs = {
  season: string;
  timeBand: TimeBand;
  dongs: DongColor[];
  topDongs: TopDong[];
};

// BE: GET /api/map/regions. bbox = [최소 경도, 최소 위도, 최대 경도, 최대 위도]
export type Region = {
  regionCode: string;
  name: string;
  dongCount: number;
  bbox: [number, number, number, number];
};

export type RegionList = {
  defaultRegionCode: string;
  regions: Region[];
};

export function getRegions() {
  return request<RegionList>("/api/map/regions");
}

export function getBoundaries(regionCode: string) {
  return request<Boundaries>(`/api/map/boundaries?regionCode=${regionCode}`);
}

export function getMapDongs(timeBand: TimeBand, regionCode: string) {
  return request<MapDongs>(`/api/map/dongs?timeBand=${timeBand}&regionCode=${regionCode}`);
}
