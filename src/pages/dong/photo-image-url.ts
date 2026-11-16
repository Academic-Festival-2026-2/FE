import type { PhotoDetail } from "../../api/photo";

// 화면에 보여 줄 사진 주소: 축소 이미지(displayUrl)가 있으면 그것, 없으면 원본(imageUrl)
// 원본은 4000px 수준이라 카드·크게 보기·미리 받기 모두 축소 이미지를 먼저 씀
export function photoImageUrl(detail: Pick<PhotoDetail, "imageUrl" | "displayUrl">) {
  return detail.displayUrl ?? detail.imageUrl;
}
