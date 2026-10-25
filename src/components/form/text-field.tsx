import type { HTMLInputTypeAttribute } from "react";
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
}: TextFieldProps) {
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
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
          "h-12 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#3b6fb6] focus:bg-white",
          error && "border-red-400 focus:border-red-400",
        )}
      />
      {message && (
        <p id={messageId} className={cn("text-xs", error ? "text-red-500" : "text-gray-400")}>
          {message}
        </p>
      )}
    </div>
  );
}
