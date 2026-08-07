import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  analyticsBannerClass,
  analyticsDividerClass,
  analyticsIconBoxClass,
  analyticsIconClass,
  analyticsPageClass,
  analyticsSectionDescClass,
  analyticsSectionTitleClass,
} from "./analytics-styles";

interface AnalyticsPageShellProps {
  title: string;
  description: string;
  bannerLabel?: string;
  bannerText: string;
  icon: LucideIcon;
  children: React.ReactNode;
}

export function AnalyticsPageShell({
  title,
  description,
  bannerLabel = "Managing Partner View",
  bannerText,
  icon: Icon,
  children,
}: AnalyticsPageShellProps) {
  return (
    <div className={analyticsPageClass}>
      <PageHeader
        title={title}
        description={description}
        className="mb-4"
      />

      <Card padding="sm" className={analyticsBannerClass}>
        <div className="flex items-start gap-3">
          <div className={analyticsIconBoxClass}>
            <Icon className={analyticsIconClass} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-500">
              {bannerLabel}
            </p>
            <p className={`mt-1.5 ${analyticsSectionDescClass} text-gray-200`}>
              {bannerText}
            </p>
          </div>
        </div>
      </Card>

      {children}
    </div>
  );
}

interface AnalyticsSectionDividerProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
}

export function AnalyticsSectionDivider({
  title,
  description,
  icon: Icon,
}: AnalyticsSectionDividerProps) {
  if (!title) {
    return <hr className="border-gray-200/80" />;
  }

  return (
    <div className={`${analyticsDividerClass} pt-1`}>
      <div className="flex items-center gap-2 py-3">
        {Icon && (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy-900/5">
            <Icon className="h-3.5 w-3.5 text-navy-700" />
          </div>
        )}
        <div>
          <h2 className={analyticsSectionTitleClass}>{title}</h2>
          {description && (
            <p className={analyticsSectionDescClass}>{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
