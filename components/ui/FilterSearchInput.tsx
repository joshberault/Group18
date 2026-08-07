import type { InputHTMLAttributes } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";

interface FilterSearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

/** Search field with label spacing that aligns with labeled Select rows in filter grids. */
export function FilterSearchInput({
  label = "Search",
  className,
  id,
  ...props
}: FilterSearchInputProps) {
  const inputId = id ?? "filter-search";

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-navy-900">
        {label}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          id={inputId}
          className={cn("pl-9", className)}
          {...props}
        />
      </div>
    </div>
  );
}
