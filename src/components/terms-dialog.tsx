import { useEffect, useRef } from "react";
import type { TermContent } from "../constants/terms/types";
import { cn } from "../utils/cn";

type TermsDialogProps = {
  term: TermContent;
  onClose: () => void;
};

// 약관 본문 보기. 열 때만 렌더링하고 닫으면 사라짐
export function TermsDialog({ term, onClose }: TermsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // 화면에 나타나면 모달로 열기 (showModal: 배경 어둡게, 뒤쪽 클릭 막기, 포커스 가두기)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="terms-dialog-title"
      onClose={onClose}
      // ESC: 브라우저 기본 닫기를 막고 직접 닫음
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // 어두운 바깥 클릭 시 닫기. padding은 안쪽 div에 줘야 흰 상자 여백 클릭으로 안 닫힘
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto w-[min(560px,calc(100%-32px))] rounded-3xl bg-white p-0 backdrop:bg-black/40"
    >
      <div className="flex max-h-[calc(100dvh-64px)] flex-col p-6">
        <h2 id="terms-dialog-title" className="text-xl font-extrabold text-gray-900">
          {term.title}
        </h2>

        {/* 본문만 스크롤 */}
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 text-sm leading-relaxed text-gray-700">
          {term.sections.map((section, index) => (
            <section key={index} className="mt-5 first:mt-0">
              {section.heading && <h3 className="font-bold text-gray-900">{section.heading}</h3>}
              {section.body.map((line, lineIndex) => (
                <p
                  key={lineIndex}
                  className={cn(
                    "mt-1",
                    line.startsWith("- ") && "pl-3",
                    line.startsWith("※") && "text-gray-500",
                  )}
                >
                  {line}
                </p>
              ))}
            </section>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 h-11 w-full shrink-0 rounded-[10px] bg-[#ff8a3d] text-sm font-bold text-gray-900 transition-colors hover:bg-[#f57a2a]"
        >
          확인
        </button>
      </div>
    </dialog>
  );
}
