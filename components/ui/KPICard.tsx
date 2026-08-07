import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type KpiBadgeVariant = "success" | "warning" | "danger" | "info";

interface KpiBadge {
  label: string;
  variant: KpiBadgeVariant;
}

interface KpiProgress {
  value: number;
  max?: number;
  label?: string;
}

interface KpiTrend {
  label: string;
  direction?: "up" | "down" | "flat";
  positive?: boolean;
}

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** @deprecated Use trend prop instead */
  trend?: string;
  trendInfo?: KpiTrend;
  badge?: KpiBadge;
  progress?: KpiProgress;
  size?: "default" | "large";
  gradient?: boolean;
  className?: string;
  variant?: "default" | "success";
}

const cardVariants = {
  default: "border-gray-200/80 bg-gradient-to-br from-white to-gray-50/80",
  success: "border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white",
};

const iconVariants = {
  default: "bg-navy-900 text-gold-500 shadow-sm",
  success: "bg-emerald-700 text-white shadow-sm",
};

const valueVariants = {
  default: "text-navy-900",
  success: "text-emerald-900",
};

const badgeVariants: Record<KpiBadgeVariant, string> = {
  success: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  warning: "bg-amber-100 text-amber-900 ring-amber-200",
  danger: "bg-red-100 text-red-800 ring-red-200",
  info: "bg-sky-100 text-sky-800 ring-sky-200",
};

function TrendIndicator({ trend }: { trend: KpiTrend }) {
  const positive = trend.positive ?? trend.direction === "up";
  const isFlat = trend.direction === "flat";

  const colorClass = isFlat
    ? "text-gray-500"
    : positive
      ? "text-emerald-700"
      : "text-red-600";

  const Icon =
    trend.direction === "up"
      ? ArrowUp
      : trend.direction === "down"
        ? ArrowDown
        : Minus;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        isFlat ? "bg-gray-100" : positive ? "bg-emerald-50" : "bg-red-50",
        colorClass,
      )}
    >
      <Icon className="h-3 w-3" />
      {trend.label}
    </span>
  );
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendInfo,
  badge,
  progress,
  size = "default",
  gradient = true,
  className,
  variant = "default",
}: KPICardProps) {
  const isLarge = size === "large";
  const resolvedTrend = trendInfo ?? (trend ? { label: trend, direction: "up" as const, positive: true } : undefined);
  const progressMax = progress?.max ?? 100;
  const progressPct = progress
    ? Math.min(100, Math.max(0, (progress.value / progressMax) * 100))
    : 0;

  return (
    <div
      className={cn(
        "rounded-xl border shadow-md transition-shadow hover:shadow-lg",
        gradient ? cardVariants[variant] : "border-gray-200 bg-white shadow-sm",
        isLarge ? "p-5" : "p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={cn(
                "font-medium",
                isLarge ? "text-sm" : "text-xs",
                variant === "success" ? "text-emerald-800" : "text-muted",
              )}
            >
              {title}
            </p>
            {badge && (
              <span
                className={cn(
                  "inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset",
                  badgeVariants[badge.variant],
                )}
              >
                {badge.label}
              </span>
            )}
          </div>

          <p
            className={cn(
              "mt-1.5 font-semibold tracking-tight",
              isLarge ? "text-3xl" : "text-2xl",
              valueVariants[variant],
            )}
          >
            {value}
          </p>

          {subtitle && (
            <p
              className={cn(
                "mt-1 text-xs leading-snug",
                variant === "success" ? "text-emerald-700" : "text-muted",
              )}
            >
              {subtitle}
            </p>
          )}

          {resolvedTrend && (
            <div className="mt-2">
              <TrendIndicator trend={resolvedTrend} />
            </div>
          )}

          {progress && (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[10px] font-medium text-gray-500">
                <span>{progress.label ?? "Progress"}</span>
                <span>{progress.value.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-200/80">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    progressPct >= 85
                      ? "bg-emerald-500"
                      : progressPct >= 60
                        ? "bg-amber-500"
                        : "bg-red-500",
                  )}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {Icon && (
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-xl",
              isLarge ? "h-11 w-11" : "h-10 w-10",
              iconVariants[variant],
            )}
          >
            <Icon className={isLarge ? "h-5 w-5" : "h-4 w-4"} />
          </div>
        )}
      </div>
    </div>
  );
}
