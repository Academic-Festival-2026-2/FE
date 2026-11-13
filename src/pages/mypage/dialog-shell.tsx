import { useEffect, useRef, type ReactNode } from "react";

type DialogShellProps = {
  // 제목 위 작은 영문 표시 (프로필 사진 팝업의 "PROFILE"과 같은 모양)
  eyebrow: string;
  title: string;
  titleId: string;
  // 저장 중이면 ESC·바깥 클릭으로 닫히지 않음
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
};

// 마이페이지 팝업 공통 틀 (닉네임 변경·비밀번호 변경).
// 열 때만 렌더링하고 닫으면 사라짐 → 다시 열면 입력값·오류가 초기화됨
export function DialogShell({ eyebrow, title, titleId, busy = false, onClose, children }: DialogShellProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // 화면에 나타나면 모달로 열기 (배경 어둡게, 뒤쪽 클릭 막기, 포커스 가두기)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function handleClose() {
    if (busy) return;
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={handleClose}
      // ESC: 브라우저 기본 닫기를 막고 직접 닫음
      onCancel={(event) => {
        event.preventDefault();
        handleClose();
      }}
      // 어두운 바깥(::backdrop) 클릭은 target이 dialog 자체 → 닫기. padding은 안쪽 div에 줘야 흰 상자 여백 클릭으로 안 닫힘
      onClick={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
      className="m-auto w-[min(440px,calc(100%-32px))] rounded-[18px] bg-white p-0 shadow-[0_12px_32px_rgba(0,0,0,0.1)] backdrop:bg-black/40"
    >
      <div className="p-6">
        <p className="font-mono text-[11px] tracking-[1.2px] text-brand-strong">{eyebrow}</p>
        <h2 id={titleId} className="mt-1 text-xl leading-7 font-bold text-ink">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}

// 팝업 아래 취소·확인 버튼 줄
export function DialogActions({
  busy,
  canSubmit,
  submitLabel,
  busyLabel,
  onCancel,
}: {
  busy: boolean;
  canSubmit: boolean;
  submitLabel: string;
  busyLabel: string;
  onCancel: () => void;
}) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={onCancel}
        className="h-11 rounded-[10px] border border-card-line bg-white text-sm text-ink transition-colors hover:bg-field disabled:opacity-50"
      >
        취소
      </button>
      <button
        type="submit"
        disabled={!canSubmit}
        className="h-11 rounded-[10px] bg-brand text-sm font-bold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? busyLabel : submitLabel}
      </button>
    </div>
  );
}
