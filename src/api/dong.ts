import { request } from "./client";
import type { CellStatus, ColorRatio, SeasonType, TimeBand } from "./map";

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
  season: SeasonType;
  timeBands: DongTimeBand[];
  points: DongPoint[];
};

export function getDongDetail(dongCode: string, timeBand: TimeBand, season?: SeasonType) {
  const suffix = season ? `&season=${season}` : "";
  return request<DongDetail>(`/api/dongs/${dongCode}?timeBand=${timeBand}${suffix}`);
}
