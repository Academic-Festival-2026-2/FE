import type { BadgeType } from "./badge";
import { authRequest, optionalAuthRequest } from "./client";
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
  // 업로드 때 보낸 40칸 색 비율. 없거나 이상하면 5색 같은 폭으로 표시 (photo-color-ratios.ts)
  bins?: number[] | null;
  // 좋아요 수와 내가 눌렀는지 (비로그인이면 liked는 false). 좋아요 기능 전 BE에서는 없음
  likeCount?: number;
  liked?: boolean;
};

// 공유 지도에서도 로그인했으면 토큰을 붙여야 내 좋아요 여부(liked)가 옴
export function getPhotoDetail(photoId: number, mine = false) {
  const path = `/api/photos/${photoId}`;
  return mine ? authRequest<PhotoDetail>(path) : optionalAuthRequest<PhotoDetail>(path);
}

// BE: POST·DELETE /api/photos/{photoId}/likes. 두 번 눌러도·없는데 취소해도 그대로
export type PhotoLikeResult = {
  photoId: number;
  liked: boolean;
  likeCount: number;
};

export function likePhoto(photoId: number) {
  return authRequest<PhotoLikeResult>(`/api/photos/${photoId}/likes`, { method: "POST" });
}

export function unlikePhoto(photoId: number) {
  return authRequest<PhotoLikeResult>(`/api/photos/${photoId}/likes`, { method: "DELETE" });
}

// BE: GET /api/users/me/liked-photos?page=0&size=12 (최근에 누른 순)
// 남의 사진이 비공개로 바뀌면 빠짐. nickname은 사진을 올린 회원
export type LikedPhotoItem = {
  photoId: number;
  thumbnailUrl: string | null;
  dongCode: string;
  name: string;
  nickname: string;
  timeBand: TimeBand;
  takenAt: string;
  color: string;
};

export type LikedPhotosResponse = {
  photos: LikedPhotoItem[];
  page: number;
  size: number;
  totalElements: number;
  hasNext: boolean;
};

export function getLikedPhotos(page = 0, size = 12) {
  return authRequest<LikedPhotosResponse>(
    `/api/users/me/liked-photos?page=${page}&size=${size}`,
  );
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
