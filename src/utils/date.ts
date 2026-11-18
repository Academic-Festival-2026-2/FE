import { seasonOf } from "./season";

// BE LocalDateTime 문자열의 날짜만 표시. "2026-10-01T12:34:56" → "2026.10.01"
export function formatDate(value: string) {
  return value.slice(0, 10).replaceAll("-", ".");
}

// 촬영 시각 없이 올린 사진: 직접 고른 계절 이름, 계절도 모르면 "촬영 시기 미상"
function unknownTakenAt(season?: string | null) {
  return seasonOf(season ?? null)?.name ?? "촬영 시기 미상";
}

// 사진 촬영 날짜. "2026.10.01" (사진 목록 카드)
export function formatTakenDate(value: string | null, season?: string | null) {
  return value ? formatDate(value) : unknownTakenAt(season);
}

// 사진 촬영 날짜와 시각. "2026.10.01 12:34" (사진 카드·크게 보기·내 사진 상세)
export function formatTakenAt(value: string | null, season?: string | null) {
  return value ? `${formatDate(value)} ${value.slice(11, 16)}` : unknownTakenAt(season);
}
