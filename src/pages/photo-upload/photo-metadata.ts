import { parseLocalTime, validateImage } from "./photo-validation";

export type PhotoMetadata = { takenAt?: string; latitude?: number; longitude?: number };

// EXIF 읽기 라이브러리(exifr, 약 75 kB)는 업로드 화면 첫 묶음에서 빼고 따로 받음.
// 업로드 화면이 열리면 바로 받기 시작하므로(preloadPhotoReader) 사진을 고를 때는 보통 이미 받아져 있음
// ⚠️ 테스트(tests/photo-upload.test.mjs)가 이 파일의 라이브러리 이름 문자열과 parse 호출 글자를 찾아 바꿔 쓰므로
//    둘 다 한 번씩만 쓰고 모양을 바꾸지 않음 (주석에도 그대로 적지 않음)
const importExifr = () => import("exifr");
let exifrRequest: ReturnType<typeof importExifr> | null = null;

export function preloadPhotoReader() {
  exifrRequest ??= importExifr().catch((error: unknown) => {
    // 받기에 실패하면 다음에 다시 받도록 비움
    exifrRequest = null;
    throw error;
  });
  return exifrRequest;
}

export async function readPhoto(file: File): Promise<PhotoMetadata> {
  await validateImage(file);
  // 실제 디코딩까지 확인합니다. 파일 확장자나 MIME만 믿지 않습니다.
  const bitmap = await createImageBitmap(file);
  bitmap.close();
  // 라이브러리를 못 받은 것을 "EXIF 없는 사진"으로 넘기지 않게 try 밖에서 받음 (넘기면 촬영 정보를 직접 고르게 됨)
  const exifr = await preloadPhotoReader().catch(() => {
    throw new Error("사진 정보를 읽는 기능을 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.");
  });
  try {
    const exif = await exifr.parse(file, { reviveValues: false });
    const takenAt =
      typeof exif?.DateTimeOriginal === "string"
        ? parseLocalTime(exif.DateTimeOriginal.trim())
        : undefined;
    const lat = exif?.latitude,
      lng = exif?.longitude;
    const hasGps =
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180 &&
      (lat !== 0 || lng !== 0);
    return { takenAt, ...(hasGps ? { latitude: lat, longitude: lng } : {}) };
  } catch {
    // EXIF가 없는 이미지는 수동 입력으로 진행합니다.
    return {};
  }
}
