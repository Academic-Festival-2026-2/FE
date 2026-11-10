import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";

type LoginPromptDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function LoginPromptDialog({ open, onClose }: LoginPromptDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="login-prompt-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto w-[min(400px,calc(100%-32px))] rounded-3xl bg-white p-6 backdrop:bg-black/40"
    >
      <p className="font-mono text-xs tracking-[0.15em] text-[#c4581a]">MY MAP</p>
      <h2 id="login-prompt-title" className="mt-1 text-xl font-extrabold text-gray-900">
        로그인하면 내 지도를 볼 수 있어요
      </h2>
      <p className="mt-2 text-sm text-[#55524c]">
        내가 올린 사진으로 칠한 동을 시간대별로 모아서 보여 줘요.
      </p>

      <div className="mt-6 flex flex-col gap-2">
        <Link
          to="/login"
          className="flex h-12 items-center justify-center rounded-xl bg-[#ff8a3d] font-bold text-gray-900 hover:bg-[#f57a2a]"
        >
          로그인
        </Link>
        <Link
          to="/signup"
          className="flex h-12 items-center justify-center rounded-xl border border-[#ddd8ce] font-bold text-gray-900 hover:bg-[#f7f5f0]"
        >
          회원가입
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="mt-1 h-10 text-sm text-[#6b675f] underline underline-offset-4 hover:text-gray-900"
        >
          지도만 계속 둘러보기
        </button>
      </div>
    </dialog>
  );
}
