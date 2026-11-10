import { Link } from "@tanstack/react-router";
import type { MyInfoResponse } from "../../api/user";
import { currentTimeBand } from "../../utils/time-band";

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

export function ProfileSummary({ info }: { info: MyInfoResponse }) {
  return (
    <section className="flex flex-wrap items-center gap-4 rounded-3xl border border-[#e8e4dc] bg-white px-6 py-5">
      <span
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#ff8a3d] font-bold text-gray-900"
        aria-hidden
      >
        {/* 이모지처럼 두 칸짜리 글자도 잘리지 않게 Array.from 사용 */}
        {Array.from(info.nickname)[0]}
      </span>
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
