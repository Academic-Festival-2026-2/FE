import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

type SectionCardProps = {
  title: string;
  // 요약 카드 숫자를 누르면 이 id로 스크롤 (마이페이지 영역 이동)
  id?: string;
  // 제목 바로 옆 작은 안내 (좁은 화면에서는 제목 아래로 줄바꿈)
  note?: string;
  // 제목 오른쪽 (전체 보기 링크, 받은 배지 수 등)
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
};

// 마이페이지 영역 공통 카드 (흰 카드 + 제목 줄)
export function SectionCard({ title, id, note, aside, className, children }: SectionCardProps) {
  return (
    // scroll-mt: 스크롤했을 때 카드가 화면 맨 위에 딱 붙지 않게 여백
    // flex-col: 옆 카드에 맞춰 높이가 늘어날 때 마지막 줄(mt-auto)을 카드 아래에 붙일 수 있게
    <section id={id} className={cn("flex scroll-mt-4 flex-col rounded-2xl border border-card-line bg-white px-6 py-5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        {/* tabIndex -1: 스크롤 후 제목으로 포커스를 옮겨 화면 낭독기·키보드 사용자도 이동한 곳을 알게 함 */}
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5">
          <h2 tabIndex={-1} className="text-[17px] leading-[25px] font-bold text-ink outline-none">
            {title}
          </h2>
          {note && <p className="text-xs text-ink-faint">{note}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
