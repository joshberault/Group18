import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({
  label,
  error,
  className,
  id,
  ...props
}: TextareaProps) {
  const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={textareaId}
          className="text-sm font-medium text-navy-900"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cn(
          "min-h-[100px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-navy-900 placeholder:text-gray-400 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20 disabled:opacity-50",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
