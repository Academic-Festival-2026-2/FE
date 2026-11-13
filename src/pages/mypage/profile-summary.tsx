import { useState } from "react";
import type { MyInfoResponse } from "../../api/user";
import { Avatar } from "../../components/avatar";
import { formatDate } from "../../utils/date";
import { MYPAGE_SECTION, scrollToSection } from "./mypage-sections";
import { NicknameDialog } from "./nickname-dialog";
import { ProfileImageDialog } from "./profile-image-dialog";

// 연필 아이콘 (프로필 사진·닉네임 변경 버튼)
function PencilIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

// 누르면 마이페이지 안의 해당 영역으로 스크롤 (다른 화면으로 이동하지 않음)
function Stat({
  label,
  value,
  unit,
  target,
  targetName,
}: {
  label: string;
  value: string;
  unit: string;
  target: string;
  // 이동할 영역 이름 (화면 낭독기 안내용)
  targetName: string;
}) {
  return (
    <button
      type="button"
      onClick={() => scrollToSection(target)}
      aria-label={`${label} ${value}${unit}, ${targetName}(으)로 이동`}
      className="rounded-[10px] bg-field px-3.5 py-2.5 text-left transition-colors hover:bg-[#e9edf4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <span className="block text-[11px] leading-4 text-ink-muted">{label}</span>
      <span className="mt-0.5 block text-xl font-bold tracking-[-0.4px] text-ink">
        {value}
        <span className="text-[13px] font-bold"> {unit}</span>
      </span>
    </button>
  );
}

type ProfileSummaryProps = {
  info: MyInfoResponse;
  // 아직 못 받았으면 null → "-" 표시
  filledDongs: number | null;
  earnedBadges: number | null;
  onUpdated: (changes: Partial<MyInfoResponse>) => void;
};

export function ProfileSummary({ info, filledDongs, earnedBadges, onUpdated }: ProfileSummaryProps) {
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);

  return (
    <section className="rounded-2xl border border-card-line bg-white px-6 py-5">
      <div className="flex items-center gap-3.5">
        {/* 마우스를 올리거나 키보드로 포커스하면 연필 표시, 누르면 변경 팝업 */}
        <button
          type="button"
          aria-label="프로필 사진 변경"
          onClick={() => setIsEditingImage(true)}
          className="group relative shrink-0 rounded-full focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <Avatar image={info.profileImage} size={56} />
          <span
            className="absolute inset-0 grid place-items-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            aria-hidden
          >
            <PencilIcon size={20} />
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5">
            <span className="truncate text-lg leading-7 font-bold text-ink">{info.nickname}</span>
            <button
              type="button"
              aria-label="닉네임 변경"
              onClick={() => setIsEditingNickname(true)}
              className="grid size-7 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-field hover:text-ink"
            >
              <PencilIcon size={15} />
            </button>
          </p>
          <p className="truncate text-[13px] leading-5 text-ink-sub">{info.email}</p>
          <p className="text-xs leading-[18px] text-ink-muted">
            가입일 <span className="font-mono">{formatDate(info.createdAt)}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="내 사진" value={(info.photoCount ?? 0).toLocaleString()} unit="장" target={MYPAGE_SECTION.photos} targetName="내 사진" />
        <Stat label="칠한 동" value={filledDongs === null ? "-" : String(filledDongs)} unit="곳" target={MYPAGE_SECTION.myMap} targetName="나의 지도 현황" />
        <Stat label="배지" value={earnedBadges === null ? "-" : String(earnedBadges)} unit="개" target={MYPAGE_SECTION.badges} targetName="활동 배지" />
      </div>

      {isEditingImage && (
        <ProfileImageDialog
          current={info.profileImage}
          onClose={() => setIsEditingImage(false)}
          onUpdated={onUpdated}
        />
      )}
      {isEditingNickname && (
        <NicknameDialog
          current={info.nickname}
          onClose={() => setIsEditingNickname(false)}
          onUpdated={onUpdated}
        />
      )}
    </section>
  );
}
