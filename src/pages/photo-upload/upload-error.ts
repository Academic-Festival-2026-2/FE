import { ApiError } from "../../api/client";

// 업로드 실패 이유 (BE 오류 코드별 안내, 그 밖에는 서버·브라우저가 준 문구)
export function uploadErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "PHOTO400_12")
      return "사진의 계절 정보를 찾지 못했어요. 잠시 후 다시 시도해 주세요.";
    if (error.code === "PHOTO400_25")
      return "미래 촬영 시각의 사진은 올릴 수 없어요. 카메라 날짜와 시간을 확인해 주세요.";
    if (error.code === "PHOTO409_1") return "이미 등록된 사진입니다. 다른 사진을 선택해 주세요.";
    // AI 검수에서 거절된 사진 (BE ClaudeImageModerator 기준: 선정적·폭력적·혐오감을 주는 사진)
    if (error.code === "PHOTO422_1")
      return "지도에 올릴 수 없는 사진이에요. 선정적이거나 폭력적인 사진, 혐오감을 주는 사진은 올릴 수 없어요.";
  }
  return error instanceof Error ? error.message : "업로드하지 못했어요. 다시 시도해 주세요.";
}
