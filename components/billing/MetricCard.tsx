import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { KPICard } from "@/components/ui/KPICard";
import { cn } from "@/lib/utils/cn";

type MetricCardProps = {
  eyebrow?: string;
  label: string;
  value: string;
  detail?: string;
  detailTone?: "default" | "attention";
  hint?: string;
  tone?: "default" | "attention" | "positive";
  href?: string;
  actionLabel?: string;
  actionHref?: string;
  actionStyle?: "link" | "button";
  icon?: LucideIcon;
};

export function MetricCard({
  eyebrow,
  label,
  value,
  detail,
  detailTone = "default",
  hint,
  tone = "default",
  href,
  actionLabel,
  actionHref,
  actionStyle = "button",
  icon,
}: MetricCardProps) {
  const subtitleParts = [eyebrow, detail, hint].filter(Boolean);
  const subtitle = subtitleParts.length ? subtitleParts.join(" · ") : undefined;

  const card = (
    <KPICard
      title={label}
      value={value}
      subtitle={subtitle}
      icon={icon}
      className={cn(
        "h-full",
        tone === "attention" && "border-amber-200",
        tone === "positive" && "border-green-200",
        detailTone === "attention" && "ring-1 ring-amber-100",
      )}
    />
  );

  return (
    <div className="flex h-full flex-col gap-3">
      {href && !(actionLabel && actionHref) ? (
        <Link
          href={href}
          className="block flex-1 transition-opacity hover:opacity-90"
        >
          {card}
        </Link>
      ) : (
        <div className="flex-1">{card}</div>
      )}
      {actionLabel && actionHref ? (
        actionStyle === "button" ? (
          <Link
            href={actionHref}
            className="inline-flex h-10 w-full shrink-0 items-center justify-center rounded-lg bg-navy-900 px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-900 focus-visible:ring-offset-2"
          >
            {actionLabel}
          </Link>
        ) : (
          <Link
            href={actionHref}
            className="text-sm font-semibold text-navy-900 underline underline-offset-2 hover:text-navy-700"
          >
            {actionLabel}
          </Link>
        )
      ) : null}
    </div>
  );
}
