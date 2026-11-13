import { useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import { getMyMapShare, shareMyMap, stopSharingMyMap } from "../../api/mymap";
import { isSessionExpired, useExpireSession } from "../../hooks/use-expire-session";
import { cn } from "../../utils/cn";
import { SectionCard } from "./section-card";

// 공유 링크 주소는 /shared/{shareKey}로 확정 (PR #87 리뷰, 나의 지도 담당 ani3d)
// TODO: 공유 화면(라우트)이 생기면 true로 바꿔 링크 복사를 열기. 그 전에는 받은 사람이 404를 봐서 막아 둠
const SHARE_PAGE_READY = false;

function shareUrl(shareKey: string) {
  return `${window.location.origin}/shared/${shareKey}`;
}

// 나의 지도 공유: 켜면 링크가 생기고 복사할 수 있음, 끄면 링크가 지워져 예전 링크도 열리지 않음
export function ShareSection() {
  const expireSession = useExpireSession();
  // undefined: 불러오는 중, null: 공유 안 함
  const [shareKey, setShareKey] = useState<string | null | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let ignore = false;
    getMyMapShare()
      .then((result) => {
        if (!ignore) setShareKey(result.shareKey);
      })
      .catch((err: unknown) => {
        if (ignore) return;
        if (isSessionExpired(err)) expireSession();
        else setLoadError(true);
      });
    return () => {
      ignore = true;
    };
  }, [expireSession]);

  // 복사 완료 표시는 잠깐만
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const sharing = typeof shareKey === "string";

  async function handleToggle() {
    if (isSaving || shareKey === undefined) return;
    setIsSaving(true);
    setError(null);
    try {
      if (sharing) {
        await stopSharingMyMap();
        setShareKey(null);
      } else {
        const result = await shareMyMap();
        setShareKey(result.shareKey);
      }
    } catch (err) {
      if (isSessionExpired(err)) return expireSession();
      setError(err instanceof ApiError ? err.message : "공유 설정을 바꾸지 못했어요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCopy() {
    if (!sharing || !SHARE_PAGE_READY) return;
    try {
      await navigator.clipboard.writeText(shareUrl(shareKey));
      setCopied(true);
    } catch {
      // http 주소(폰 테스트 등)나 권한 거부로 복사가 막히면 직접 복사하도록 안내
      setError("자동 복사가 막혔어요. 링크를 길게 눌러 직접 복사해 주세요.");
    }
  }

  return (
    <SectionCard title="나의 지도 공유">
      <div className="mt-1 flex items-center justify-between gap-4">
        <p className="text-sm leading-[22px] text-ink-sub">
          {sharing ? "링크가 있는 사람은 내 지도를 볼 수 있어요." : "켜면 내 지도를 볼 수 있는 링크가 만들어져요."}
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={sharing}
          aria-label="나의 지도 공유"
          disabled={isSaving || shareKey === undefined || loadError}
          onClick={handleToggle}
          className={cn(
            "relative h-[26px] w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
            sharing ? "bg-brand" : "bg-[#c5ccda]",
          )}
        >
          <span
            className={cn(
              "absolute top-[3px] left-[3px] size-5 rounded-full bg-white transition-transform",
              sharing && "translate-x-[18px]",
            )}
          />
        </button>
      </div>

      {sharing && (
        <div className="mt-3.5 flex gap-2">
          <input
            readOnly
            value={shareUrl(shareKey)}
            aria-label="공유 링크"
            onFocus={(event) => event.currentTarget.select()}
            className="h-10 min-w-0 flex-1 rounded-[10px] border border-field-line bg-field px-3 font-mono text-[13px] text-ink-sub outline-none focus:border-brand"
          />
          <button
            type="button"
            onClick={handleCopy}
            disabled={!SHARE_PAGE_READY}
            title={SHARE_PAGE_READY ? undefined : "공유 화면을 준비 중이에요"}
            className="h-10 shrink-0 rounded-[10px] border border-card-line bg-white px-4 text-sm font-bold text-ink transition-colors hover:bg-field disabled:cursor-not-allowed disabled:bg-field disabled:text-ink-faint disabled:hover:bg-field"
          >
            {!SHARE_PAGE_READY ? "준비 중" : copied ? "복사했어요" : "링크 복사"}
          </button>
        </div>
      )}
      {sharing && !SHARE_PAGE_READY && (
        <p className="mt-2 text-xs text-ink-muted">링크로 내 지도를 보는 화면은 준비 중이에요. 곧 링크를 복사할 수 있어요.</p>
      )}

      {loadError && <p className="mt-3 text-xs text-danger">공유 설정을 불러오지 못했어요.</p>}
      {error && (
        <p role="alert" className="mt-3 text-xs text-danger">
          {error}
        </p>
      )}
    </SectionCard>
  );
}
