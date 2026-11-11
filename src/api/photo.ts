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
  // 업로드 때 보낸 40칸 색 비율. 서버 응답에 아직 없을 수 있음 (없으면 5색 같은 폭으로 표시)
  bins?: number[];
};

export function getPhotoDetail(photoId: number, mine = false) {
  const path = `/api/photos/${photoId}`;
  return mine ? authRequest<PhotoDetail>(path) : request<PhotoDetail>(path);
}
