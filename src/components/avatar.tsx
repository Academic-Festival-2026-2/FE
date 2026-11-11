import { characterSrc, profileColor } from "../utils/profile-image";

type AvatarProps = {
  // 프로필 이미지 키 (예: "CAT_CHEESE", "COLOR_SKY"). 없으면 주황 단색
  image?: string;
  size?: number;
};

// 장식용이라 스크린리더에는 숨김 (옆에 닉네임이 보이거나 버튼에 aria-label이 있음)
export function Avatar({ image, size = 48 }: AvatarProps) {
  const src = characterSrc(image);

  return (
    // 원 모양은 바깥 틀이 잘라서 만듦 (img는 픽셀을 선명하게, 테두리는 매끄럽게)
    <span
      className="block shrink-0 overflow-hidden rounded-full"
      style={{ width: size, height: size, background: src ? "#e6e6ea" : profileColor(image) }}
      aria-hidden
    >
      {src && (
        // gif는 검은 바탕 위에 계단 모양(픽셀) 원이 그려져 있어서, 그대로 둥글게 자르면
        // 대각선 쪽 계단 모서리의 검은 픽셀이 보여 테두리가 깨져 보임
        // → 10% 키워서 계단 부분을 원 밖으로 밀어냄 (계단 한 칸 = 그림 폭의 약 4%)
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          className="block h-full w-full scale-110 [image-rendering:pixelated]"
        />
      )}
    </span>
  );
}
