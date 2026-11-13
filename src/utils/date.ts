// BE LocalDateTime 문자열의 날짜만 표시. "2026-10-01T12:34:56" → "2026.10.01"
export function formatDate(value: string) {
  return value.slice(0, 10).replaceAll("-", ".");
}
