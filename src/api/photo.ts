import { request } from "./client";
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

export function getPhotoDetail(photoId: number) {
  return request<PhotoDetail>(`/api/photos/${photoId}`);
}
