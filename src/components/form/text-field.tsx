import type { HTMLInputTypeAttribute, ReactNode } from "react";
import { cn } from "../../utils/cn";

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
  autoComplete?: string;
  error?: string | null;
  hint?: string;
  // 입력칸 오른쪽에 붙는 버튼 등
  action?: ReactNode;
  // md: 로그인·회원가입, sm: 마이페이지처럼 카드 안에 들어가는 작은 입력칸
  size?: "md" | "sm";
};

export function TextField({
  id,
  label,
  value,
  onChange,
  onBlur,
  type = "text",
  placeholder,
  autoComplete,
  error,
  hint,
  action,
  size = "md",
}: TextFieldProps) {
  const messageId = `${id}-message`;
  const message = error ?? hint;
  const isSmall = size === "sm";

  return (
    <div className={cn("flex flex-col", isSmall ? "gap-1" : "gap-2")}>
      <label
        htmlFor={id}
        className={isSmall ? "text-[13px] leading-[19px] font-bold text-ink" : "text-sm font-bold text-ink"}
      >
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={cn(
            "w-full min-w-0 border text-ink outline-none transition-colors focus:border-brand focus:bg-white",
            isSmall
              ? "h-10 rounded-[10px] border-field-line bg-white px-3.5 text-sm placeholder:text-ink-muted"
              : // 브라우저 자동 완성의 노란 배경 대신 입력칸 배경색 유지
                "h-12 rounded-[10px] border-field-line bg-field px-3.5 text-[15px] placeholder:text-ink-placeholder autofill:shadow-[inset_0_0_0_1000px_var(--color-field)]",
            error && "border-[#c2402f] focus:border-[#c2402f]",
          )}
        />
        {action}
      </div>
      {message && (
        <p id={messageId} className={cn("text-xs leading-[18px]", error ? "text-[#c2402f]" : "text-ink-muted")}>
          {message}
        </p>
      )}
    </div>
  );
}
