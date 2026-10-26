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
}: TextFieldProps) {
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm text-gray-600">
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
            "h-12 w-full min-w-0 rounded-xl border border-[#ddd8ce] bg-[#f7f5f0] px-4 text-base text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#ff8a3d] focus:bg-white",
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
