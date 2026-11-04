import type { MyInfoResponse } from "../../api/user";

// "2026-10-01T12:34:56" → "2026.10.01"
function formatDate(value: string) {
  return value.slice(0, 10).replaceAll("-", ".");
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="w-36 rounded-xl bg-[#f7f5f0] px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export function ProfileSummary({ info }: { info: MyInfoResponse }) {
  return (
    <section className="flex flex-wrap items-center gap-4 rounded-3xl border border-[#e8e4dc] bg-white p-6">
      <span
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#ff8a3d] font-bold text-gray-900"
        aria-hidden
      >
        {info.nickname[0]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-gray-900">{info.nickname}</p>
        <p className="truncate text-sm text-gray-600">{info.email}</p>
        <p className="mt-1 text-xs text-gray-500">가입일 {formatDate(info.createdAt)}</p>
      </div>
      {/* BE에 photoCount, filledCellCount가 추가되면 값 연결 */}
      <Stat label="내 사진" value="-" />
      <Stat label="채운 칸" value="- / 148" />
      <button
        type="button"
        disabled
        title="준비 중이에요"
        className="h-10 rounded-xl bg-gray-900 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        나의 지도 보기
      </button>
    </section>
  );
}
