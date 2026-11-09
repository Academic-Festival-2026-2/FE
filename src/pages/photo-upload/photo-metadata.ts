import * as exifr from "exifr";
import { parseLocalTime, validateImage } from "./photo-validation";

export type PhotoMetadata = { takenAt?: string; latitude?: number; longitude?: number };

export async function readPhoto(file: File): Promise<PhotoMetadata> {
  await validateImage(file);
  // 실제 디코딩까지 확인합니다. 파일 확장자나 MIME만 믿지 않습니다.
  const bitmap = await createImageBitmap(file);
  bitmap.close();
  try {
    const exif = await exifr.parse(file, { reviveValues: false });
    const takenAt = typeof exif?.DateTimeOriginal === "string" ? parseLocalTime(exif.DateTimeOriginal.trim()) : undefined;
    const lat = exif?.latitude, lng = exif?.longitude;
    const hasGps = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0);
    return { takenAt, ...(hasGps ? { latitude: lat, longitude: lng } : {}) };
  } catch {
    // EXIF가 없는 이미지는 수동 입력으로 진행합니다.
    return {};
  }
}
