import type { PhotoDetail } from "../../api/photo";

// 원본 주소(imageUrl)는 S3 서명 주소라 정해진 시간(X-Amz-Expires, 지금 BE는 300초) 뒤 만료되고 받을 때마다 바뀜
// → 기억한 상세는 받은 때부터 만료 1분 전까지만 씀. 주소에 만료 시간이 없으면(사진 파일 없음 등) 4분
export const DEFAULT_DETAIL_TTL_MS = 4 * 60 * 1000;
export const EXPIRY_MARGIN_MS = 60 * 1000;

// 상세를 받은 때부터 다시 써도 되는 시간(ms)
// 서명 시각(X-Amz-Date)은 보지 않음: 이 기기 시계가 빠르거나 느리면 남은 시간이 어긋나고(빠르면 0이 돼 매번 다시 받음),
// 지금 BE는 상세를 줄 때마다 새로 서명해서 받은 때와 서명한 때의 차이가 몇 초 수준이라 1분 여유로 덮임
export function detailTtl(detail: Pick<PhotoDetail, "imageUrl">) {
  if (!detail.imageUrl) return DEFAULT_DETAIL_TTL_MS;
  try {
    const expires = Number(new URL(detail.imageUrl).searchParams.get("X-Amz-Expires"));
    if (!(expires > 0)) return DEFAULT_DETAIL_TTL_MS;
    return Math.max(0, expires * 1000 - EXPIRY_MARGIN_MS);
  } catch {
    return DEFAULT_DETAIL_TTL_MS;
  }
}
