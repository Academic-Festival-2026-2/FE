import type { InputHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> & {
  onChange: (checked: boolean) => void;
};

// 피그마 Pixel/Checkbox: 18px, 테두리 1.5px, 체크하면 브랜드 색으로 채움
export function Checkbox({ className, onChange, ...props }: CheckboxProps) {
  return (
    <span className={cn("relative inline-flex size-[18px] shrink-0", className)}>
      <input
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
        className="peer m-0 size-full cursor-pointer appearance-none rounded-[3px] border-[1.5px] border-check-line bg-white transition-colors checked:border-brand checked:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        {...props}
      />
      <svg
        viewBox="0 0 18 18"
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden size-full text-white peer-checked:block"
      >
        <path
          d="M4.5 9.2l3 3 6-6.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
