import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";

// 크게 보기를 열 때 쌓는 기록에 넣는 표시. 라우터 내부 값(__TSR_key 등)은 버전마다 바뀔 수 있어 직접 넣은 값만 씀
const ENTRY_STATE_KEY = "lightboxEntry";
let entryCount = 0;

function entryIdOf(state: unknown) {
  const value = (state as Record<string, unknown> | null)?.[ENTRY_STATE_KEY];
  return typeof value === "string" ? value : null;
}

// 크게 보기(라이트박스)를 열 때 브라우저 기록을 하나 쌓아, 뒤로 가기를 누르면 화면을 벗어나지 않고 크게 보기만 닫음
// 동 화면 사진 카드와 좋아요한 사진 모아보기가 같이 씀
// (같은 주소로 쌓으므로 라우트 beforeLoad는 다시 돌 수 있음. 동 화면은 없고, 모아보기는 로그인 확인만 함)
export function useLightboxHistory() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // 이번에 연 기록의 번호. 이 기록에서 벗어나면(뒤로 가기 등) 닫힌 것으로 봄
  // (새로고침 뒤 남아 있는 예전 기록과 헷갈리지 않게 열 때마다 새 번호를 씀)
  const entryIdRef = useRef<string | null>(null);

  const onEntry = useCallback(
    () =>
      entryIdRef.current !== null &&
      entryIdOf(router.history.location.state) === entryIdRef.current,
    [router],
  );

  const openLightbox = useCallback(() => {
    entryCount += 1;
    const entryId = `${Date.now()}-${entryCount}`;
    entryIdRef.current = entryId;
    setOpen(true);
    // 주소는 그대로 두고 기록만 하나 쌓음
    router.history.push(router.history.location.href, { [ENTRY_STATE_KEY]: entryId });
  }, [router]);

  // 닫기 버튼·배경·Esc: 쌓아 둔 기록에 있으면 뒤로 가서 지움 (아래 구독이 닫음)
  // 뒤로 가기가 끝나기 전에 또 닫으면(더블클릭·Esc 연타) 한 번 더 뒤로 가 화면을 벗어나므로 표시를 먼저 지움
  // → 두 번째 호출은 setOpen(false)만 함. 뒤로 가기가 끝나면 구독도 onEntry() false로 보고 닫음
  const closeLightbox = useCallback(() => {
    if (onEntry()) {
      entryIdRef.current = null;
      router.history.back();
    } else setOpen(false);
  }, [router, onEntry]);

  // 뒤로 가기 등으로 크게 보기 기록에서 벗어나면 닫음
  useEffect(() => {
    if (!open) return;
    return router.history.subscribe(() => {
      if (!onEntry()) setOpen(false);
    });
  }, [open, router, onEntry]);

  return { open, openLightbox, closeLightbox };
}
