type AvatarProps = {
  // 프로필 이미지 키 (캐릭터 이슈에서 사용, 지금은 안 씀)
  image?: string;
  nickname: string;
  size?: number;
};

export function Avatar({ nickname, size = 48 }: AvatarProps) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-[#ff8a3d] font-bold text-gray-900"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden
    >
      {/* 이모지처럼 두 칸짜리 글자도 잘리지 않게 Array.from 사용 */}
      {Array.from(nickname)[0]}
    </span>
  );
}
