import type { PhotoDetail } from "../../api/photo";
import { getPhotoColorRatios } from "./photo-color-ratios";

// 사진 카드·크게 보기(라이트박스)가 같이 쓰는 표시 도우미 (촬영 시각 표시는 utils/date.ts formatTakenAt)

// 대표색 막대: 비율 계산은 getPhotoColorRatios (bins 검증, 없으면 같은 폭)
// 5색을 채우려고 반복한 같은 색은 한 칸으로 합침
export function paletteShares({ palette, bins }: PhotoDetail) {
  const ratios = getPhotoColorRatios(palette, bins);
  const shares = new Map<string, number>();
  palette.forEach((color, i) => shares.set(color, (shares.get(color) ?? 0) + (ratios[i] ?? 0)));
  return [...shares].filter(([, share]) => share > 0).map(([color, share]) => ({ color, share }));
}
