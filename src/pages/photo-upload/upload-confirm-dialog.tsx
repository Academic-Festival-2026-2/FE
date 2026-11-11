import { useEffect, useRef, useState } from "react";
import lock from "../../assets/icons/lock.svg";
import radioFilled from "../../assets/icons/radio-filled.svg";

type Props = {
  // 예) "역곡3동 · 노을"
  summary: string;
  defaultPublic: boolean;
  // 서버가 exifVerified로 볼 사진인지 FE에서 미리 판단한 값. false면 공개 카드를 잠금
  // (직접 입력한 사진은 공개해도 지도·사진 점에 나오지 않음. 최종 판정은 서버)
  canBePublic: boolean;
  onCancel: () => void;
  onConfirm: (isPublic: boolean) => void;
};

// 피그마 "업로드 팝업" 구조. 문구는 지금 BE 기준:
// isPublic은 동 상세에 사진 점을 보여 줄지만 정하고, 칸 색 집계(EXIF 확인 + AI 검수 통과)와는 관계없음
const OPTIONS = [
  { value: true, title: "사진 공개", description: "동 지도에서 다른 사람도 내 사진을 볼 수 있어요", confirm: "공개하고 더하기" },
  { value: false, title: "나만 보기", description: "사진은 다른 사람에게 보이지 않아요", confirm: "나만 보기로 더하기" },
];

export function UploadConfirmDialog({ summary, defaultPublic, canBePublic, onCancel, onConfirm }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [isPublic, setIsPublic] = useState(canBePublic && defaultPublic);
  const selected = OPTIONS.find((option) => option.value === isPublic) ?? OPTIONS[0];

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return <dialog ref={dialog} onCancel={onCancel} aria-labelledby="upload-confirm-title" className="m-auto w-[min(460px,94vw)] rounded-[20px] bg-white p-7 text-ink shadow-[0_8px_16px_rgba(0,0,0,0.12)] backdrop:bg-black/40">
    <div className="flex items-center justify-between">
      <h2 id="upload-confirm-title" className="text-[22px] leading-[26px] font-extrabold">사진을 공개할까요?</h2>
      <button type="button" onClick={onCancel} aria-label="닫기" className="flex size-9 items-center justify-center rounded-[10px] border border-line text-ink-sub hover:bg-field"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></button>
    </div>
    <p className="pt-2 text-sm leading-[17px] text-ink-sub">{summary} 지도에 픽셀 하나가 찍혀요</p>
    <div role="radiogroup" aria-labelledby="upload-confirm-title" className="flex flex-col gap-2.5 pt-5">
      {OPTIONS.map((option) => {
        const active = option.value === isPublic;
        const locked = option.value && !canBePublic;
        if (locked) {
          return <div key={option.title} role="radio" aria-checked={false} aria-disabled className="flex w-full items-center gap-3 rounded-[14px] border border-line bg-page p-4 opacity-50">
            <span className="size-[18px] shrink-0 rounded-full border-[1.5px] border-ink-muted bg-white" aria-hidden />
            <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <span className="text-base leading-[19px] font-bold text-ink-muted">{option.title}</span>
              <span className="text-[13px] leading-4 text-brand-strong">정보를 직접 입력한 사진은 공개할 수 없어요</span>
            </span>
            <img src={lock} alt="" width={16} height={16} className="shrink-0" />
          </div>;
        }
        return <button key={option.title} type="button" role="radio" aria-checked={active} onClick={() => setIsPublic(option.value)} className={`flex w-full items-center gap-3 rounded-[14px] text-left transition-colors ${active ? "border-2 border-[#16161a] bg-[#edf2fc] p-[15px]" : "border border-line bg-white p-4 hover:bg-field"}`}>
          {active ? <img src={radioFilled} alt="" width={18} height={18} className="shrink-0" /> : <span className="size-[18px] shrink-0 rounded-full border-[1.5px] border-line bg-white" aria-hidden />}
          <span className="flex min-w-0 flex-col gap-[3px]">
            <span className="text-base leading-[19px] font-bold">{option.title}</span>
            <span className="text-[13px] leading-4 text-ink-sub">{option.description}</span>
          </span>
        </button>;
      })}
    </div>
    <div className="flex justify-end gap-2 pt-5">
      <button type="button" onClick={onCancel} className="h-12 rounded-xl border border-line bg-white px-5 text-[15px] text-ink-sub hover:bg-field">취소</button>
      <button type="button" onClick={() => onConfirm(isPublic)} className="h-12 rounded-xl bg-brand px-6 text-[15px] font-extrabold text-white transition-colors hover:bg-brand-hover">{selected.confirm}</button>
    </div>
  </dialog>;
}
