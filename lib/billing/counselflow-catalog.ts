/**
 * Adapter: Billing Generate Invoice ↔ CounselFlow Clients + Matters.
 * Reuses fetchClients / fetchRelatedMatters — no parallel client/matter stores.
 * Time & expenses are hydrated separately via matter-wip (time_entries).
 */

import { displayClientName } from "@/lib/clients/types";
import type { FirmClient, RelatedMatterSummary } from "@/lib/clients/types";
import { fetchClients, fetchRelatedMatters } from "@/lib/clients/queries";
import type {
  GenerateClient,
  GenerateMatter,
  MatterStatus,
} from "@/lib/billing/generate-invoice-types";
import { toIsoDate } from "@/lib/billing/billing-period";
import { fetchClientRetainerBalance } from "@/lib/billing/retainer";

export type CatalogSource = "counselflow" | "empty";

export type BillingClientCatalog = {
  clients: GenerateClient[];
  source: CatalogSource;
  /** User-facing note about where the list came from */
  message: string | null;
};

export type BillingMatterCatalog = {
  matters: GenerateMatter[];
  source: CatalogSource;
  message: string | null;
};

function mapMatterStatus(value: string | null | undefined): MatterStatus {
  const t = (value ?? "").toLowerCase();
  if (t === "closed" || t === "archived" || t === "inactive") return "Closed";
  return "Open";
}

function formatFirmAddress(client: FirmClient): string {
  const locality = [client.city, client.state].filter(Boolean).join(", ");
  const lines = [
    client.address_line_1,
    client.address_line_2,
    locality,
    client.postal_code,
  ]
    .map((p) => (p ?? "").trim())
    .filter(Boolean);
  return lines.length > 0 ? lines.join(", ") : "Address on file";
}

function currentBillingPeriod(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Map a firm CRM client into the Generate Invoice client shape. */
export function mapFirmClientToGenerate(client: FirmClient): GenerateClient {
  return {
    id: client.id,
    clientId: client.client_number || client.id,
    name: displayClientName(client),
    billingContact:
      client.primary_contact_name?.trim() ||
      displayClientName(client) ||
      "Billing contact",
    billingMethod: "Hourly",
    trustRetainerBalance: 0,
    email: client.email?.trim() || "",
    phone: client.phone?.trim() || "",
    address: formatFirmAddress(client),
  };
}

/**
 * Prefill trustRetainerBalance from the sum of matter retainer_balance
 * (CounselFlow has no separate trust ledger table).
 */
export async function enrichClientWithRetainerBalance(
  client: GenerateClient,
): Promise<GenerateClient> {
  const summary = await fetchClientRetainerBalance(client.id);
  return {
    ...client,
    trustRetainerBalance: summary.totalBalance,
  };
}

/** Map a firm matter row into Generate Invoice shape (WIP loaded after select). */
export function mapRelatedMatterToGenerate(
  matter: RelatedMatterSummary,
  firmClientId: string,
): GenerateMatter {
  const short = matter.id.replace(/-/g, "").slice(0, 8).toUpperCase();
  return {
    id: matter.id,
    clientId: firmClientId,
    matterName: matter.title || "Untitled matter",
    matterNumber: `NV-M-${short}`,
    responsibleAttorney: "Assigned counsel",
    status: mapMatterStatus(matter.status),
    billingPeriod: currentBillingPeriod(),
    timeEntries: [],
    expenses: [],
    writeDowns: [],
    courtesyDiscountApproved: 0,
  };
}

/**
 * Load clients for the Generate Invoice dropdown from CounselFlow CRM only.
 * Retainer balances are loaded when a client is selected (not for every row).
 */
export async function loadBillingClients(): Promise<BillingClientCatalog> {
  const result = await fetchClients();

  if (result.error && result.data.length === 0) {
    return {
      clients: [],
      source: "empty",
      message: result.error.includes("not configured")
        ? "CounselFlow Clients is unavailable (Supabase not configured). Configure NEXT_PUBLIC_SUPABASE_URL and the publishable key, then reload."
        : `Could not load firm clients: ${result.error}`,
    };
  }

  if (result.data.length === 0) {
    return {
      clients: [],
      source: "empty",
      message:
        "No clients in CounselFlow yet. Add clients in the Clients module, then return here to invoice them.",
    };
  }

  const sorted = [...result.data].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "active" ? -1 : 1;
    }
    return displayClientName(a).localeCompare(displayClientName(b));
  });

  return {
    clients: sorted.map(mapFirmClientToGenerate),
    source: "counselflow",
    message: null,
  };
}

/**
 * Load matters for the selected firm client from CounselFlow matters (by client_id).
 * Excludes archived. Prefers open; includes closed so demos with closed-only
 * matters remain billable.
 */
export async function loadBillingMattersForClient(
  firmClientId: string,
): Promise<BillingMatterCatalog> {
  const result = await fetchRelatedMatters(firmClientId);

  if (result.error && result.data.length === 0) {
    return {
      matters: [],
      source: "empty",
      message: `Could not load matters for this client: ${result.error}`,
    };
  }

  if (result.data.length === 0) {
    return {
      matters: [],
      source: "empty",
      message:
        "This client has no matters in CounselFlow yet. Create or link a matter for this client (Clients module / related matters), then return here.",
    };
  }

  // Billable list: drop archived only (keep open + closed for demo DB usability).
  const billable = result.data.filter((m) => {
    const status = (m.status ?? "").toLowerCase();
    return status !== "archived";
  });

  if (billable.length === 0) {
    return {
      matters: [],
      source: "empty",
      message:
        "This client has no open or closed matters to bill (only archived). Reopen or create a matter in CounselFlow, then return here.",
    };
  }

  // Open first, then closed; stable by title.
  const sorted = [...billable].sort((a, b) => {
    const aOpen = mapMatterStatus(a.status) === "Open" ? 0 : 1;
    const bOpen = mapMatterStatus(b.status) === "Open" ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;
    return (a.title || "").localeCompare(b.title || "", undefined, {
      sensitivity: "base",
    });
  });

  const hasOpen = sorted.some((m) => mapMatterStatus(m.status) === "Open");
  const message = hasOpen
    ? null
    : "No open matters for this client. Closed matters are listed so you can still create an invoice.";

  return {
    matters: sorted.map((m) => mapRelatedMatterToGenerate(m, firmClientId)),
    source: "counselflow",
    message,
  };
}

/** ISO date helper for invoices created from firm data. */
export function billingTodayIso(): string {
  return toIsoDate(new Date());
}
