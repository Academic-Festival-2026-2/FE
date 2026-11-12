import type { BadgeType } from "./badge";
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
  aiVerdict?: "PUBLIC" | "PERSONAL_ONLY" | "UNCHECKED";
  aiReason?: "NOT_SCENERY" | "PRIVACY" | null;
  // 이번 업로드로 새로 받은 배지 (배지 기능 전 BE에서는 없음)
  newBadges?: BadgeType[];
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
  bins?: number[] | null;
};

export function getPhotoDetail(photoId: number, mine = false) {
  const path = `/api/photos/${photoId}`;
  return mine ? authRequest<PhotoDetail>(path) : request<PhotoDetail>(path);
}

// BE: GET /api/users/me/photos?page=0&size=12 (최신 순)
export type MyPhotoItem = {
  photoId: number;
  thumbnailUrl: string | null;
  dongCode: string;
  name: string;
  timeBand: TimeBand;
  takenAt: string;
  color: string;
  isPublic: boolean;
  aiVerdict: "PUBLIC" | "PERSONAL_ONLY" | "UNCHECKED";
};

export type MyPhotosResponse = {
  photos: MyPhotoItem[];
  page: number;
  size: number;
  totalElements: number;
  hasNext: boolean;
};

export function getMyPhotos(page = 0, size = 12) {
  return authRequest<MyPhotosResponse>(`/api/users/me/photos?page=${page}&size=${size}`);
}

export function deletePhoto(photoId: number) {
  return authRequest<void>(`/api/photos/${photoId}`, { method: "DELETE" });
}
