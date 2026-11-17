import { useEffect, type RefObject } from "react";

type DismissOptions = {
  // 바깥 누름을 알아챌 이벤트. 터치 기기 전용 말풍선은 pointerdown
  pointer?: "mousedown" | "pointerdown";
  // Esc로도 닫을지
  escape?: boolean;
};

// 열려 있는 메뉴·목록·말풍선을 ref 바깥을 누르거나 Esc를 누르면 닫음
export function useDismiss(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  setOpen: (open: boolean) => void,
  { pointer = "mousedown", escape = true }: DismissOptions = {},
) {
  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: Event) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener(pointer, handlePointer);
    if (escape) document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener(pointer, handlePointer);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [ref, open, setOpen, pointer, escape]);
}
