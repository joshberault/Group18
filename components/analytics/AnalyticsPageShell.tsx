import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  analyticsBannerClass,
  analyticsIconBoxClass,
  analyticsIconClass,
  analyticsPageClass,
  analyticsSectionDescClass,
} from "./analytics-styles";

interface AnalyticsPageShellProps {
  title: string;
  description: string;
  bannerLabel?: string;
  bannerText: string;
  icon: LucideIcon;
  children: React.ReactNode;
  /** Skip page chrome when nested inside another analytics page. */
  embedded?: boolean;
}

export function AnalyticsPageShell({
  title,
  description,
  bannerLabel = "Managing Partner View",
  bannerText,
  icon: Icon,
  children,
  embedded = false,
}: AnalyticsPageShellProps) {
  if (embedded) {
    return <div className="space-y-6">{children}</div>;
  }

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

export function AnalyticsSectionDivider() {
  return <hr className="border-gray-100" />;
}
