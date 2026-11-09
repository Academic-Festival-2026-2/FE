import { authRequest } from "./client";
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
