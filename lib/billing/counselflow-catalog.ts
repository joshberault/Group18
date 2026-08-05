/**
 * Adapter: Billing Generate Invoice ↔ CounselFlow Clients module data.
 * Reuses fetchClients / fetchRelatedMatters (Supabase clients + matters tables).
 * Does not invent parallel client/matter stores.
 */

import { displayClientName } from "@/lib/clients/types";
import type { FirmClient, RelatedMatterSummary } from "@/lib/clients/types";
import { fetchClients, fetchRelatedMatters } from "@/lib/clients/queries";
import type {
  GenerateClient,
  GenerateMatter,
  MatterStatus,
} from "@/lib/billing/generate-invoice-types";
import {
  GENERATE_CLIENTS,
  getMattersForClient,
} from "@/lib/billing/generate-invoice-seed";
import { toIsoDate } from "@/lib/billing/billing-period";

export type CatalogSource = "counselflow" | "seed_fallback" | "empty";

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

/** Map a firm matter row into Generate Invoice matter shape (no seed time lines). */
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
 * Load clients for the Generate Invoice dropdown from CounselFlow CRM.
 * Falls back to built-in seed only when Supabase is not configured.
 */
export async function loadBillingClients(): Promise<BillingClientCatalog> {
  const result = await fetchClients();

  if (result.error && result.data.length === 0) {
    const notConfigured =
      result.error.includes("not configured") ||
      result.error.includes("NEXT_PUBLIC_SUPABASE");

    if (notConfigured) {
      return {
        clients: GENERATE_CLIENTS.map((c) => ({ ...c })),
        source: "seed_fallback",
        message:
          "CounselFlow Clients is unavailable (Supabase not configured). Showing demo clients so the invoice workflow can still run.",
      };
    }

    return {
      clients: [],
      source: "empty",
      message: `Could not load firm clients: ${result.error}`,
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
 * Load matters for the selected firm client (CounselFlow matters by client_id).
 * Seed matters only when the client is a legacy seed/fallback client (`gc-*` ids).
 */
export async function loadBillingMattersForClient(
  firmClientId: string,
  options?: { catalogSource?: CatalogSource },
): Promise<BillingMatterCatalog> {
  // Session-created clients never hit Supabase
  if (firmClientId.startsWith("gc-custom-")) {
    return {
      matters: [],
      source: "empty",
      message: null,
    };
  }

  // Seed-fallback clients keep matching seed matters for the offline demo only
  if (
    options?.catalogSource === "seed_fallback" ||
    firmClientId.startsWith("gc-")
  ) {
    const seeded = getMattersForClient(firmClientId);
    return {
      matters: seeded.map((m) => ({
        ...m,
        timeEntries: m.timeEntries.map((t) => ({ ...t })),
        expenses: m.expenses.map((e) => ({ ...e })),
        writeDowns: m.writeDowns.map((w) => ({ ...w })),
      })),
      source: "seed_fallback",
      message:
        options?.catalogSource === "seed_fallback"
          ? "Using demo matters (Supabase not configured)."
          : null,
    };
  }

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
        "This client has no matters in CounselFlow yet. Open the Clients module to review matters, or add a matter for this invoice session only.",
    };
  }

  return {
    matters: result.data.map((m) => mapRelatedMatterToGenerate(m, firmClientId)),
    source: "counselflow",
    message: null,
  };
}

/** ISO date helper for invoices created from firm data. */
export function billingTodayIso(): string {
  return toIsoDate(new Date());
}
