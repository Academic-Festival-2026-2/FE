import { request } from "./client";
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

export function getMyMap(accessToken: string) {
  return request<MyMap>("/api/users/me/map", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
