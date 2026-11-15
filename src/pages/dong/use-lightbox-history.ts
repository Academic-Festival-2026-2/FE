import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";

// 크게 보기(라이트박스)를 열 때 브라우저 기록을 하나 쌓아, 뒤로 가기를 누르면 화면을 벗어나지 않고 크게 보기만 닫음
// 동 화면 사진 카드와 좋아요한 사진 모아보기가 같이 씀
export function useLightboxHistory() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // 크게 보기를 열 때 쌓은 기록의 key. 이 기록에서 벗어나면(뒤로 가기 등) 닫힌 것으로 봄
  // (새로고침 뒤 남아 있는 예전 기록과 헷갈리지 않게 표시 값이 아닌 key로 확인)
  const entryKeyRef = useRef<string | null>(null);

  const onEntry = useCallback(
    () =>
      entryKeyRef.current !== null &&
      router.history.location.state.__TSR_key === entryKeyRef.current,
    [router],
  );

  const openLightbox = useCallback(() => {
    setOpen(true);
    // 주소는 그대로 두고 기록만 하나 쌓음
    router.history.push(router.history.location.href);
    entryKeyRef.current = router.history.location.state.__TSR_key ?? null;
  }, [router]);

  // 닫기 버튼·배경·Esc: 쌓아 둔 기록에 있으면 뒤로 가서 지움 (아래 구독이 닫음)
  const closeLightbox = useCallback(() => {
    if (onEntry()) router.history.back();
    else setOpen(false);
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
