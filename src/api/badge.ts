import { authRequest } from "./client";

// BE BadgeType과 같은 값. 순서는 BE가 내려주는 목록 순서를 따름
export type BadgeType =
  | "FIRST_PHOTO"
  | "DONG_FIRST"
  | "DONG_TOP10"
  | "DONG_FIVE"
  | "ALL_TIME_BANDS"
  | "PHOTO_TEN";

export type MyBadge = {
  type: BadgeType;
  earned: boolean;
  earnedAt: string | null;
  // DONG_FIRST·DONG_TOP10만 값이 있음
  dongName: string | null;
};

export type MyBadges = {
  badges: MyBadge[];
  earnedCount: number;
  totalCount: number;
};

export function getMyBadges() {
  return authRequest<MyBadges>("/api/users/me/badges");
}
