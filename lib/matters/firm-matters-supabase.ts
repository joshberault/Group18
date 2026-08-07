/**
 * Firm-wide shared matters from Supabase (matters + clients + assignments + WIP).
 * Role views map SharedFirmMatter into their own row shapes — one source of truth.
 */

import { createClientSafe } from "@/lib/supabase/client";
import { displayClientName, type ConflictCheckStatus, type FirmClient } from "@/lib/clients/types";
import type { Invoice } from "@/lib/billing/invoice-types";
import {
  getAllManagedInvoices,
  getInvoicedExpenseIds,
  getInvoicedTimeEntryIds,
  refreshInvoiceCatalog,
} from "@/lib/billing/invoice-management-store";
import type { FirmAdminMatterRow } from "@/lib/matters/shared-matters";
import type {
  EngagementFeeType,
  FirmPortfolioMatter,
  MatterActivationStatus,
  MatterEngagementStatus,
  MatterLifecycleStatus,
} from "@/lib/matters/firm-portfolio";
import type { AmMatterEntity } from "@/lib/mock-data/accounting-manager/entities";
import type { ParalegalAssignmentMatter } from "@/lib/paralegal/demo-data";
import type { CaseTypeId } from "@/lib/client-portal/case-task-lists";
import { CASE_TYPE_LABELS } from "@/lib/client-portal/case-task-lists";
import type { BillingType, Matter, MatterStatus } from "@/types/database";

export type SharedFirmMatter = {
  id: string;
  matterNumber: string;
  title: string;
  clientId: string | null;
  clientName: string;
  status: string;
  activationStatus: MatterActivationStatus;
  engagementStatus: MatterEngagementStatus;
  billingHold: boolean;
  needsPartnerReview: boolean;
  partnerReviewReason: string | null;
  billingType: string;
  hourlyRate: number | null;
  retainerBalance: number | null;
  retainerAmount: number | null;
  fixedFeeAmount: number | null;
  practiceArea: string;
  description: string | null;
  attorneyName: string | null;
  assigneeNames: string[];
  openDate: string;
  conflictFlag: boolean;
  conflictStatus: ConflictCheckStatus;
  office: string;
  unbilledWip: number;
  unbilledExpenses: number;
  billedToDate: number;
  collectedToDate: number;
  lastInvoiceDate: string | null;
  /** Non-cancelled invoices in shared catalog for this matter (`matter_id`). */
  invoiceCount: number;
  hasInvoices: boolean;
};

export type FirmMattersResult = {
  matters: SharedFirmMatter[];
  error: string | null;
};

export type FetchFirmMattersOptions = {
  /** When set, keep matters assigned to this profile id (or matching full name). */
  assigneeProfileId?: string | null;
  assigneeFullName?: string | null;
  /** When true, return only assigned matters (no firm-wide fallback). */
  strictAssigneeFilter?: boolean;
  /** When true (default), attach unbilled WIP / expenses from time + invoices catalog. */
  includeWip?: boolean;
};

type ClientEmbed = {
  id?: string;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  client_type?: string | null;
  is_company?: boolean | null;
  conflict_flag?: boolean | null;
  conflict_check_status?: string | null;
  city?: string | null;
  state?: string | null;
} | null;

type PracticeAreaEmbed = { name?: string | null } | null;

const MATTER_SELECT_GOVERNANCE = `
        id,
        title,
        description,
        status,
        activation_status,
        engagement_status,
        billing_hold,
        needs_partner_review,
        partner_review_reason,
        billing_type,
        hourly_rate,
        retainer_balance,
        retainer_amount,
        fixed_fee_amount,
        client_id,
        created_at,
        client:clients (
          id,
          name,
          first_name,
          last_name,
          company_name,
          client_type,
          is_company,
          conflict_flag,
          conflict_check_status,
          city,
          state
        ),
        practice_area:practice_areas ( name )
      `;

const MATTER_SELECT_LEGACY = `
        id,
        title,
        description,
        status,
        billing_type,
        hourly_rate,
        retainer_balance,
        retainer_amount,
        fixed_fee_amount,
        client_id,
        created_at,
        client:clients (
          id,
          name,
          first_name,
          last_name,
          company_name,
          client_type,
          is_company,
          conflict_flag,
          conflict_check_status,
          city,
          state
        ),
        practice_area:practice_areas ( name )
      `;

function isMissingGovernanceColumnError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("activation_status") ||
    lower.includes("engagement_status") ||
    lower.includes("billing_hold") ||
    lower.includes("needs_partner_review") ||
    lower.includes("partner_review_reason")
  );
}

async function queryMatterRows(
  supabase: NonNullable<ReturnType<typeof createClientSafe>>,
): Promise<{ rows: MatterRow[]; error: string | null }> {
  const primary = await supabase
    .from("matters")
    .select(MATTER_SELECT_GOVERNANCE)
    .order("created_at", { ascending: false });

  if (!primary.error) {
    return { rows: (primary.data ?? []) as MatterRow[], error: null };
  }

  if (!isMissingGovernanceColumnError(primary.error.message)) {
    return { rows: [], error: primary.error.message };
  }

  const fallback = await supabase
    .from("matters")
    .select(MATTER_SELECT_LEGACY)
    .order("created_at", { ascending: false });

  if (fallback.error) {
    return { rows: [], error: fallback.error.message };
  }

  return { rows: (fallback.data ?? []) as MatterRow[], error: null };
}

type MatterRow = {
  id: string;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  activation_status?: string | null;
  engagement_status?: string | null;
  billing_hold?: boolean | null;
  needs_partner_review?: boolean | null;
  partner_review_reason?: string | null;
  billing_type?: string | null;
  hourly_rate?: number | null;
  retainer_balance?: number | null;
  retainer_amount?: number | null;
  fixed_fee_amount?: number | null;
  client_id?: string | null;
  created_at?: string | null;
  clients?: ClientEmbed;
  client?: ClientEmbed;
  practice_area?: PracticeAreaEmbed;
  practice_areas?: PracticeAreaEmbed;
};

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function matterNumberFromId(id: string): string {
  const short = id.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `NV-M-${short}`;
}

export function clientNameFromEmbed(client: ClientEmbed): string {
  if (!client) return "Unknown client";
  if (client.client_type) {
    return displayClientName(
      client as Pick<
        FirmClient,
        "name" | "client_type" | "company_name" | "first_name" | "last_name"
      >,
    );
  }
  if (client.is_company || client.company_name) {
    return (client.company_name || client.name || "Unknown client").trim();
  }
  const full = [client.first_name, client.last_name].filter(Boolean).join(" ");
  return full || (client.name || "Unknown client").trim();
}

export function mapBillingMethodLabel(
  billingType: string | null | undefined,
): string {
  switch ((billingType ?? "").toLowerCase().replace(/\s+/g, "_")) {
    case "fixed_fee":
    case "flat":
    case "flat_fee":
      return "Fixed Fee";
    case "retainer":
      return "Retainer";
    case "contingency":
      return "Contingency";
    case "reimbursable":
      return "Reimbursable";
    case "hybrid":
      return "Hybrid";
    default:
      return "Hourly";
  }
}

function mapConflictStatus(
  raw: string | null | undefined,
  conflictFlag: boolean,
): ConflictCheckStatus {
  if (conflictFlag) return "possible_conflict";
  const t = (raw ?? "").toLowerCase();
  if (
    t === "cleared" ||
    t === "pending" ||
    t === "not_reviewed" ||
    t === "possible_conflict"
  ) {
    return t;
  }
  return conflictFlag ? "possible_conflict" : "cleared";
}

function officeFromClient(client: ClientEmbed): string {
  if (!client) return "—";
  const city = client.city?.trim();
  const state = client.state?.trim();
  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  if (state) return state;
  return "—";
}

function findInvoiceDateAndTotals(
  matterId: string,
  matterTitle: string,
  invoices: Invoice[],
): {
  lastInvoice: string | null;
  billed: number;
  collected: number;
  invoiceCount: number;
} {
  const titleKey = matterTitle.trim().toLowerCase();
  let best: string | null = null;
  let billed = 0;
  let collected = 0;
  let invoiceCount = 0;
  for (const inv of invoices) {
    if (inv.status === "Cancelled") continue;
    const byId = inv.matterId && inv.matterId === matterId;
    const byTitle =
      Boolean(titleKey) &&
      (inv.legalMatter || "").trim().toLowerCase() === titleKey;
    if (!byId && !byTitle) continue;
    invoiceCount += 1;
    billed += Number(inv.totalAmount) || 0;
    collected += Number(inv.amountPaid) || 0;
    const date = (inv.invoiceDate || "").slice(0, 10);
    if (date && (!best || date > best)) best = date;
  }
  return {
    lastInvoice: best,
    billed: roundMoney(billed),
    collected: roundMoney(collected),
    invoiceCount,
  };
}

/**
 * Approved billable time/expenses not yet on a non-cancelled invoice.
 * Reuses Invoice Management catalog IDs (same pattern as billing-specialist-matters).
 */
export async function loadUnbilledWipByMatter(
  supabase: NonNullable<ReturnType<typeof createClientSafe>>,
  rateByMatter: Map<string, number>,
): Promise<{
  unbilledTimeByMatter: Map<string, number>;
  unbilledExpenseByMatter: Map<string, number>;
  error: string | null;
}> {
  await refreshInvoiceCatalog();
  const billedTime = getInvoicedTimeEntryIds();
  const billedExpenses = getInvoicedExpenseIds();

  const unbilledTimeByMatter = new Map<string, number>();
  const unbilledExpenseByMatter = new Map<string, number>();

  const { data: timeRows, error: timeError } = await supabase
    .from("time_entries")
    .select("id, matter_id, hours, status, is_billable")
    .eq("status", "approved")
    .eq("is_billable", true);

  if (timeError) {
    return {
      unbilledTimeByMatter,
      unbilledExpenseByMatter,
      error: `Could not load time entries: ${timeError.message}`,
    };
  }

  for (const row of timeRows ?? []) {
    const id = String((row as { id: string }).id);
    if (billedTime.has(id)) continue;
    const matterId = String((row as { matter_id?: string }).matter_id || "");
    if (!matterId) continue;
    const hours = Number((row as { hours?: number }).hours) || 0;
    const rate = rateByMatter.get(matterId) ?? 0;
    const prev = unbilledTimeByMatter.get(matterId) ?? 0;
    unbilledTimeByMatter.set(matterId, prev + hours * rate);
  }

  const { data: expenseRows, error: expenseError } = await supabase
    .from("expense_submissions")
    .select("id, matter_id, amount, status")
    .eq("status", "approved");

  if (expenseError) {
    console.warn("expense_submissions:", expenseError.message);
  } else {
    for (const row of expenseRows ?? []) {
      const id = String((row as { id: string }).id);
      if (billedExpenses.has(id)) continue;
      const matterId = String((row as { matter_id?: string }).matter_id || "");
      if (!matterId) continue;
      const amount = Number((row as { amount?: number }).amount) || 0;
      const prev = unbilledExpenseByMatter.get(matterId) ?? 0;
      unbilledExpenseByMatter.set(matterId, prev + amount);
    }
  }

  return { unbilledTimeByMatter, unbilledExpenseByMatter, error: null };
}

async function loadAttorneyAssignments(
  supabase: NonNullable<ReturnType<typeof createClientSafe>>,
  matterIds: string[],
): Promise<{
  attorneyByMatter: Map<string, string>;
  assigneesByMatter: Map<string, string[]>;
  assigneeProfileIdsByMatter: Map<string, string[]>;
}> {
  const attorneyByMatter = new Map<string, string>();
  const assigneesByMatter = new Map<string, string[]>();
  const assigneeProfileIdsByMatter = new Map<string, string[]>();

  if (matterIds.length === 0) {
    return { attorneyByMatter, assigneesByMatter, assigneeProfileIdsByMatter };
  }

  const { data: assignments, error: assignError } = await supabase
    .from("matter_assignments")
    .select("matter_id, profile_id, role_on_matter, profile:profiles(full_name)")
    .in("matter_id", matterIds);

  if (assignError) {
    console.warn("matter_assignments:", assignError.message);
    return { attorneyByMatter, assigneesByMatter, assigneeProfileIdsByMatter };
  }

  for (const a of assignments ?? []) {
    const matterId = String((a as { matter_id?: string }).matter_id || "");
    if (!matterId) continue;
    const profileId = String((a as { profile_id?: string }).profile_id || "");
    const role = String(
      (a as { role_on_matter?: string }).role_on_matter || "",
    ).toLowerCase();
    const profile = (
      a as { profile?: { full_name?: string | null } | null }
    ).profile;
    const name = profile?.full_name?.trim() || "";

    if (profileId) {
      const ids = assigneeProfileIdsByMatter.get(matterId) ?? [];
      if (!ids.includes(profileId)) {
        ids.push(profileId);
        assigneeProfileIdsByMatter.set(matterId, ids);
      }
    }
    if (name) {
      const names = assigneesByMatter.get(matterId) ?? [];
      if (!names.includes(name)) {
        names.push(name);
        assigneesByMatter.set(matterId, names);
      }
      const existing = attorneyByMatter.get(matterId);
      if (
        !existing ||
        role === "lead_attorney" ||
        role === "responsible_attorney"
      ) {
        attorneyByMatter.set(matterId, name);
      }
    }
  }

  return { attorneyByMatter, assigneesByMatter, assigneeProfileIdsByMatter };
}

/**
 * Load all firm matters with client, practice area, assignments, optional WIP.
 */
export async function fetchSharedFirmMatters(
  options: FetchFirmMattersOptions = {},
): Promise<FirmMattersResult> {
  const includeWip = options.includeWip !== false;
  const supabase = createClientSafe();
  if (!supabase) {
    return {
      matters: [],
      error:
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and the publishable key, then reload.",
    };
  }

  try {
    if (includeWip) {
      await refreshInvoiceCatalog();
    }
    const invoices = includeWip ? getAllManagedInvoices() : [];

    const { rows: matterRows, error: matterError } = await queryMatterRows(supabase);

    if (matterError) {
      return {
        matters: [],
        error: `Could not load matters: ${matterError}`,
      };
    }

    let matters = matterRows;
    const matterIds = matters.map((m) => String(m.id));

    const { attorneyByMatter, assigneesByMatter, assigneeProfileIdsByMatter } =
      await loadAttorneyAssignments(supabase, matterIds);

    const filterProfileId = options.assigneeProfileId?.trim() || null;
    const filterName = options.assigneeFullName?.trim().toLowerCase() || null;
    if (filterProfileId || filterName) {
      const filtered = matters.filter((m) => {
        const id = String(m.id);
        if (
          filterProfileId &&
          (assigneeProfileIdsByMatter.get(id) ?? []).includes(filterProfileId)
        ) {
          return true;
        }
        if (filterName) {
          const names = (assigneesByMatter.get(id) ?? []).map((n) =>
            n.toLowerCase(),
          );
          if (names.some((n) => n.includes(filterName) || filterName.includes(n))) {
            return true;
          }
        }
        return false;
      });
      if (options.strictAssigneeFilter || filtered.length > 0) {
        matters = filtered;
      }
    }

    const rateByMatter = new Map<string, number>();
    for (const m of matters) {
      rateByMatter.set(String(m.id), Number(m.hourly_rate) || 0);
    }

    let unbilledTimeByMatter = new Map<string, number>();
    let unbilledExpenseByMatter = new Map<string, number>();

    if (includeWip) {
      const wip = await loadUnbilledWipByMatter(supabase, rateByMatter);
      if (wip.error) {
        return { matters: [], error: wip.error };
      }
      unbilledTimeByMatter = wip.unbilledTimeByMatter;
      unbilledExpenseByMatter = wip.unbilledExpenseByMatter;
    }

    const shared: SharedFirmMatter[] = matters.map((m) => {
      const id = String(m.id);
      const title = (m.title || "Untitled matter").trim() || "Untitled matter";
      const clientEmbed = m.client ?? m.clients ?? null;
      const conflictFlag = Boolean(clientEmbed?.conflict_flag);
      const practiceArea =
        m.practice_area?.name?.trim() ||
        m.practice_areas?.name?.trim() ||
        "General";
      const openDate = (m.created_at || "").slice(0, 10) || "—";
      const invoiceMeta = includeWip
        ? findInvoiceDateAndTotals(id, title, invoices)
        : {
            lastInvoice: null,
            billed: 0,
            collected: 0,
            invoiceCount: 0,
          };

      const conflictStatus = mapConflictStatus(
          clientEmbed?.conflict_check_status,
          conflictFlag,
        );
      const billingHold =
        Boolean(m.billing_hold) || conflictFlag;
      const needsPartnerReview =
        Boolean(m.needs_partner_review) ||
        billingHold ||
        !attorneyByMatter.get(id) ||
        conflictStatus !== "cleared" ||
        String(m.status || "").toLowerCase() === "on_hold";

      let partnerReviewReason = m.partner_review_reason?.trim() || null;
      if (!partnerReviewReason) {
        if (billingHold) {
          partnerReviewReason = "Billing hold in effect";
        } else if (conflictFlag || conflictStatus === "possible_conflict") {
          partnerReviewReason =
            "Conflict flag on client record — confirm engagement may continue";
        } else if (
          conflictStatus === "pending" ||
          conflictStatus === "not_reviewed"
        ) {
          partnerReviewReason = "Conflict check still pending";
        } else if (!attorneyByMatter.get(id)) {
          partnerReviewReason = "No responsible attorney assigned";
        } else if (String(m.status || "").toLowerCase() === "on_hold") {
          partnerReviewReason =
            "Matter on hold — partner decision to reopen or close";
        }
      }

      return {
        id,
        matterNumber: matterNumberFromId(id),
        title,
        clientId: m.client_id ? String(m.client_id) : clientEmbed?.id ?? null,
        clientName: clientNameFromEmbed(clientEmbed),
        status: String(m.status || "open").toLowerCase(),
        activationStatus: mapActivationStatus(
          m.activation_status,
          String(m.status || "open"),
        ),
        engagementStatus: mapEngagementStatus(m.engagement_status),
        billingHold,
        needsPartnerReview,
        partnerReviewReason,
        billingType: String(m.billing_type || "hourly").toLowerCase(),
        hourlyRate:
          m.hourly_rate != null && Number.isFinite(Number(m.hourly_rate))
            ? Number(m.hourly_rate)
            : null,
        retainerBalance:
          m.retainer_balance != null ? Number(m.retainer_balance) : null,
        retainerAmount:
          m.retainer_amount != null ? Number(m.retainer_amount) : null,
        fixedFeeAmount:
          m.fixed_fee_amount != null ? Number(m.fixed_fee_amount) : null,
        practiceArea,
        description: m.description?.trim() || null,
        attorneyName: attorneyByMatter.get(id) ?? null,
        assigneeNames: assigneesByMatter.get(id) ?? [],
        openDate,
        conflictFlag,
        conflictStatus: mapConflictStatus(
          clientEmbed?.conflict_check_status,
          conflictFlag,
        ),
        office: officeFromClient(clientEmbed),
        unbilledWip: roundMoney(unbilledTimeByMatter.get(id) ?? 0),
        unbilledExpenses: roundMoney(unbilledExpenseByMatter.get(id) ?? 0),
        invoiceCount: invoiceMeta.invoiceCount,
        hasInvoices: invoiceMeta.invoiceCount > 0,
        billedToDate: invoiceMeta.billed,
        collectedToDate: invoiceMeta.collected,
        lastInvoiceDate: invoiceMeta.lastInvoice,
      };
    });

    return { matters: shared, error: null };
  } catch (err) {
    return {
      matters: [],
      error:
        err instanceof Error
          ? err.message
          : "Unexpected error loading firm matters.",
    };
  }
}

/* ---------- Role row mappers ---------- */

function mapAmMatterStatus(
  status: string,
): AmMatterEntity["matterStatus"] {
  const t = status.toLowerCase();
  if (t === "closed" || t === "archived") return "Closed";
  if (t === "on_hold" || t === "pending_close") return "Pending Close";
  return "Open";
}

function mapAmBillingMethod(
  billingType: string,
): AmMatterEntity["billingMethod"] {
  const label = mapBillingMethodLabel(billingType);
  if (label === "Fixed Fee") return "Flat Fee";
  if (label === "Contingency") return "Contingency";
  if (label === "Hybrid") return "Hybrid";
  return "Hourly";
}

function deriveBudget(m: SharedFirmMatter): number {
  if (m.fixedFeeAmount != null && m.fixedFeeAmount > 0) return m.fixedFeeAmount;
  if (m.retainerAmount != null && m.retainerAmount > 0) return m.retainerAmount;
  if (m.hourlyRate != null && m.hourlyRate > 0) return m.hourlyRate * 100;
  return Math.max(m.billedToDate + m.unbilledWip, 0);
}

function deriveFinancialStatus(
  m: SharedFirmMatter,
  budget: number,
): AmMatterEntity["financialStatus"] {
  if (m.billingHold || m.conflictFlag) return "Billing Hold";
  const spent = m.billedToDate + m.unbilledWip + m.unbilledExpenses;
  if (budget > 0 && spent > budget) return "Over Budget";
  const minRetainer = m.retainerAmount ?? 0;
  const bal = m.retainerBalance ?? m.retainerAmount ?? 0;
  if (minRetainer > 0 && bal < minRetainer * 0.25) return "Low Retainer";
  if (
    m.billingType.includes("retainer") &&
    bal <= 0 &&
    (m.unbilledWip > 0 || m.unbilledExpenses > 0)
  ) {
    return "Low Retainer";
  }
  return "On Track";
}

function marginPercent(m: SharedFirmMatter): number {
  if (m.billedToDate <= 0) return 0;
  const cost = m.unbilledWip * 0.4;
  return Math.round(
    Math.max(0, Math.min(100, ((m.billedToDate - cost) / m.billedToDate) * 100)),
  );
}

export function toAccountingManagerMatter(m: SharedFirmMatter): AmMatterEntity {
  const budget = deriveBudget(m);
  return {
    id: m.id,
    matterNumber: m.matterNumber,
    matterName: m.title,
    clientId: m.clientId ?? "",
    client: m.clientName,
    attorney: m.attorneyName ?? "—",
    practiceArea: m.practiceArea,
    matterStatus: mapAmMatterStatus(m.status),
    billingMethod: mapAmBillingMethod(m.billingType),
    budget,
    unbilledWip: m.unbilledWip,
    unbilledExpenses: m.unbilledExpenses,
    billedToDate: m.billedToDate,
    collectedToDate: m.collectedToDate,
    trustBalance: 0,
    marginPercent: marginPercent(m),
    financialStatus: deriveFinancialStatus(m, budget),
    billingHold: m.billingHold,
    minimumRetainer: m.retainerAmount ?? 0,
  };
}

export function toFirmAdminMatterRow(m: SharedFirmMatter): FirmAdminMatterRow {
  const matterStatusLabel =
    m.status === "closed" || m.status === "archived"
      ? "Closed"
      : m.status === "on_hold"
        ? "On hold"
        : "Open";

  const rateMissing =
    mapBillingMethodLabel(m.billingType) === "Hourly" &&
    (m.hourlyRate == null || m.hourlyRate <= 0);

  const setupGap = m.conflictFlag
    ? "Conflict check / billing hold"
    : rateMissing
      ? "Missing rate schedule"
      : !m.attorneyName
        ? "No attorney assigned"
        : null;

  return {
    id: m.id,
    matterNumber: m.matterNumber,
    matterName: m.title,
    client: m.clientName,
    practiceArea: m.practiceArea,
    attorney: m.attorneyName ?? "—",
    office: m.office === "—" ? "Firm" : m.office,
    staffing:
      m.assigneeNames.length > 0
        ? m.assigneeNames.join(" · ")
        : m.attorneyName
          ? `${m.attorneyName}`
          : "Unassigned",
    engagementDate: m.openDate,
    matterStatus: matterStatusLabel,
    adminStatus:
      matterStatusLabel === "Closed"
        ? "Closed"
        : setupGap
          ? "Exception"
          : "Active",
    setupGap,
  };
}

function mapLifecycle(status: string): MatterLifecycleStatus {
  const t = status.toLowerCase();
  if (t === "closed") return "closed";
  if (t === "archived") return "archived";
  if (t === "on_hold") return "on_hold";
  return "open";
}

function mapActivationStatus(
  raw: string | null | undefined,
  lifecycleStatus: string,
): MatterActivationStatus {
  const t = (raw ?? "").toLowerCase();
  if (
    t === "draft" ||
    t === "pending_activation" ||
    t === "active" ||
    t === "closed"
  ) {
    return t;
  }
  const lifecycle = lifecycleStatus.toLowerCase();
  if (lifecycle === "closed" || lifecycle === "archived") return "closed";
  if (lifecycle === "on_hold") return "pending_activation";
  return "active";
}

function mapEngagementStatus(
  raw: string | null | undefined,
): MatterEngagementStatus {
  const t = (raw ?? "").toLowerCase();
  if (
    t === "not_started" ||
    t === "letter_sent" ||
    t === "signed" ||
    t === "declined"
  ) {
    return t;
  }
  return "signed";
}

function mapFeeType(billingType: string): EngagementFeeType {
  switch (billingType.toLowerCase().replace(/\s+/g, "_")) {
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

export function toFirmPortfolioMatter(m: SharedFirmMatter): FirmPortfolioMatter {
  const needsPartnerReview =
    m.needsPartnerReview ||
    m.billingHold ||
    !m.attorneyName ||
    m.status === "on_hold" ||
    m.conflictStatus !== "cleared";

  let partnerReviewReason = m.partnerReviewReason;
  if (!partnerReviewReason) {
    if (m.billingHold) {
      partnerReviewReason = "Billing hold in effect";
    } else if (m.conflictFlag || m.conflictStatus === "possible_conflict") {
      partnerReviewReason =
        "Conflict flag on client record — confirm engagement may continue";
    } else if (m.conflictStatus === "pending" || m.conflictStatus === "not_reviewed") {
      partnerReviewReason = "Conflict check still pending";
    } else if (!m.attorneyName) {
      partnerReviewReason = "No responsible attorney assigned";
    } else if (m.status === "on_hold") {
      partnerReviewReason = "Matter on hold — partner decision to reopen or close";
    }
  }

  return {
    id: m.id,
    matterNumber: m.matterNumber,
    title: m.title,
    clientId: m.clientId,
    clientName: m.clientName,
    practiceArea: m.practiceArea,
    responsibleAttorney: m.attorneyName,
    originatingAttorney: m.attorneyName,
    status: mapLifecycle(m.status),
    activationStatus: m.activationStatus,
    engagementStatus: m.engagementStatus,
    feeType: mapFeeType(m.billingType),
    hourlyRate: m.hourlyRate,
    flatFeeAmount: m.fixedFeeAmount ?? m.retainerAmount,
    budgetCap: deriveBudget(m) || null,
    billingHold: m.billingHold,
    conflictStatus: m.conflictStatus,
    needsPartnerReview,
    partnerReviewReason,
    openDate: m.openDate,
    engagementScope:
      m.description || `${m.practiceArea} engagement for ${m.clientName}`,
  };
}

const PRACTICE_TO_CASE_TYPE: Array<{ match: RegExp; caseType: CaseTypeId }> = [
  { match: /employment/i, caseType: "employment_litigation_employee" },
  { match: /medical|malpractice/i, caseType: "medical_malpractice_plaintiff" },
  { match: /personal injury|pi\b/i, caseType: "personal_injury_plaintiff" },
  { match: /family/i, caseType: "family_law" },
  { match: /criminal/i, caseType: "criminal_defense" },
  { match: /estate plan/i, caseType: "estate_planning" },
  { match: /probate/i, caseType: "probate_administration" },
  { match: /residential|closing/i, caseType: "real_estate_closings" },
  { match: /real estate|commercial real/i, caseType: "commercial_real_estate" },
  { match: /bankruptcy/i, caseType: "bankruptcy" },
  { match: /immigration/i, caseType: "immigration" },
  { match: /ip litig|intellectual property litig/i, caseType: "intellectual_property_litigation" },
  { match: /intellectual property|ip\b|patent|trademark/i, caseType: "intellectual_property_prosecution" },
  { match: /tax controvers/i, caseType: "tax_controversy" },
  { match: /tax/i, caseType: "tax_planning" },
  { match: /merger|acquisition|m&a/i, caseType: "mergers_and_acquisitions" },
  { match: /contract/i, caseType: "contract_drafting" },
  { match: /regulatory|compliance/i, caseType: "regulatory_compliance" },
  { match: /class action/i, caseType: "class_action_litigation" },
  { match: /debt collect/i, caseType: "debt_collection" },
  { match: /insurance/i, caseType: "insurance_defense" },
  { match: /litigation|dispute/i, caseType: "commercial_litigation" },
  { match: /corporate|business|general/i, caseType: "corporate_business_advisory" },
];

export function practiceAreaToCaseType(practiceArea: string): CaseTypeId {
  for (const row of PRACTICE_TO_CASE_TYPE) {
    if (row.match.test(practiceArea)) return row.caseType;
  }
  return "corporate_business_advisory";
}

export function toParalegalAssignmentMatter(
  m: SharedFirmMatter,
): ParalegalAssignmentMatter {
  const caseType = practiceAreaToCaseType(m.practiceArea);
  const status =
    m.status === "closed" || m.status === "archived"
      ? "closed"
      : m.status === "on_hold"
        ? "on_hold"
        : "open";

  return {
    id: m.id,
    matterNumber: m.matterNumber,
    title: m.title,
    clientId: m.clientId ?? "",
    clientName: m.clientName,
    caseType,
    practiceArea: m.practiceArea || CASE_TYPE_LABELS[caseType],
    attorneyName: m.attorneyName ?? "Unassigned",
    attorneyId: m.attorneyName
      ? `attorney-${m.attorneyName.toLowerCase().replace(/\s+/g, "-")}`
      : "attorney-unassigned",
    paralegalNames: [],
    status,
    engagementScope:
      m.description || `${m.practiceArea} engagement for ${m.clientName}`,
    conflictStatus: m.conflictStatus,
    openDate: m.openDate === "—" ? new Date().toISOString().slice(0, 10) : m.openDate,
  };
}

function mapAttorneyBillingType(raw: string): BillingType {
  const key = raw.toLowerCase().replace(/\s+/g, "_");
  if (key === "fixed_fee" || key === "flat" || key === "flat_fee") {
    return "fixed_fee";
  }
  if (key === "retainer") return "retainer";
  if (key === "contingency") return "contingency";
  return "hourly";
}

function mapAttorneyMatterStatus(raw: string): MatterStatus {
  if (raw === "closed" || raw === "archived") return raw;
  return "open";
}

/** Map shared firm matters for attorney time/expense matter pickers. */
export function toAttorneyWorkflowMatter(m: SharedFirmMatter): Matter {
  return {
    id: m.id,
    title: m.title,
    description: m.description,
    status: mapAttorneyMatterStatus(m.status),
    billing_type: mapAttorneyBillingType(m.billingType),
    hourly_rate: m.hourlyRate,
    fixed_fee_amount: m.fixedFeeAmount,
    retainer_amount: m.retainerAmount,
    retainer_balance: m.retainerBalance,
    expense_terms: null,
    client: m.clientId
      ? {
          id: m.clientId,
          name: m.clientName,
          email: null,
          company_name: null,
          conflict_flag: m.conflictFlag,
        }
      : null,
    practice_area: m.practiceArea ? { name: m.practiceArea } : null,
  };
}

export async function fetchSharedFirmMatterById(
  matterId: string,
  options: FetchFirmMattersOptions = {},
): Promise<{ matter: SharedFirmMatter | null; error: string | null }> {
  const result = await fetchSharedFirmMatters(options);
  const matter =
    result.matters.find(
      (row) =>
        row.id === matterId ||
        row.matterNumber === matterId ||
        row.title.toLowerCase() === matterId.toLowerCase(),
    ) ?? null;
  return { matter, error: result.error };
}

export async function reassignLeadAttorney(
  matterId: string,
  attorneyFullName: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClientSafe();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const { error: deleteError } = await supabase
    .from("matter_assignments")
    .delete()
    .eq("matter_id", matterId)
    .in("role_on_matter", ["lead_attorney", "responsible_attorney"]);

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  const trimmed = attorneyFullName?.trim();
  if (!trimmed) return { ok: true };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("full_name", trimmed)
    .limit(1)
    .maybeSingle();

  if (profileError) {
    return { ok: false, error: profileError.message };
  }
  if (!profile?.id) {
    return { ok: false, error: `No profile found for "${trimmed}".` };
  }

  const { error: insertError } = await supabase.from("matter_assignments").insert({
    matter_id: matterId,
    profile_id: profile.id,
    role_on_matter: "lead_attorney",
  });

  if (insertError) {
    return { ok: false, error: insertError.message };
  }

  return { ok: true };
}
