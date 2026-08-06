import type { MatterHealthLevel } from "@/lib/analytics/matter-health";
import {
  getMatterHealthLabel,
  getMatterHealthStyles,
} from "@/lib/analytics/matter-health";
import { cn } from "@/lib/utils/cn";

interface MatterHealthBadgeProps {
  level: MatterHealthLevel;
  compact?: boolean;
  className?: string;
}

export function MatterHealthBadge({
  level,
  compact = false,
  className,
}: MatterHealthBadgeProps) {
  const styles = getMatterHealthStyles(level);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        styles.badge,
        compact && "px-2 py-0.5 text-[11px]",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", styles.dot)} />
      {getMatterHealthLabel(level)}
    </span>
  );
}
