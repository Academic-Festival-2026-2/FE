import { cn } from "../../utils/cn";

type SwitchProps = {
  checked: boolean;
  // 화면 낭독기에 읽히는 이름 (옆 글자와 같게)
  label: string;
  disabled?: boolean;
  onToggle: () => void;
};

// 켜고 끄는 스위치 (마이페이지 위치정보 동의·나의 지도 공유)
export function Switch({ checked, label, disabled, onToggle }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "relative h-[26px] w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-brand" : "bg-line-strong",
      )}
    >
      <span
        className={cn(
          "absolute top-[3px] left-[3px] size-5 rounded-full bg-white transition-transform",
          checked && "translate-x-[18px]",
        )}
      />
    </button>
  );
}
