import type { ConflictCheckStatus } from "@/lib/clients/types";

export type MatterLifecycleStatus =
  | "open"
  | "on_hold"
  | "closed"
  | "archived";

export type EngagementFeeType =
  | "hourly"
  | "flat"
  | "contingency"
  | "retainer"
  | "hybrid";

export interface FirmPortfolioMatter {
  id: string;
  matterNumber: string;
  title: string;
  clientId: string | null;
  clientName: string;
  practiceArea: string;
  responsibleAttorney: string | null;
  originatingAttorney: string | null;
  status: MatterLifecycleStatus;
  feeType: EngagementFeeType;
  hourlyRate: number | null;
  flatFeeAmount: number | null;
  budgetCap: number | null;
  billingHold: boolean;
  conflictStatus: ConflictCheckStatus;
  needsPartnerReview: boolean;
  partnerReviewReason: string | null;
  openDate: string;
  engagementScope: string;
}

/** Populated at runtime from Supabase profiles. */
export const FIRM_PORTFOLIO_ATTORNEYS: string[] = [];

export const FEE_TYPE_LABELS: Record<EngagementFeeType, string> = {
  hourly: "Hourly",
  flat: "Flat fee",
  contingency: "Contingency",
  retainer: "Retainer",
  hybrid: "Hybrid",
};

export const LIFECYCLE_LABELS: Record<MatterLifecycleStatus, string> = {
  open: "Open",
  on_hold: "On hold",
  closed: "Closed",
  archived: "Archived",
};

const OVERLOAD_OPEN_THRESHOLD = 2;

export function countOpenByAttorney(
  matters: FirmPortfolioMatter[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const matter of matters) {
    if (matter.status !== "open" && matter.status !== "on_hold") continue;
    const key = matter.responsibleAttorney ?? "__unassigned__";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export function isAttorneyOverloaded(
  matters: FirmPortfolioMatter[],
  attorney: string | null,
): boolean {
  if (!attorney) return false;
  const counts = countOpenByAttorney(matters);
  return (counts[attorney] ?? 0) > OVERLOAD_OPEN_THRESHOLD;
}

export function formatFeeSummary(matter: FirmPortfolioMatter): string {
  const label = FEE_TYPE_LABELS[matter.feeType];
  if (matter.feeType === "hourly" && matter.hourlyRate != null) {
    return `${label} · $${matter.hourlyRate}/hr`;
  }
  if (
    (matter.feeType === "flat" || matter.feeType === "retainer") &&
    matter.flatFeeAmount != null
  ) {
    return `${label} · $${matter.flatFeeAmount.toLocaleString()}`;
  }
  if (matter.budgetCap != null) {
    return `${label} · cap $${matter.budgetCap.toLocaleString()}`;
  }
  return label;
}
