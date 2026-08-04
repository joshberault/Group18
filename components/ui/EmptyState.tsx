import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Badge } from "./Badge";

interface EmptyStateProps {
  title: string;
  description: string;
  moduleLabel?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  moduleLabel = "Ready for feature development",
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center",
        className,
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold-100 text-gold-500">
        {icon ?? <FolderOpen className="h-7 w-7" />}
      </div>
      <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted">{description}</p>
      <Badge variant="gold" className="mt-4">{moduleLabel}</Badge>
    </div>
  );
}
