import { authRequest, request } from "./client";
import type { TimeBand } from "./map";

export type PhotoUploadData = {
  dongCode: string;
  latitude?: number;
  longitude?: number;
  takenAt: string;
  isPublic: boolean;
  palette: string[];
  bins: number[];
};

export type PhotoUploadResult = {
  photoId: number;
  dongCode: string;
  name: string;
  season: string;
  timeBand: TimeBand;
  exifVerified: boolean;
  isPublic: boolean;
  cellPhotoCount: number | null;
  firstInCell: boolean;
};

export function uploadPhoto(image: File, data: PhotoUploadData) {
  const body = new FormData();
  body.append("image", image);
  body.append("data", new Blob([JSON.stringify(data)], { type: "application/json" }));

  return authRequest<PhotoUploadResult>("/api/photos", {
    method: "POST",
    body,
  });
}

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
