import { authRequest } from "./client";
import type { DongPoint } from "./dong";
import type { TimeBand } from "./map";

export type MyMapCell = {
  dongCode: string;
  name: string;
  timeBand: TimeBand;
  filled: boolean;
  myColor: string | null;
  myPhotoCount: number;
  previewColor: string | null;
};

export type MyMap = {
  season: string;
  totalCellCount: number;
  filledCellCount: number;
  cells: MyMapCell[];
};

export function getMyMap() {
  return authRequest<MyMap>("/api/users/me/map");
}

export type MyDongPhotos = {
  dongCode: string;
  points: DongPoint[];
};

export function getMyDongPhotos(dongCode: string, timeBand: TimeBand) {
  return authRequest<MyDongPhotos>(`/api/users/me/map/dongs/${dongCode}?timeBand=${timeBand}`);
}
