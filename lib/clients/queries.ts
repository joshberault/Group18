import type {
  ClientFormValues,
  ClientScheduleEvent,
  FirmClient,
  RelatedMatterSummary,
} from "@/lib/clients/types";
import { createClientSafe } from "@/lib/supabase/client";

const CLIENT_COLUMNS = `
  id, client_number, client_type, status, name, first_name, last_name,
  company_name, primary_contact_name, email, phone,
  address_line_1, address_line_2, city, state, postal_code,
  conflict_check_status, conflict_check_notes, conflict_checked_by, conflict_checked_at,
  notes, is_company, conflict_flag, created_at, updated_at
`;

function formToPayload(values: ClientFormValues) {
  const isCompany = values.client_type === "company";
  const displayName = isCompany
    ? values.company_name.trim()
    : `${values.first_name.trim()} ${values.last_name.trim()}`.trim();

  return {
    client_type: values.client_type,
    status: values.status,
    name: displayName || "Unnamed client",
    first_name: isCompany ? null : values.first_name.trim() || null,
    last_name: isCompany ? null : values.last_name.trim() || null,
    company_name: isCompany ? values.company_name.trim() || null : null,
    primary_contact_name: values.primary_contact_name.trim() || null,
    email: values.email.trim() || null,
    phone: values.phone.trim() || null,
    address_line_1: values.address_line_1.trim() || null,
    address_line_2: values.address_line_2.trim() || null,
    city: values.city.trim() || null,
    state: values.state.trim() || null,
    postal_code: values.postal_code.trim() || null,
    conflict_check_status: values.conflict_check_status,
    conflict_check_notes: values.conflict_check_notes.trim() || null,
    conflict_checked_by: values.conflict_checked_by.trim() || null,
    conflict_checked_at: values.conflict_checked_at
      ? new Date(values.conflict_checked_at).toISOString()
      : null,
    notes: values.notes.trim() || null,
    is_company: isCompany,
    conflict_flag: values.conflict_check_status === "possible_conflict",
  };
}

export async function fetchClients(): Promise<{
  data: FirmClient[];
  error: string | null;
}> {
  const supabase = createClientSafe();
  if (!supabase) {
    return {
      data: [],
      error:
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.",
    };
  }

  const { data, error } = await supabase
    .from("clients")
    .select(CLIENT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as FirmClient[], error: null };
}

export async function fetchClientById(id: string): Promise<{
  data: FirmClient | null;
  error: string | null;
}> {
  const supabase = createClientSafe();
  if (!supabase) {
    return { data: null, error: "Supabase is not configured." };
  }

  const { data, error } = await supabase
    .from("clients")
    .select(CLIENT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as FirmClient | null, error: null };
}

export async function findPossibleDuplicates(
  values: Pick<
    ClientFormValues,
    "client_type" | "email" | "first_name" | "last_name" | "company_name"
  >,
  excludeId?: string,
): Promise<FirmClient[]> {
  const { data } = await fetchClients();
  const email = values.email.trim().toLowerCase();
  const company = values.company_name.trim().toLowerCase();
  const fullName = `${values.first_name.trim()} ${values.last_name.trim()}`
    .trim()
    .toLowerCase();

  return data.filter((client) => {
    if (excludeId && client.id === excludeId) return false;
    const sameEmail =
      !!email && !!client.email && client.email.toLowerCase() === email;
    if (values.client_type === "company") {
      const sameCompany =
        !!company &&
        ((client.company_name ?? "").toLowerCase() === company ||
          client.name.toLowerCase() === company);
      return sameCompany || sameEmail;
    }
    const sameName = !!fullName && client.name.toLowerCase() === fullName;
    return (sameName && sameEmail) || (sameName && !email && !client.email);
  });
}

export async function createClientRecord(
  values: ClientFormValues,
): Promise<{ data: FirmClient | null; error: string | null }> {
  const supabase = createClientSafe();
  if (!supabase) {
    return { data: null, error: "Supabase is not configured." };
  }

  const payload = formToPayload(values);
  const { data, error } = await supabase
    .from("clients")
    .insert(payload)
    .select(CLIENT_COLUMNS)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as FirmClient, error: null };
}

export async function updateClientRecord(
  id: string,
  values: ClientFormValues,
): Promise<{ data: FirmClient | null; error: string | null }> {
  const supabase = createClientSafe();
  if (!supabase) {
    return { data: null, error: "Supabase is not configured." };
  }

  const payload = formToPayload(values);
  const { data, error } = await supabase
    .from("clients")
    .update(payload)
    .eq("id", id)
    .select(CLIENT_COLUMNS)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as FirmClient, error: null };
}

export async function updateClientStatus(
  id: string,
  status: "active" | "inactive",
): Promise<{ data: FirmClient | null; error: string | null }> {
  const supabase = createClientSafe();
  if (!supabase) {
    return { data: null, error: "Supabase is not configured." };
  }

  const { data, error } = await supabase
    .from("clients")
    .update({ status })
    .eq("id", id)
    .select(CLIENT_COLUMNS)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as FirmClient, error: null };
}

export async function fetchRelatedMatters(
  clientId: string,
): Promise<{ data: RelatedMatterSummary[]; error: string | null }> {
  const supabase = createClientSafe();
  if (!supabase) {
    return { data: [], error: "Supabase is not configured." };
  }

  const { data, error } = await supabase
    .from("matters")
    .select("id, title, status, billing_type, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) {
    // Matters RLS may block anon — surface empty with soft message
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as RelatedMatterSummary[], error: null };
}

export async function fetchScheduleEvents(
  month: Date,
): Promise<{ data: ClientScheduleEvent[]; error: string | null }> {
  const supabase = createClientSafe();
  if (!supabase) {
    return { data: [], error: "Supabase is not configured." };
  }

  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("client_schedule_events")
    .select(
      "id, client_id, title, event_date, event_type, notes, created_at, client:clients(id, name, client_number)",
    )
    .gte("event_date", startStr)
    .lte("event_date", endStr)
    .order("event_date", { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as unknown as ClientScheduleEvent[], error: null };
}
