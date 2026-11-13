import type { MyBadges } from "../../api/badge";
import { BadgeIcon } from "../../components/badge-icon";
import { BADGES, badgeEarnedText, isKnownBadge, sortByBadgeOrder } from "../../constants/badges";
import { formatDate } from "../../utils/date";
import { MYPAGE_SECTION } from "./mypage-sections";
import { SectionCard } from "./section-card";

// 받은 배지 수를 요약 카드에서도 쓰므로 데이터는 마이페이지에서 받아서 넘김
export function BadgeSection({ data, error }: { data: MyBadges | null; error: boolean }) {
  // 모르는 배지(BE에 먼저 추가된 경우)는 빼고, 개수도 화면에 보이는 배지로 셈. 순서는 업로드 완료 화면과 같게
  const badges = sortByBadgeOrder(data?.badges.filter((badge) => isKnownBadge(badge.type)) ?? []);
  const earnedCount = badges.filter((badge) => badge.earned).length;

  return (
    <SectionCard
      id={MYPAGE_SECTION.badges}
      title="활동 배지"
      note="한 번 받은 배지는 사진을 지워도 남아요."
      aside={
        data && (
          <p className="shrink-0 text-sm text-ink-muted">
            <span className="sr-only">받은 배지 </span>
            <b className="text-ink">{earnedCount}</b> / {badges.length}
          </p>
        )
      }
    >
      {error && <p className="mt-4 text-sm text-danger">배지를 불러오지 못했어요.</p>}
      {!data && !error && <p className="mt-4 text-sm text-ink-muted">불러오는 중...</p>}
      {data && (
        // auto-rows-fr: 설명 길이와 상관없이 모든 줄 높이를 같게 (격자처럼 가지런히)
        <ul className="mt-4 grid auto-rows-fr grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3">
          {badges.map((badge) => {
            const info = BADGES[badge.type];
            const description = badge.earned ? badgeEarnedText(badge.type, badge.dongName) : info.condition;
            return (
              <li key={badge.type} className="flex flex-col items-center text-center">
                <BadgeIcon type={badge.type} earned={badge.earned} size={64} />
                <p className={badge.earned ? "mt-2 text-sm font-bold text-ink" : "mt-2 text-sm font-bold text-ink-faint"}>
                  {info.name}
                  {/* 아이콘(잠금 표시)은 화면 낭독기에서 숨기므로 받은 여부를 글로 알림 */}
                  <span className="sr-only">{badge.earned ? " (받은 배지)" : " (아직 받지 않은 배지)"}</span>
                </p>
                {/* 터치 화면은 마우스를 올릴 수 없어서 조건을 끝까지 보여 줌 (줄 높이는 auto-rows-fr로 맞춤) */}
                <p className="mt-0.5 text-xs leading-snug text-ink-muted">
                  {description}
                </p>
                {badge.earned && badge.earnedAt && (
                  <p className="mt-0.5 font-mono text-[11px] text-brand-strong">{formatDate(badge.earnedAt)}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
