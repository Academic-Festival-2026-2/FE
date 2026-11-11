import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { MyInfoResponse } from "../../api/user";
import { Avatar } from "../../components/avatar";
import { currentTimeBand } from "../../utils/time-band";
import { ProfileImageDialog } from "./profile-image-dialog";

// 부천 37개 동 × 시간대 4개
const TOTAL_CELLS = 148;

// "2026-10-01T12:34:56" → "2026.10.01"
function formatDate(value: string) {
  return value.slice(0, 10).replaceAll("-", ".");
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="w-[140px] rounded-xl bg-[#f2f0eb] px-3.5 py-2.5">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

type ProfileSummaryProps = {
  info: MyInfoResponse;
  onUpdated: (changes: Partial<MyInfoResponse>) => void;
};

export function ProfileSummary({ info, onUpdated }: ProfileSummaryProps) {
  const [isEditingImage, setIsEditingImage] = useState(false);

  return (
    <section className="flex flex-wrap items-center gap-4 rounded-3xl border border-[#e8e4dc] bg-white px-6 py-5">
      {/* 마우스를 올리거나 키보드로 포커스하면 연필 표시, 누르면 변경 팝업 */}
      <button
        type="button"
        aria-label="프로필 사진 변경"
        onClick={() => setIsEditingImage(true)}
        className="group relative shrink-0 rounded-full focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <Avatar image={info.profileImage} size={56} />
        <span
          className="absolute inset-0 grid place-items-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden
        >
          {/* 연필 아이콘 */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </span>
      </button>
      {isEditingImage && (
        <ProfileImageDialog
          current={info.profileImage}
          onClose={() => setIsEditingImage(false)}
          onUpdated={onUpdated}
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-bold text-gray-900">{info.nickname}</p>
        <p className="truncate text-sm text-gray-600">{info.email}</p>
        <p className="mt-1 text-xs text-gray-500">
          가입일 <span className="font-mono">{formatDate(info.createdAt)}</span>
        </p>
      </div>
      {/* BE #92 배포 전이면 필드가 없어서 0으로 표시 */}
      <Stat label="내 사진" value={`${(info.photoCount ?? 0).toLocaleString()}장`} />
      <Stat label="채운 칸" value={`${info.filledCellCount ?? 0} / ${TOTAL_CELLS}`} />
      <Link
        to="/map"
        search={{ timeBand: currentTimeBand(), mode: "mine" }}
        className="grid h-10 place-items-center rounded-xl bg-gray-900 px-4 text-sm font-bold text-white hover:bg-gray-700"
      >
        나의 지도 보기
      </Link>
    </section>
  );
}
