import { request } from "./client";

export type TimeBand = "DAWN" | "DAY" | "SUNSET" | "NIGHT";
export type CellStatus = "OK" | "INSUFFICIENT" | "EMPTY";

export type DongProperties = {
  dongCode: string;
  name: string;
  guName: string;
};

export type BoundaryFeature = {
  type: "Feature";
  properties: DongProperties;
  geometry: { type: "MultiPolygon"; coordinates: number[][][][] };
};

export type Boundaries = {
  version: string;
  type: "FeatureCollection";
  features: BoundaryFeature[];
};

export type DongColor = {
  dongCode: string;
  name: string;
  dominantColor: string | null;
  photoCount: number;
  status: CellStatus;
};

export type MapDongs = {
  season: string;
  timeBand: TimeBand;
  dongs: DongColor[];
};

export function getBoundaries() {
  return request<Boundaries>("/api/map/boundaries");
}

export function getMapDongs(timeBand: TimeBand) {
  return request<MapDongs>(`/api/map/dongs?timeBand=${timeBand}`);
}
