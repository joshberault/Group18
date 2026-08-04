import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({
  message = "Loading...",
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-6 py-16",
        className,
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin text-navy-700" />
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}
