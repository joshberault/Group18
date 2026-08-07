import type { ClientFormValues, FirmClient } from "@/lib/clients/types";
import { createClientSafe } from "@/lib/supabase/client";

export interface ClientAuditEvent {
  id: string;
  client_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  changed_at: string;
  reason: string | null;
}

/** Contact + conflict fields tracked in the client audit log. */
export const CLIENT_AUDIT_FIELD_LABELS: Record<string, string> = {
  client_type: "Client type",
  first_name: "First name",
  last_name: "Last name",
  company_name: "Company name",
  primary_contact_name: "Primary contact",
  email: "Email",
  phone: "Phone",
  address_line_1: "Address line 1",
  address_line_2: "Address line 2",
  city: "City",
  state: "State",
  postal_code: "Postal code",
  conflict_check_status: "Conflict-check status",
  conflict_check_notes: "Conflict-check notes",
  conflict_checked_by: "Conflict reviewed by",
  conflict_checked_at: "Conflict review date",
};

const CONTACT_FIELDS = new Set([
  "client_type",
  "first_name",
  "last_name",
  "company_name",
  "primary_contact_name",
  "email",
  "phone",
  "address_line_1",
  "address_line_2",
  "city",
  "state",
  "postal_code",
]);

const CONFLICT_FIELDS = new Set([
  "conflict_check_status",
  "conflict_check_notes",
  "conflict_checked_by",
  "conflict_checked_at",
]);

function normalizeAuditValue(value: string | null | undefined): string {
  if (value == null) return "";
  return String(value).trim();
}

function formFieldValue(
  values: ClientFormValues,
  field: string,
): string {
  const key = field as keyof ClientFormValues;
  const raw = values[key];
  return normalizeAuditValue(typeof raw === "string" ? raw : String(raw ?? ""));
}

function clientFieldValue(client: FirmClient, field: string): string {
  switch (field) {
    case "client_type":
      return client.client_type;
    case "first_name":
      return normalizeAuditValue(client.first_name);
    case "last_name":
      return normalizeAuditValue(client.last_name);
    case "company_name":
      return normalizeAuditValue(client.company_name);
    case "primary_contact_name":
      return normalizeAuditValue(client.primary_contact_name);
    case "email":
      return normalizeAuditValue(client.email);
    case "phone":
      return normalizeAuditValue(client.phone);
    case "address_line_1":
      return normalizeAuditValue(client.address_line_1);
    case "address_line_2":
      return normalizeAuditValue(client.address_line_2);
    case "city":
      return normalizeAuditValue(client.city);
    case "state":
      return normalizeAuditValue(client.state);
    case "postal_code":
      return normalizeAuditValue(client.postal_code);
    case "conflict_check_status":
      return client.conflict_check_status;
    case "conflict_check_notes":
      return normalizeAuditValue(client.conflict_check_notes);
    case "conflict_checked_by":
      return normalizeAuditValue(client.conflict_checked_by);
    case "conflict_checked_at":
      return client.conflict_checked_at
        ? client.conflict_checked_at.slice(0, 10)
        : "";
    default:
      return "";
  }
}

export function diffClientAuditFields(
  before: FirmClient,
  after: ClientFormValues,
): Array<{ field_name: string; old_value: string; new_value: string }> {
  const fields = [...CONTACT_FIELDS, ...CONFLICT_FIELDS];
  const changes: Array<{ field_name: string; old_value: string; new_value: string }> =
    [];

  for (const field of fields) {
    const oldValue = clientFieldValue(before, field);
    const newValue = formFieldValue(after, field);
    if (oldValue !== newValue) {
      changes.push({
        field_name: field,
        old_value: oldValue,
        new_value: newValue,
      });
    }
  }

  return changes;
}

export async function fetchClientAuditEvents(
  clientId: string,
): Promise<{ data: ClientAuditEvent[]; error: string | null }> {
  const supabase = createClientSafe();
  if (!supabase) {
    return { data: [], error: "Supabase is not configured." };
  }

  const { data, error } = await supabase
    .from("client_audit_events")
    .select(
      "id, client_id, field_name, old_value, new_value, changed_by, changed_at, reason",
    )
    .eq("client_id", clientId)
    .order("changed_at", { ascending: false })
    .limit(50);

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as ClientAuditEvent[], error: null };
}

export async function recordClientAuditEvents(
  clientId: string,
  changes: Array<{ field_name: string; old_value: string; new_value: string }>,
  changedBy: string,
  reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (changes.length === 0) return { ok: true };

  const supabase = createClientSafe();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const rows = changes.map((change) => ({
    client_id: clientId,
    field_name: change.field_name,
    old_value: change.old_value || null,
    new_value: change.new_value || null,
    changed_by: changedBy,
    reason: reason?.trim() || null,
  }));

  const { error } = await supabase.from("client_audit_events").insert(rows);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
