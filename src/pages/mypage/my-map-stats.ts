import type { TimeBand } from "../../api/map";
import type { MyMap } from "../../api/mymap";

export type MyMapStats = {
  // 시간대 하나라도 칠한 동 / 전체 동
  filledDongs: number;
  totalDongs: number;
  // 칸 = 동 × 시간대
  filledCells: number;
  totalCells: number;
  // 시간대별 칠한 동 / 전체 동
  byBand: Record<TimeBand, { filled: number; total: number }>;
};

// 나의 지도 응답(동 × 시간대 칸 목록)을 마이페이지에 보여 줄 숫자로 정리.
// 동 개수는 응답에 들어 있는 동으로 세서, 지역이 바뀌어도(경기도 확장) 그대로 맞음
export function summarizeMyMap(myMap: MyMap): MyMapStats {
  const dongs = new Set<string>();
  const filledDongs = new Set<string>();
  const byBand: MyMapStats["byBand"] = {
    DAWN: { filled: 0, total: 0 },
    DAY: { filled: 0, total: 0 },
    SUNSET: { filled: 0, total: 0 },
    NIGHT: { filled: 0, total: 0 },
  };
  let filledCells = 0;

  for (const cell of myMap.cells) {
    dongs.add(cell.dongCode);
    const band = byBand[cell.timeBand];
    if (!band) continue;
    band.total += 1;
    if (cell.filled) {
      band.filled += 1;
      filledCells += 1;
      filledDongs.add(cell.dongCode);
    }
  }

  return {
    filledDongs: filledDongs.size,
    totalDongs: dongs.size,
    filledCells,
    totalCells: myMap.cells.length,
    byBand,
  };
}
