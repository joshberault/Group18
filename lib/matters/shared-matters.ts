/**
 * Shared matter repository — single source of truth derived from accounting-manager entities.
 * Role-specific views filter and present this data differently.
 */

import {
  amMatters,
  amClients,
  type AmMatterEntity,
} from "@/lib/mock-data/accounting-manager/entities";

export type { AmMatterEntity as SharedMatter };

export const sharedMatters: AmMatterEntity[] = amMatters;

export function getAllSharedMatters(): AmMatterEntity[] {
  return sharedMatters;
}

export function getMatterById(id: string): AmMatterEntity | undefined {
  return sharedMatters.find((m) => m.id === id);
}

export function getMatterByNumber(matterNumber: string): AmMatterEntity | undefined {
  return sharedMatters.find((m) => m.matterNumber === matterNumber);
}

export function getMattersForAttorney(attorneyName: string): AmMatterEntity[] {
  return sharedMatters.filter((m) => m.attorney === attorneyName);
}

export function getMattersForClient(clientName: string): AmMatterEntity[] {
  return sharedMatters.filter((m) => m.client === clientName);
}

export function getOverBudgetMatters(): AmMatterEntity[] {
  return sharedMatters.filter((m) => m.financialStatus === "Over Budget");
}

export function getBillingHoldMatters(): AmMatterEntity[] {
  return sharedMatters.filter((m) => m.billingHold);
}

export function getLowRetainerMatters(): AmMatterEntity[] {
  return sharedMatters.filter((m) => m.financialStatus === "Low Retainer");
}

export interface FirmAdminMatterRow {
  id: string;
  matterNumber: string;
  matterName: string;
  client: string;
  practiceArea: string;
  attorney: string;
  office: string;
  staffing: string;
  engagementDate: string;
  matterStatus: string;
  adminStatus: string;
  setupGap: string | null;
}

const OFFICE_MAP: Record<string, string> = {
  "Sarah Chen": "Chicago",
  "Michael Torres": "New York",
  "Jennifer Walsh": "Los Angeles",
  "David Kim": "Dallas",
  "Rachel Foster": "Chicago",
};

export function getFirmAdminMatterRows(): FirmAdminMatterRow[] {
  return sharedMatters.map((m, index) => {
    const client = amClients.find((c) => c.id === m.clientId);
    const setupGap =
      m.billingHold
        ? "Billing hold active"
        : index % 5 === 0
          ? "Missing rate schedule"
          : index % 7 === 0
            ? "Conflict check pending"
            : null;
    return {
      id: m.id,
      matterNumber: m.matterNumber,
      matterName: m.matterName,
      client: m.client,
      practiceArea: m.practiceArea,
      attorney: m.attorney,
      office: client?.office ?? OFFICE_MAP[m.attorney] ?? "Chicago",
      staffing: `${m.attorney} · 1 paralegal`,
      engagementDate: `2025-${String((index % 12) + 1).padStart(2, "0")}-15`,
      matterStatus: m.matterStatus,
      adminStatus:
        m.matterStatus === "Closed"
          ? "Closed"
          : setupGap
            ? "Exception"
            : "Active",
      setupGap,
    };
  });
}

export interface BillingMatterRow {
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
}

/** @deprecated Billing Specialist Matters uses fetchBillingSpecialistMatterRows (lib/billing/billing-specialist-matters). */
export function getBillingSpecialistMatterRows(): BillingMatterRow[] {
  return sharedMatters.map((m, index) => ({
    id: m.id,
    matterNumber: m.matterNumber,
    matterName: m.matterName,
    client: m.client,
    billingMethod: m.billingMethod,
    billingAttorney: m.attorney,
    billingCycle: index % 2 === 0 ? "Monthly" : "Bi-weekly",
    rateStatus: index % 4 === 0 ? "Rate review due" : "Current",
    unbilledTime: m.unbilledWip,
    unbilledExpenses: m.unbilledExpenses,
    prebillStatus: m.billingHold
      ? "On hold"
      : m.unbilledWip > 15000
        ? "Ready for prebill"
        : "In progress",
    billingHold: m.billingHold,
    lastInvoice: `2026-07-${String((index % 28) + 1).padStart(2, "0")}`,
    nextBillingDate: `2026-08-${String((index % 28) + 1).padStart(2, "0")}`,
  }));
}

export interface PartnerMatterRow {
  id: string;
  matterNumber: string;
  matterName: string;
  client: string;
  partner: string;
  status: string;
  budget: number;
  billed: number;
  collected: number;
  wip: number;
  profitability: number;
  risk: string;
  nextDeadline: string;
  actionRequired: string | null;
}

export function getManagingPartnerMatterRows(): PartnerMatterRow[] {
  return sharedMatters.map((m, index) => ({
    id: m.id,
    matterNumber: m.matterNumber,
    matterName: m.matterName,
    client: m.client,
    partner: m.attorney,
    status: m.matterStatus,
    budget: m.budget,
    billed: m.billedToDate,
    collected: m.collectedToDate,
    wip: m.unbilledWip,
    profitability: m.marginPercent,
    risk:
      m.financialStatus === "Over Budget"
        ? "Over budget"
        : m.financialStatus === "Low Retainer"
          ? "Low retainer"
          : m.billingHold
            ? "Billing hold"
            : "Normal",
    nextDeadline: `2026-08-${String((index % 20) + 10).padStart(2, "0")}`,
    actionRequired:
      m.financialStatus === "Over Budget"
        ? "Review budget variance"
        : m.billingHold
          ? "Release billing hold"
          : null,
  }));
}
