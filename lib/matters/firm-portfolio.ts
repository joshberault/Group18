import { DEMO_MATTERS } from "@/lib/attorney/demo-data";
import { amMatters } from "@/lib/mock-data/accounting-manager/entities";
import { PARALEGAL_ASSIGNED_MATTERS } from "@/lib/paralegal/demo-data";
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
  /** Null means unassigned / coverage gap */
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

/** Attorneys available for assignment in the partner register. */
export const FIRM_PORTFOLIO_ATTORNEYS = [
  "Morgan Counsel",
  "Avery Counsel",
  "George Giddens",
  "Sarah Chen",
  "Michael Torres",
  "Jennifer Walsh",
  "David Kim",
  "Rachel Foster",
] as const;

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

function mapBillingType(
  billing: string | null | undefined,
): EngagementFeeType {
  switch ((billing ?? "").toLowerCase().replace(/\s+/g, "_")) {
    case "fixed_fee":
    case "flat":
    case "flat_fee":
      return "flat";
    case "contingency":
      return "contingency";
    case "retainer":
      return "retainer";
    case "hybrid":
      return "hybrid";
    default:
      return "hourly";
  }
}

function mapAmStatus(
  status: "Open" | "Pending Close" | "Closed",
): MatterLifecycleStatus {
  if (status === "Closed") return "closed";
  if (status === "Pending Close") return "on_hold";
  return "open";
}

/**
 * Firm-wide matter register seed:
 * attorney + paralegal demo matters first, then accounting-manager portfolio,
 * plus a few synthetic coverage/lifecycle examples.
 */
export function buildFirmPortfolioSeed(): FirmPortfolioMatter[] {
  const byId = new Map<string, FirmPortfolioMatter>();

  for (const matter of DEMO_MATTERS) {
    const client = matter.client;
    const practiceArea = matter.practice_area?.name ?? "General";
    const conflict: ConflictCheckStatus = client?.conflict_flag
      ? "possible_conflict"
      : "cleared";
    byId.set(matter.id, {
      id: matter.id,
      matterNumber: `M-${matter.id.replace("matter-", "24")}`,
      title: matter.title,
      clientId: client?.id ?? null,
      clientName: client?.company_name ?? client?.name ?? "Unknown client",
      practiceArea,
      responsibleAttorney: "Avery Counsel",
      originatingAttorney: "Morgan Counsel",
      status: matter.status === "open" ? "open" : "closed",
      feeType: mapBillingType(matter.billing_type),
      hourlyRate: matter.hourly_rate,
      flatFeeAmount: matter.fixed_fee_amount,
      budgetCap: matter.fixed_fee_amount ?? (matter.hourly_rate ? 50000 : null),
      billingHold: Boolean(client?.conflict_flag),
      conflictStatus: conflict,
      needsPartnerReview: Boolean(client?.conflict_flag),
      partnerReviewReason: client?.conflict_flag
        ? "Conflict flag on client record — confirm engagement may continue"
        : null,
      openDate: "2026-06-12",
      engagementScope: matter.description ?? matter.title,
    });
  }

  for (const matter of PARALEGAL_ASSIGNED_MATTERS) {
    const existing = byId.get(matter.id);
    byId.set(matter.id, {
      id: matter.id,
      matterNumber: matter.matterNumber,
      title: matter.title,
      clientId: matter.clientId,
      clientName: matter.clientName,
      practiceArea: matter.practiceArea,
      responsibleAttorney: matter.attorneyName,
      originatingAttorney:
        existing?.originatingAttorney ??
        (matter.attorneyName === "Morgan Counsel"
          ? "Morgan Counsel"
          : "Morgan Counsel"),
      status: matter.status,
      feeType: existing?.feeType ?? "hourly",
      hourlyRate: existing?.hourlyRate ?? 350,
      flatFeeAmount: existing?.flatFeeAmount ?? null,
      budgetCap: existing?.budgetCap ?? 45000,
      billingHold:
        existing?.billingHold ||
        matter.conflictStatus === "possible_conflict" ||
        matter.status === "on_hold",
      conflictStatus: matter.conflictStatus,
      needsPartnerReview:
        matter.conflictStatus !== "cleared" ||
        matter.status === "on_hold" ||
        Boolean(existing?.needsPartnerReview),
      partnerReviewReason:
        matter.conflictStatus === "possible_conflict"
          ? "Possible conflict — partner clearance required"
          : matter.conflictStatus === "pending"
            ? "Conflict check still pending"
            : matter.status === "on_hold"
              ? "Matter on hold — partner decision to reopen or close"
              : (existing?.partnerReviewReason ?? null),
      openDate: matter.openDate,
      engagementScope: matter.engagementScope,
    });
  }

  for (const matter of amMatters) {
    const id = `am-${matter.id}`;
    byId.set(id, {
      id,
      matterNumber: matter.matterNumber,
      title: matter.matterName,
      clientId: matter.clientId,
      clientName: matter.client,
      practiceArea: matter.practiceArea,
      responsibleAttorney: matter.attorney,
      originatingAttorney: matter.attorney,
      status: mapAmStatus(matter.matterStatus),
      feeType: mapBillingType(matter.billingMethod),
      hourlyRate: matter.billingMethod === "Hourly" ? 425 : null,
      flatFeeAmount:
        matter.billingMethod === "Flat Fee" ? matter.budget : null,
      budgetCap: matter.budget,
      billingHold: matter.billingHold,
      conflictStatus: matter.billingHold ? "pending" : "cleared",
      needsPartnerReview:
        matter.billingHold ||
        matter.financialStatus === "Over Budget" ||
        matter.matterStatus === "Pending Close",
      partnerReviewReason: matter.billingHold
        ? "Billing hold in effect — partner must release or keep hold"
        : matter.financialStatus === "Over Budget"
          ? "Over budget — review fee arrangement or staffing"
          : matter.matterStatus === "Pending Close"
            ? "Pending close — confirm archive vs. reopen"
            : null,
      openDate: "2025-11-01",
      engagementScope: `${matter.practiceArea} engagement for ${matter.client}`,
    });
  }

  const extras: FirmPortfolioMatter[] = [
    {
      id: "fp-unassigned-1",
      matterNumber: "2026-NW-0099",
      title: "Interim General Counsel Support",
      clientId: null,
      clientName: "Lakeside Foods Co.",
      practiceArea: "Corporate",
      responsibleAttorney: null,
      originatingAttorney: "Morgan Counsel",
      status: "open",
      feeType: "hourly",
      hourlyRate: 475,
      flatFeeAmount: null,
      budgetCap: 30000,
      billingHold: false,
      conflictStatus: "cleared",
      needsPartnerReview: true,
      partnerReviewReason: "No responsible attorney assigned",
      openDate: "2026-08-02",
      engagementScope: "Fractional GC coverage pending staffing assignment",
    },
    {
      id: "fp-closed-1",
      matterNumber: "2024-LT-0210",
      title: "Riverbend Settlement Wrap-Up",
      clientId: "client-riverbend",
      clientName: "Riverbend Holdings",
      practiceArea: "Litigation",
      responsibleAttorney: "Avery Counsel",
      originatingAttorney: "Morgan Counsel",
      status: "closed",
      feeType: "contingency",
      hourlyRate: null,
      flatFeeAmount: null,
      budgetCap: null,
      billingHold: false,
      conflictStatus: "cleared",
      needsPartnerReview: false,
      partnerReviewReason: null,
      openDate: "2024-03-18",
      engagementScope: "Closed after settlement — await archive decision",
    },
    {
      id: "fp-archived-1",
      matterNumber: "2023-RE-0088",
      title: "Oak Street Lease Archive",
      clientId: "client-oak",
      clientName: "Oak Street Partners",
      practiceArea: "Real Estate",
      responsibleAttorney: "Sarah Chen",
      originatingAttorney: "Sarah Chen",
      status: "archived",
      feeType: "flat",
      hourlyRate: null,
      flatFeeAmount: 12000,
      budgetCap: 12000,
      billingHold: false,
      conflictStatus: "cleared",
      needsPartnerReview: false,
      partnerReviewReason: null,
      openDate: "2023-09-01",
      engagementScope: "Fully archived lease negotiation matter",
    },
  ];

  for (const matter of extras) {
    byId.set(matter.id, matter);
  }

  return Array.from(byId.values()).sort((a, b) =>
    a.matterNumber.localeCompare(b.matterNumber),
  );
}

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
