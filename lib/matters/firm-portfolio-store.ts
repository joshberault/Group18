import type {
  EngagementFeeType,
  FirmPortfolioMatter,
  MatterEngagementStatus,
  MatterLifecycleStatus,
} from "@/lib/matters/firm-portfolio";
import { persistFirmPortfolioPatch } from "@/lib/matters/supabase-portfolio";

export const FIRM_PORTFOLIO_STORAGE_KEY =
  "counselflow-firm-portfolio-matters-v1";
export const FIRM_PORTFOLIO_UPDATE_EVENT = "firm-portfolio-matters-updated";

type MatterPatch = Partial<
  Pick<
    FirmPortfolioMatter,
    | "status"
    | "activationStatus"
    | "engagementStatus"
    | "feeType"
    | "hourlyRate"
    | "flatFeeAmount"
    | "budgetCap"
    | "billingHold"
    | "responsibleAttorney"
    | "originatingAttorney"
    | "needsPartnerReview"
    | "partnerReviewReason"
    | "conflictStatus"
  >
>;

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readPatches(): Record<string, MatterPatch> {
  if (!canUseStorage()) return {};
  try {
    const raw = localStorage.getItem(FIRM_PORTFOLIO_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, MatterPatch>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writePatches(patches: Record<string, MatterPatch>) {
  if (!canUseStorage()) return;
  localStorage.setItem(FIRM_PORTFOLIO_STORAGE_KEY, JSON.stringify(patches));
  window.dispatchEvent(new Event(FIRM_PORTFOLIO_UPDATE_EVENT));
}

function queueSupabasePersist(id: string, patch: MatterPatch) {
  void persistFirmPortfolioPatch(id, {
    status: patch.status,
    activationStatus: patch.activationStatus,
    engagementStatus: patch.engagementStatus,
    feeType: patch.feeType,
    hourlyRate: patch.hourlyRate,
    flatFeeAmount: patch.flatFeeAmount,
    budgetCap: patch.budgetCap,
    billingHold: patch.billingHold,
    responsibleAttorney: patch.responsibleAttorney,
    needsPartnerReview: patch.needsPartnerReview,
    partnerReviewReason: patch.partnerReviewReason,
  }).then((result) => {
    if (!result.ok) {
      console.warn("Matter governance persist failed:", result.error);
    }
  });
}

/** Merge localStorage partner edits onto any base portfolio (Supabase or seed). */
export function applyFirmPortfolioPatches(
  base: FirmPortfolioMatter[],
): FirmPortfolioMatter[] {
  const patches = readPatches();
  return base.map((matter) => {
    const patch = patches[matter.id];
    return patch ? { ...matter, ...patch } : matter;
  });
}

export function getFirmPortfolioMatters(): FirmPortfolioMatter[] {
  return applyFirmPortfolioPatches(getFirmPortfolioBaseOrSeed());
}

/** Live base portfolio for Managing Partner /matters (set by the view from Supabase). */
let liveBasePortfolio: FirmPortfolioMatter[] | null = null;

export function setFirmPortfolioBase(
  base: FirmPortfolioMatter[] | null,
): void {
  liveBasePortfolio = base;
}

/** Empty until setFirmPortfolioBase loads Supabase rows (no mock seed on main). */
export function getFirmPortfolioBaseOrSeed(): FirmPortfolioMatter[] {
  return liveBasePortfolio ?? [];
}

export function getLiveFirmPortfolioMatters(): FirmPortfolioMatter[] {
  return applyFirmPortfolioPatches(getFirmPortfolioBaseOrSeed());
}

export function updateFirmPortfolioMatter(
  id: string,
  patch: MatterPatch,
): FirmPortfolioMatter[] {
  const patches = readPatches();
  patches[id] = { ...(patches[id] ?? {}), ...patch };
  writePatches(patches);
  queueSupabasePersist(id, patches[id] ?? patch);
  return getLiveFirmPortfolioMatters();
}

export function setMatterLifecycle(
  id: string,
  status: MatterLifecycleStatus,
): FirmPortfolioMatter[] {
  const next: MatterPatch = { status };
  if (status === "open") {
    next.activationStatus = "active";
  } else if (status === "on_hold") {
    next.activationStatus = "pending_activation";
    next.needsPartnerReview = true;
    next.partnerReviewReason = "Matter placed on hold by Managing Partner";
  } else if (status === "closed" || status === "archived") {
    next.activationStatus = "closed";
    next.needsPartnerReview = false;
    next.partnerReviewReason = null;
  }
  return updateFirmPortfolioMatter(id, next);
}

export function setMatterEngagementStatus(
  id: string,
  engagementStatus: MatterEngagementStatus,
): FirmPortfolioMatter[] {
  return updateFirmPortfolioMatter(id, { engagementStatus });
}

export function setMatterFeeTerms(
  id: string,
  terms: {
    feeType: EngagementFeeType;
    hourlyRate: number | null;
    flatFeeAmount: number | null;
    budgetCap: number | null;
    billingHold: boolean;
  },
): FirmPortfolioMatter[] {
  return updateFirmPortfolioMatter(id, {
    ...terms,
    needsPartnerReview: terms.billingHold ? true : undefined,
    partnerReviewReason: terms.billingHold
      ? "Billing hold set by Managing Partner"
      : undefined,
  });
}

export function assignResponsibleAttorney(
  id: string,
  responsibleAttorney: string | null,
): FirmPortfolioMatter[] {
  return updateFirmPortfolioMatter(id, {
    responsibleAttorney,
    needsPartnerReview: responsibleAttorney ? false : true,
    partnerReviewReason: responsibleAttorney
      ? null
      : "No responsible attorney assigned",
  });
}

export function markPartnerReviewed(
  id: string,
  reviewed: boolean,
  reason?: string | null,
): FirmPortfolioMatter[] {
  return updateFirmPortfolioMatter(id, {
    needsPartnerReview: !reviewed,
    partnerReviewReason: reviewed
      ? null
      : (reason ?? "Flagged for Managing Partner review"),
  });
}

export function resetFirmPortfolioMatters(): FirmPortfolioMatter[] {
  if (canUseStorage()) {
    localStorage.removeItem(FIRM_PORTFOLIO_STORAGE_KEY);
    window.dispatchEvent(new Event(FIRM_PORTFOLIO_UPDATE_EVENT));
  }
  return getLiveFirmPortfolioMatters();
}
