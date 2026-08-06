import {
  buildFirmPortfolioSeed,
  type EngagementFeeType,
  type FirmPortfolioMatter,
  type MatterLifecycleStatus,
} from "@/lib/matters/firm-portfolio";

export const FIRM_PORTFOLIO_STORAGE_KEY =
  "counselflow-firm-portfolio-matters-v1";
export const FIRM_PORTFOLIO_UPDATE_EVENT = "firm-portfolio-matters-updated";

type MatterPatch = Partial<
  Pick<
    FirmPortfolioMatter,
    | "status"
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

export function getFirmPortfolioMatters(): FirmPortfolioMatter[] {
  const seed = buildFirmPortfolioSeed();
  const patches = readPatches();
  return seed.map((matter) => {
    const patch = patches[matter.id];
    return patch ? { ...matter, ...patch } : matter;
  });
}

export function updateFirmPortfolioMatter(
  id: string,
  patch: MatterPatch,
): FirmPortfolioMatter[] {
  const patches = readPatches();
  patches[id] = { ...(patches[id] ?? {}), ...patch };
  writePatches(patches);
  return getFirmPortfolioMatters();
}

export function setMatterLifecycle(
  id: string,
  status: MatterLifecycleStatus,
): FirmPortfolioMatter[] {
  const next: MatterPatch = { status };
  if (status === "on_hold") {
    next.needsPartnerReview = true;
    next.partnerReviewReason = "Matter placed on hold by Managing Partner";
  }
  if (status === "closed" || status === "archived") {
    next.needsPartnerReview = false;
    next.partnerReviewReason = null;
  }
  return updateFirmPortfolioMatter(id, next);
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
  return getFirmPortfolioMatters();
}
