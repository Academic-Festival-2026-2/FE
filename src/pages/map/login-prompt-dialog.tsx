import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { LogoMark } from "../../components/layout/logo-mark";

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
      className="m-auto w-[min(484px,calc(100%-32px))] rounded-[20px] bg-white p-0 shadow-[0_12px_32px_rgba(0,0,0,0.1)] backdrop:bg-black/40"
    >
      <div className="flex flex-col items-center px-8 pt-8 pb-7 text-center">
        <LogoMark size={48} />
        <h2 id="login-prompt-title" className="mt-5 text-[22px] font-extrabold text-ink">
          내 사진으로 지도를 칠해 보세요
        </h2>
        <p className="mt-2 text-sm leading-[22px] text-ink-sub">
          사진을 올리고 내 지도를 모으려면
          <br />
          로그인이 필요해요.
        </p>

        <Link
          to="/login"
          className="mt-8 flex h-[52px] w-full items-center justify-center rounded-xl bg-brand font-extrabold text-white transition-colors hover:bg-brand-hover"
        >
          이메일로 로그인
        </Link>
        <p className="mt-4 text-sm text-ink-sub">
          처음이신가요?{" "}
          <Link to="/signup" className="font-bold text-brand-strong underline underline-offset-4 hover:text-brand">
            회원가입
          </Link>
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 text-[13px] text-ink-muted underline underline-offset-4 hover:text-ink"
        >
          지도만 계속 둘러보기
        </button>
      </div>
    </dialog>
  );
}
