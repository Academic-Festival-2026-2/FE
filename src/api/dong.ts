import { request } from "./client";
import type { CellStatus, ColorRatio, TimeBand } from "./map";

export type DongTimeBand = {
  timeBand: TimeBand;
  dominantColor: string | null;
  photoCount: number;
  status: CellStatus;
  colorRatio: ColorRatio[];
};

export type DongPoint = {
  photoId: number;
  lat: number | null;
  lng: number | null;
  color: string;
  timeBand: TimeBand;
};

export type DongDetail = {
  dongCode: string;
  name: string;
  guName: string | null;
  regionCode: string;
  regionName: string;
  season: string;
  timeBands: DongTimeBand[];
  points: DongPoint[];
};

export function getDongDetail(dongCode: string, timeBand: TimeBand) {
  return request<DongDetail>(`/api/dongs/${dongCode}?timeBand=${timeBand}`);
}
