import { authRequest, request } from "./client";
import type { TimeBand } from "./map";

export type PhotoDetail = {
  photoId: number;
  imageUrl: string | null;
  nickname: string;
  name: string;
  takenAt: string;
  timeBand: TimeBand;
  palette: string[];
};

export function getPhotoDetail(photoId: number, mine = false) {
  const path = `/api/photos/${photoId}`;
  return mine ? authRequest<PhotoDetail>(path) : request<PhotoDetail>(path);
}
