import { characterSrc, profileColor } from "../utils/profile-image";

type AvatarProps = {
  // 프로필 이미지 키 (예: "CAT_CHEESE", "COLOR_SKY"). 없으면 주황 단색
  image?: string;
  nickname: string;
  size?: number;
};

// 옆에 닉네임이 같이 보이는 곳에서 쓰므로 스크린리더에는 숨김
export function Avatar({ image, nickname, size = 48 }: AvatarProps) {
  const src = characterSrc(image);

  if (src) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden
        width={size}
        height={size}
        className="shrink-0 rounded-full bg-[#f2f0eb] [image-rendering:pixelated]"
        style={{ width: size, height: size }}
      />
    );
  }

  const { color, text } = profileColor(image);
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-bold"
      style={{ width: size, height: size, fontSize: size * 0.4, background: color, color: text }}
      aria-hidden
    >
      {/* 이모지처럼 두 칸짜리 글자도 잘리지 않게 Array.from 사용 */}
      {Array.from(nickname)[0]}
    </span>
  );
}
