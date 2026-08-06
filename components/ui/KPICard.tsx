import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: string;
  className?: string;
  variant?: "default" | "success";
}

const cardVariants = {
  default: "border-gray-200 bg-white",
  success: "border-emerald-200 bg-emerald-50",
};

const iconVariants = {
  default: "bg-navy-900 text-gold-500",
  success: "bg-emerald-700 text-white",
};

const valueVariants = {
  default: "text-navy-900",
  success: "text-emerald-900",
};

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  variant = "default",
}: KPICardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-5 shadow-sm",
        cardVariants[variant],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "text-sm font-medium",
              variant === "success" ? "text-emerald-800" : "text-muted",
            )}
          >
            {title}
          </p>
          <p
            className={cn(
              "mt-2 text-2xl font-semibold tracking-tight",
              valueVariants[variant],
            )}
          >
            {value}
          </p>
          {subtitle && (
            <p
              className={cn(
                "mt-1 text-xs",
                variant === "success" ? "text-emerald-700" : "text-muted",
              )}
            >
              {subtitle}
            </p>
          )}
          {trend && (
            <p className="mt-2 text-xs font-medium text-green-700">{trend}</p>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              iconVariants[variant],
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
