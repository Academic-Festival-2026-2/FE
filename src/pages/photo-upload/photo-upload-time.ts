import type { SeasonType } from "../../api/photo";
import type { TimeBand } from "../../api/map";

// EXIF 촬영 시각이 있으면 날짜를, 없으면 직접 선택한 계절·시간대를 전송한다.
export function photoUploadTimeFields(
  exifTakenAt: string | undefined,
  normalizedTakenAt: string | undefined,
  season: SeasonType | "",
  timeBand: TimeBand | "",
): { takenAt: string } | { season: SeasonType; timeBand: TimeBand } | null {
  if (exifTakenAt) {
    return normalizedTakenAt ? { takenAt: normalizedTakenAt } : null;
  }
  return season && timeBand ? { season, timeBand } : null;
}
