import { request } from "./client";
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

export function uploadPhoto(image: File, data: PhotoUploadData, accessToken: string) {
  const body = new FormData();
  body.append("image", image);
  body.append("data", new Blob([JSON.stringify(data)], { type: "application/json" }));
  return request<PhotoUploadResult>("/api/photos", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body,
  });
}
