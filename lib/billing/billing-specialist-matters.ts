/**
 * Billing Specialist Matters queue — firm-wide Supabase matters + unbilled WIP.
 * Uses shared firm matters loader (same list as other /matters role views).
 */

import {
  fetchSharedFirmMatters,
  mapBillingMethodLabel,
  type SharedFirmMatter,
} from "@/lib/matters/firm-matters-supabase";

/** Same shape as shared-matters BillingMatterRow — live data, not amMatters. */
export type BillingSpecialistMatterRow = {
  id: string;
  matterNumber: string;
  matterName: string;
  client: string;
  billingMethod: string;
  billingAttorney: string;
  billingCycle: string;
  rateStatus: string;
  unbilledTime: number;
  unbilledExpenses: number;
  prebillStatus: string;
  billingHold: boolean;
  lastInvoice: string;
  nextBillingDate: string;
  /** Optional drawer extras from matter row */
  hourlyRate: number | null;
  retainerBalance: number | null;
};

export type BillingSpecialistMattersResult = {
  rows: BillingSpecialistMatterRow[];
  error: string | null;
};

function toBillingRow(m: SharedFirmMatter): BillingSpecialistMatterRow {
  const billingMethod = mapBillingMethodLabel(m.billingType);
  const rateMissing =
    billingMethod === "Hourly" &&
    (m.hourlyRate == null || !Number.isFinite(m.hourlyRate) || m.hourlyRate <= 0);
  const hasWip = m.unbilledWip + m.unbilledExpenses > 0;
  const open = m.status === "open" || m.status === "";

  let prebillStatus = "In progress";
  if (m.conflictFlag) {
    prebillStatus = "On hold";
  } else if (hasWip) {
    prebillStatus = "Ready for prebill";
  }

  return {
    id: m.id,
    matterNumber: m.matterNumber,
    matterName: m.title,
    client: m.clientName,
    billingMethod,
    billingAttorney: m.attorneyName || "—",
    billingCycle: open ? "Monthly" : "—",
    rateStatus: rateMissing ? "Rate review due" : "Current",
    unbilledTime: m.unbilledWip,
    unbilledExpenses: m.unbilledExpenses,
    prebillStatus,
    billingHold: m.conflictFlag,
    lastInvoice: m.lastInvoiceDate ?? "—",
    nextBillingDate: "—",
    hourlyRate: m.hourlyRate,
    retainerBalance: m.retainerBalance ?? m.retainerAmount,
  };
}

/**
 * Load all firm matters with unbilled approved time/expenses for Billing Specialist.
 */
export async function fetchBillingSpecialistMatterRows(): Promise<BillingSpecialistMattersResult> {
  const result = await fetchSharedFirmMatters({ includeWip: true });
  if (result.error) {
    return { rows: [], error: result.error };
  }
  return {
    rows: result.matters.map(toBillingRow),
    error: null,
  };
}
