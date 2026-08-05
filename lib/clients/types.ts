import type { UserRole } from "@/lib/types";

export type ClientType = "individual" | "company";
export type ClientRecordStatus = "active" | "inactive";
export type ConflictCheckStatus =
  | "not_reviewed"
  | "pending"
  | "cleared"
  | "possible_conflict";

export interface FirmClient {
  id: string;
  client_number: string;
  client_type: ClientType;
  status: ClientRecordStatus;
  name: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  primary_contact_name: string | null;
  email: string | null;
  phone: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  conflict_check_status: ConflictCheckStatus;
  conflict_check_notes: string | null;
  conflict_checked_by: string | null;
  conflict_checked_at: string | null;
  notes: string | null;
  is_company: boolean;
  conflict_flag: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientScheduleEvent {
  id: string;
  client_id: string;
  title: string;
  event_date: string;
  event_type: string;
  notes: string | null;
  created_at: string;
  client?: Pick<FirmClient, "id" | "name" | "client_number"> | null;
}

export interface RelatedMatterSummary {
  id: string;
  title: string;
  status: string;
  billing_type: string;
  created_at: string;
}

export interface ClientFormValues {
  client_type: ClientType;
  status: ClientRecordStatus;
  first_name: string;
  last_name: string;
  company_name: string;
  primary_contact_name: string;
  email: string;
  phone: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  conflict_check_status: ConflictCheckStatus;
  conflict_check_notes: string;
  conflict_checked_by: string;
  conflict_checked_at: string;
  notes: string;
}

export const CONFLICT_STATUS_LABELS: Record<ConflictCheckStatus, string> = {
  not_reviewed: "Not Reviewed",
  pending: "Pending",
  cleared: "Cleared",
  possible_conflict: "Possible Conflict",
};

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  individual: "Individual",
  company: "Company",
};

/** Roles allowed on the firm-wide Clients module (nav already excludes client). */
export const CLIENTS_MODULE_ROLES: UserRole[] = [
  "managing_partner",
  "attorney",
  "paralegal",
  "billing_specialist",
  "firm_administrator",
];

export function emptyClientForm(
  overrides?: Partial<ClientFormValues>,
): ClientFormValues {
  return {
    client_type: "individual",
    status: "active",
    first_name: "",
    last_name: "",
    company_name: "",
    primary_contact_name: "",
    email: "",
    phone: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    postal_code: "",
    conflict_check_status: "not_reviewed",
    conflict_check_notes: "",
    conflict_checked_by: "",
    conflict_checked_at: "",
    notes: "",
    ...overrides,
  };
}

export function clientToFormValues(client: FirmClient): ClientFormValues {
  return {
    client_type: client.client_type,
    status: client.status,
    first_name: client.first_name ?? "",
    last_name: client.last_name ?? "",
    company_name: client.company_name ?? "",
    primary_contact_name: client.primary_contact_name ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    address_line_1: client.address_line_1 ?? "",
    address_line_2: client.address_line_2 ?? "",
    city: client.city ?? "",
    state: client.state ?? "",
    postal_code: client.postal_code ?? "",
    conflict_check_status: client.conflict_check_status,
    conflict_check_notes: client.conflict_check_notes ?? "",
    conflict_checked_by: client.conflict_checked_by ?? "",
    conflict_checked_at: client.conflict_checked_at
      ? client.conflict_checked_at.slice(0, 10)
      : "",
    notes: client.notes ?? "",
  };
}

export function displayClientName(client: Pick<FirmClient, "name" | "client_type" | "company_name" | "first_name" | "last_name">): string {
  if (client.client_type === "company") {
    return client.company_name || client.name;
  }
  const full = [client.first_name, client.last_name].filter(Boolean).join(" ");
  return full || client.name;
}
