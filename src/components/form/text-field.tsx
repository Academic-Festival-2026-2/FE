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
    <div className={cn("flex flex-col", isSmall ? "gap-1.5" : "gap-2")}>
      <label
        htmlFor={id}
        className={isSmall ? "text-[13px] font-bold text-gray-900" : "text-sm text-gray-600"}
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
            "w-full min-w-0 border border-[#ddd8ce] px-4 text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#ff8a3d] focus:bg-white",
            isSmall
              ? "h-10 rounded-[10px] bg-white text-sm"
              : "h-12 rounded-xl bg-[#f7f5f0] text-base",
            error && "border-red-400 focus:border-red-400",
          )}
        />
        {action}
      </div>
      {message && (
        <p id={messageId} className={cn("text-xs", error ? "text-red-500" : "text-gray-500")}>
          {message}
        </p>
      )}
    </div>
  );
}
