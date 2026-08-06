/**
 * Shared matter repository — Supabase-backed transforms for role-specific matter views.
 */

import { fetchAccountingClients, fetchAccountingMatters } from "@/lib/accounting";
import type { AmMatterEntity } from "@/lib/mock-data/accounting-manager/entities";

export type { AmMatterEntity as SharedMatter };

export async function fetchAllSharedMatters(): Promise<{
  matters: AmMatterEntity[];
  error: string | null;
}> {
  const result = await fetchAccountingMatters();
  return { matters: result.data, error: result.error };
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

export async function fetchFirmAdminMatterRows(): Promise<{
  rows: FirmAdminMatterRow[];
  error: string | null;
}> {
  const [mattersRes, clientsRes] = await Promise.all([
    fetchAccountingMatters(),
    fetchAccountingClients(),
  ]);
  if (mattersRes.error) return { rows: [], error: mattersRes.error };

  const clientOffice = new Map(
    clientsRes.data.map((c) => [c.id, c.office]),
  );

  const rows: FirmAdminMatterRow[] = mattersRes.data.map((m) => ({
    id: m.id,
    matterNumber: m.matterNumber,
    matterName: m.matterName,
    client: m.client,
    practiceArea: m.practiceArea,
    attorney: m.attorney,
    office: clientOffice.get(m.clientId) ?? "",
    staffing: m.attorney ? `${m.attorney}` : "Unassigned",
    engagementDate: "",
    matterStatus: m.matterStatus,
    adminStatus:
      m.matterStatus === "Closed"
        ? "Closed"
        : m.billingHold
          ? "Exception"
          : "Active",
    setupGap: m.billingHold ? "Billing hold active" : null,
  }));

  return { rows, error: null };
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

export async function fetchBillingSpecialistMatterRows(): Promise<{
  rows: BillingMatterRow[];
  error: string | null;
}> {
  const result = await fetchAccountingMatters();
  if (result.error) return { rows: [], error: result.error };

  const rows: BillingMatterRow[] = result.data.map((m) => ({
    id: m.id,
    matterNumber: m.matterNumber,
    matterName: m.matterName,
    client: m.client,
    billingMethod: m.billingMethod,
    billingAttorney: m.attorney,
    billingCycle: "",
    rateStatus: "",
    unbilledTime: m.unbilledWip,
    unbilledExpenses: m.unbilledExpenses,
    prebillStatus: m.billingHold
      ? "On hold"
      : m.unbilledWip > 0
        ? "Ready for prebill"
        : "",
    billingHold: m.billingHold,
    lastInvoice: "",
    nextBillingDate: "",
  }));

  return { rows, error: null };
}
