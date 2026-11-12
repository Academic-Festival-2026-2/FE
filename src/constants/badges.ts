import type { BadgeType } from "../api/badge";

type BadgeInfo = {
  name: string;
  // 받은 뒤 보여줄 문장. dongName이 있으면 "{동}" 자리에 넣음
  earnedText: string;
  // 아직 못 받았을 때 보여줄 조건
  condition: string;
};

// BE BadgeService의 조건과 맞춤. 조건을 바꾸면 양쪽을 같이 수정
// 선언 순서가 화면(업로드 완료·마이페이지)의 배지 순서
export const BADGES: Record<BadgeType, BadgeInfo> = {
  FIRST_PHOTO: {
    name: "첫 픽셀",
    earnedText: "부천에 첫 픽셀을 찍었어요",
    condition: "사진 1장 올리기",
  },
  DONG_FIRST: {
    name: "동네 개척자",
    earnedText: "{동}의 첫 색을 칠했어요",
    condition: "아직 아무도 칠하지 않은 동에 모두의 지도 첫 사진 올리기",
  },
  DONG_TOP10: {
    name: "초기 탐험대",
    earnedText: "{동}의 처음 10장 안에 들었어요",
    condition: "모두의 지도에서 한 동의 처음 10장 안에 들기",
  },
  DONG_FIVE: {
    name: "동네 마실",
    earnedText: "서로 다른 동 5곳을 담았어요",
    condition: "서로 다른 동 5곳에 사진 올리기",
  },
  ALL_TIME_BANDS: {
    name: "하루의 색",
    earnedText: "새벽부터 밤까지 모두 담았어요",
    condition: "새벽·낮·노을·밤 사진을 모두 올리기",
  },
  PHOTO_TEN: {
    name: "열 번째 픽셀",
    earnedText: "사진 10장을 올렸어요",
    condition: "사진 10장 올리기",
  },
};

// FE가 아는 배지인지 확인. BE에 먼저 추가된 배지나 "constructor" 같은 값은 false
export function isKnownBadge(type: string): type is BadgeType {
  return Object.hasOwn(BADGES, type);
}

const BADGE_ORDER = Object.keys(BADGES);

// 배지 목록을 BADGES 선언 순서로 정렬. BE가 보내는 순서가 바뀌어도 두 화면이 같은 순서를 유지
export function sortByBadgeOrder<T extends { type: BadgeType }>(badges: T[]) {
  return [...badges].sort((a, b) => BADGE_ORDER.indexOf(a.type) - BADGE_ORDER.indexOf(b.type));
}

export function badgeEarnedText(type: BadgeType, dongName?: string | null) {
  const text = BADGES[type].earnedText;
  return text.replace("{동}", dongName ?? "한 동");
}
