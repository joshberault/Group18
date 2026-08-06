import {
  fetchFirmPortfolioMatters,
  persistFirmPortfolioPatch,
} from "@/lib/matters/supabase-portfolio";
import type {
  EngagementFeeType,
  FirmPortfolioMatter,
  MatterLifecycleStatus,
} from "@/lib/matters/firm-portfolio";

export const FIRM_PORTFOLIO_UPDATE_EVENT = "firm-portfolio-matters-updated";

function notify() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(FIRM_PORTFOLIO_UPDATE_EVENT));
  }
}

export async function getFirmPortfolioMatters(): Promise<FirmPortfolioMatter[]> {
  const result = await fetchFirmPortfolioMatters();
  return result.data;
}

export async function getFirmPortfolioAttorneys(): Promise<string[]> {
  const result = await fetchFirmPortfolioMatters();
  return result.attorneys;
}

export async function setMatterLifecycle(
  id: string,
  status: MatterLifecycleStatus,
): Promise<FirmPortfolioMatter[]> {
  await persistFirmPortfolioPatch(id, { status });
  notify();
  return getFirmPortfolioMatters();
}

export async function setMatterFeeTerms(
  id: string,
  terms: {
    feeType: EngagementFeeType;
    hourlyRate: number | null;
    flatFeeAmount: number | null;
    budgetCap: number | null;
    billingHold: boolean;
  },
): Promise<FirmPortfolioMatter[]> {
  await persistFirmPortfolioPatch(id, terms);
  notify();
  return getFirmPortfolioMatters();
}

export async function assignResponsibleAttorney(
  id: string,
  responsibleAttorney: string | null,
): Promise<FirmPortfolioMatter[]> {
  await persistFirmPortfolioPatch(id, { responsibleAttorney });
  notify();
  return getFirmPortfolioMatters();
}

export async function markPartnerReviewed(
  id: string,
  reviewed: boolean,
): Promise<FirmPortfolioMatter[]> {
  if (reviewed) {
    await persistFirmPortfolioPatch(id, { billingHold: false });
  }
  notify();
  return getFirmPortfolioMatters();
}

export async function resetFirmPortfolioMatters(): Promise<FirmPortfolioMatter[]> {
  notify();
  return getFirmPortfolioMatters();
}
