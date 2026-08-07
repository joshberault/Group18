/** Shared layout tokens for analytics pages */
export const analyticsPageClass = "space-y-5 pb-2";
export const analyticsSectionClass = "space-y-3";
export const analyticsGridGap = "gap-3";
export const analyticsCardClass =
  "border-gray-200/90 shadow-md bg-gradient-to-br from-white to-gray-50/50";
export const analyticsBannerClass =
  "border-gold-500/25 bg-gradient-to-r from-navy-900 to-navy-800 text-white shadow-md";
export const analyticsSectionTitleClass =
  "text-sm font-bold tracking-tight text-navy-900";
export const analyticsSectionDescClass = "text-xs leading-relaxed text-gray-500";
export const analyticsDividerClass = "border-t border-gray-200/80";
export const analyticsTableWrapClass = "overflow-x-auto px-1 pb-1";
export const analyticsIconBoxClass =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10";
export const analyticsIconClass = "h-4 w-4 text-gold-500";

export const analyticsRowHealthClass = {
  green: "bg-emerald-50/40 hover:bg-emerald-50/70",
  yellow: "bg-amber-50/50 hover:bg-amber-50/80",
  red: "bg-red-50/40 hover:bg-red-50/70",
} as const;
