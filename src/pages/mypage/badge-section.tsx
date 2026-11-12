import { useEffect, useState } from "react";
import { getMyBadges, type MyBadges } from "../../api/badge";
import { BadgeIcon } from "../../components/badge-icon";
import { BADGES, badgeEarnedText, isKnownBadge, sortByBadgeOrder } from "../../constants/badges";
import { isSessionExpired, useExpireSession } from "../../hooks/use-expire-session";
import { formatDate } from "../../utils/date";

export function BadgeSection() {
  const expireSession = useExpireSession();
  const [data, setData] = useState<MyBadges | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let ignore = false;
    getMyBadges()
      .then((result) => {
        if (!ignore) setData(result);
      })
      .catch((err: unknown) => {
        if (ignore) return;
        // 내 정보 요청 뒤에 세션이 끝난 경우에도 로그인 화면으로
        if (isSessionExpired(err)) expireSession();
        else setError(true);
      });
    return () => {
      ignore = true;
    };
  }, [expireSession]);

  // 모르는 배지(BE에 먼저 추가된 경우)는 빼고, 개수도 화면에 보이는 배지로 셈. 순서는 업로드 완료 화면과 같게
  const badges = sortByBadgeOrder(data?.badges.filter((badge) => isKnownBadge(badge.type)) ?? []);
  const earnedCount = badges.filter((badge) => badge.earned).length;

  return (
    <section className="rounded-3xl border border-[#e8e4dc] bg-white p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="flex items-baseline gap-2 text-[17px] font-bold text-gray-900">
          <span className="font-mono text-xs font-normal text-[#c4581a]">03</span>활동 배지
        </h2>
        {data && (
          <p className="text-sm text-gray-500">
            <span className="sr-only">받은 배지 </span>
            <b className="text-gray-900">{earnedCount}</b> / {badges.length}
          </p>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-gray-500">배지를 불러오지 못했어요.</p>}
      {!data && !error && <p className="mt-4 text-sm text-gray-500">불러오는 중...</p>}
      {data && (
        <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
          {badges.map((badge) => {
            const info = BADGES[badge.type];
            return (
              <li key={badge.type} className="flex flex-col items-center text-center">
                <BadgeIcon type={badge.type} earned={badge.earned} />
                <p className={badge.earned ? "mt-2.5 text-sm font-bold text-gray-900" : "mt-2.5 text-sm font-bold text-gray-400"}>
                  {info.name}
                  {/* 아이콘(잠금 표시)은 화면 낭독기에서 숨기므로 받은 여부를 글로 알림 */}
                  <span className="sr-only">{badge.earned ? " (받은 배지)" : " (아직 받지 않은 배지)"}</span>
                </p>
                <p className="mt-1 text-xs leading-snug text-gray-500">
                  {badge.earned ? badgeEarnedText(badge.type, badge.dongName) : info.condition}
                </p>
                {badge.earned && badge.earnedAt && (
                  <p className="mt-1 font-mono text-[11px] text-[#c4581a]">{formatDate(badge.earnedAt)}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-5 text-xs text-gray-400">
        동네 개척자·초기 탐험대는 모두의 지도에 반영된 사진만, 찍은 계절마다 따로 세요. 한 번 받은 배지는 사진을 지워도 남아요.
      </p>
    </section>
  );
}
