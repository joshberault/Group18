import { createClientSafe } from "@/lib/supabase/client";
import { displayClientName, type ClientType } from "@/lib/clients/types";
import type {
  MatterCreationFormValues,
  MatterCreationLookupOption,
  MatterCreationRequest,
  MatterCreationRequestStatus,
} from "@/lib/matters/matter-creation-types";

type Actor = { name: string; role: string };
type StorageMode = "table" | "audit";

const AUDIT_RECORD_TYPE = "matter_creation_request";
const AUDIT_MODULE = "Matter Intake";

type StoredMatterRequestPayload = {
  clientId: string;
  practiceAreaId: string | null;
  title: string;
  description: string;
  billingType: MatterCreationRequest["billingType"];
  hourlyRate: number | null;
  fixedFeeAmount: number | null;
  retainerAmount: number | null;
  expenseTerms: string;
  proposedAttorneyName: string;
  submittedByName: string;
  submittedByRole: string;
  status: MatterCreationRequestStatus;
  reviewNotes: string;
  reviewedByName: string;
  reviewedAt: string | null;
  createdMatterId: string | null;
  createdAt: string;
};

let cachedStorageMode: StorageMode | null = null;

function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clientTypeFromRow(row: {
  client_type?: unknown;
  is_company?: unknown;
}): ClientType {
  if (row.client_type === "company" || row.client_type === "individual") {
    return row.client_type;
  }
  return row.is_company ? "company" : "individual";
}

async function detectStorageMode(
  supabase: NonNullable<ReturnType<typeof createClientSafe>>,
): Promise<StorageMode> {
  if (cachedStorageMode) return cachedStorageMode;
  const { error } = await supabase
    .from("matter_creation_requests")
    .select("id")
    .limit(1);
  cachedStorageMode = error ? "audit" : "table";
  return cachedStorageMode;
}

function mapRequestRow(
  row: Record<string, unknown>,
  client?: Record<string, unknown> | null,
  practiceArea?: Record<string, unknown> | null,
): MatterCreationRequest {
  const clientRow = client ?? (row.clients as Record<string, unknown> | null);
  const practiceRow =
    practiceArea ?? (row.practice_areas as Record<string, unknown> | null);

  return {
    id: String(row.id),
    clientId: String(row.client_id),
    clientName: clientRow
      ? displayClientName({
          name: String(clientRow.name ?? ""),
          first_name: (clientRow.first_name as string | null) ?? null,
          last_name: (clientRow.last_name as string | null) ?? null,
          company_name: (clientRow.company_name as string | null) ?? null,
          client_type: clientTypeFromRow(clientRow),
        })
      : "Unknown client",
    practiceAreaId: row.practice_area_id ? String(row.practice_area_id) : null,
    practiceAreaName: practiceRow?.name ? String(practiceRow.name) : "—",
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    billingType: String(row.billing_type ?? "hourly") as MatterCreationRequest["billingType"],
    hourlyRate: asNumber(row.hourly_rate),
    fixedFeeAmount: asNumber(row.fixed_fee_amount),
    retainerAmount: asNumber(row.retainer_amount),
    expenseTerms: String(row.expense_terms ?? ""),
    proposedAttorneyName: String(row.proposed_attorney_name ?? ""),
    submittedByName: String(row.submitted_by_name ?? ""),
    submittedByRole: String(row.submitted_by_role ?? ""),
    status: String(row.status ?? "pending") as MatterCreationRequestStatus,
    reviewNotes: String(row.review_notes ?? ""),
    reviewedByName: String(row.reviewed_by_name ?? ""),
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    createdMatterId: row.created_matter_id ? String(row.created_matter_id) : null,
    createdAt: String(row.created_at ?? ""),
  };
}

function payloadToRequest(
  id: string,
  payload: StoredMatterRequestPayload,
  clientName = "Unknown client",
  practiceAreaName = "—",
): MatterCreationRequest {
  return {
    id,
    clientId: payload.clientId,
    clientName,
    practiceAreaId: payload.practiceAreaId,
    practiceAreaName,
    title: payload.title,
    description: payload.description,
    billingType: payload.billingType,
    hourlyRate: payload.hourlyRate,
    fixedFeeAmount: payload.fixedFeeAmount,
    retainerAmount: payload.retainerAmount,
    expenseTerms: payload.expenseTerms,
    proposedAttorneyName: payload.proposedAttorneyName,
    submittedByName: payload.submittedByName,
    submittedByRole: payload.submittedByRole,
    status: payload.status,
    reviewNotes: payload.reviewNotes,
    reviewedByName: payload.reviewedByName,
    reviewedAt: payload.reviewedAt,
    createdMatterId: payload.createdMatterId,
    createdAt: payload.createdAt,
  };
}

function formToPayload(values: MatterCreationFormValues, actor: Actor) {
  return {
    client_id: values.client_id,
    practice_area_id: values.practice_area_id || null,
    title: values.title.trim(),
    description: values.description.trim() || null,
    billing_type: values.billing_type,
    hourly_rate:
      values.billing_type === "hourly" ? asNumber(values.hourly_rate) : null,
    fixed_fee_amount:
      values.billing_type === "fixed_fee"
        ? asNumber(values.fixed_fee_amount)
        : null,
    retainer_amount:
      values.billing_type === "retainer"
        ? asNumber(values.retainer_amount)
        : null,
    expense_terms: values.expense_terms.trim() || null,
    proposed_attorney_name: values.proposed_attorney_name.trim() || null,
    submitted_by_name: actor.name,
    submitted_by_role: actor.role,
    status: "pending",
  };
}

function formToStoredPayload(
  values: MatterCreationFormValues,
  actor: Actor,
): StoredMatterRequestPayload {
  return {
    clientId: values.client_id,
    practiceAreaId: values.practice_area_id || null,
    title: values.title.trim(),
    description: values.description.trim(),
    billingType: values.billing_type,
    hourlyRate:
      values.billing_type === "hourly" ? asNumber(values.hourly_rate) : null,
    fixedFeeAmount:
      values.billing_type === "fixed_fee"
        ? asNumber(values.fixed_fee_amount)
        : null,
    retainerAmount:
      values.billing_type === "retainer"
        ? asNumber(values.retainer_amount)
        : null,
    expenseTerms: values.expense_terms.trim(),
    proposedAttorneyName: values.proposed_attorney_name.trim(),
    submittedByName: actor.name,
    submittedByRole: actor.role,
    status: "pending",
    reviewNotes: "",
    reviewedByName: "",
    reviewedAt: null,
    createdMatterId: null,
    createdAt: new Date().toISOString(),
  };
}

async function hydrateAuditRequests(
  supabase: NonNullable<ReturnType<typeof createClientSafe>>,
  rows: Array<Record<string, unknown>>,
): Promise<MatterCreationRequest[]> {
  const payloads = rows
    .map((row) => {
      try {
        const payload = JSON.parse(String(row.after_value ?? "{}")) as StoredMatterRequestPayload;
        return { id: String(row.record_id), payload };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as Array<{ id: string; payload: StoredMatterRequestPayload }>;

  const clientIds = [...new Set(payloads.map((row) => row.payload.clientId))];
  const practiceAreaIds = [
    ...new Set(
      payloads
        .map((row) => row.payload.practiceAreaId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [clientsRes, practiceAreasRes] = await Promise.all([
    clientIds.length
      ? supabase
          .from("clients")
          .select("id, name, first_name, last_name, company_name, client_type, is_company")
          .in("id", clientIds)
      : Promise.resolve({ data: [] }),
    practiceAreaIds.length
      ? supabase.from("practice_areas").select("id, name").in("id", practiceAreaIds)
      : Promise.resolve({ data: [] }),
  ]);

  const clientNames = new Map(
    (clientsRes.data ?? []).map((client) => [
      String(client.id),
      displayClientName({
        name: String(client.name ?? ""),
        first_name: (client.first_name as string | null) ?? null,
        last_name: (client.last_name as string | null) ?? null,
        company_name: (client.company_name as string | null) ?? null,
        client_type: clientTypeFromRow(client),
      }),
    ]),
  );
  const practiceNames = new Map(
    (practiceAreasRes.data ?? []).map((area) => [String(area.id), String(area.name)]),
  );

  return payloads.map(({ id, payload }) =>
    payloadToRequest(
      id,
      payload,
      clientNames.get(payload.clientId) ?? "Unknown client",
      payload.practiceAreaId
        ? practiceNames.get(payload.practiceAreaId) ?? "—"
        : "—",
    ),
  );
}

async function fetchAuditRequests(
  supabase: NonNullable<ReturnType<typeof createClientSafe>>,
  status?: MatterCreationRequestStatus | "all",
): Promise<MatterCreationRequest[]> {
  const { data, error } = await supabase
    .from("audit_events")
    .select("*")
    .eq("record_type", AUDIT_RECORD_TYPE)
    .order("event_timestamp", { ascending: false });

  if (error) throw new Error(error.message);

  const requests = await hydrateAuditRequests(supabase, data ?? []);
  if (!status || status === "all") return requests;
  return requests.filter((request) => request.status === status);
}

async function findProfileIdByName(
  supabase: NonNullable<ReturnType<typeof createClientSafe>>,
  fullName: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("full_name", fullName)
    .limit(1)
    .maybeSingle();
  return data?.id ? String(data.id) : null;
}

async function createMatterFromPayload(
  supabase: NonNullable<ReturnType<typeof createClientSafe>>,
  payload: StoredMatterRequestPayload,
): Promise<string> {
  const retainerAmount = payload.retainerAmount;
  const { data: matter, error } = await supabase
    .from("matters")
    .insert({
      client_id: payload.clientId,
      practice_area_id: payload.practiceAreaId,
      title: payload.title,
      description: payload.description || null,
      status: "open",
      billing_type: payload.billingType,
      hourly_rate: payload.hourlyRate,
      fixed_fee_amount: payload.fixedFeeAmount,
      retainer_amount: retainerAmount,
      retainer_balance: retainerAmount,
      expense_terms: payload.expenseTerms || null,
    })
    .select("id")
    .single();

  if (error || !matter) {
    throw new Error(error?.message ?? "Unable to create matter.");
  }

  const matterId = String(matter.id);
  if (payload.proposedAttorneyName) {
    const profileId = await findProfileIdByName(supabase, payload.proposedAttorneyName);
    if (profileId) {
      await supabase.from("matter_assignments").insert({
        matter_id: matterId,
        profile_id: profileId,
        role_on_matter: "lead_attorney",
      });
    }
  }

  return matterId;
}

export async function fetchMatterCreationLookups(): Promise<{
  clients: MatterCreationLookupOption[];
  practiceAreas: MatterCreationLookupOption[];
  attorneys: MatterCreationLookupOption[];
  error: string | null;
}> {
  const supabase = createClientSafe();
  if (!supabase) {
    return {
      clients: [],
      practiceAreas: [],
      attorneys: [],
      error: "Supabase is not configured.",
    };
  }

  const [clientsRes, practiceAreasRes, profilesRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, first_name, last_name, company_name, client_type, is_company, conflict_check_status")
      .order("name"),
    supabase.from("practice_areas").select("id, name").order("name"),
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("role", ["attorney", "managing_partner", "paralegal"])
      .order("full_name"),
  ]);

  if (clientsRes.error) {
    return {
      clients: [],
      practiceAreas: [],
      attorneys: [],
      error: clientsRes.error.message,
    };
  }

  const clients = (clientsRes.data ?? []).map((client) => ({
    value: String(client.id),
    label: displayClientName({
      name: String(client.name ?? ""),
      first_name: (client.first_name as string | null) ?? null,
      last_name: (client.last_name as string | null) ?? null,
      company_name: (client.company_name as string | null) ?? null,
      client_type: clientTypeFromRow(client),
    }),
    meta:
      client.conflict_check_status === "cleared"
        ? "Conflict cleared"
        : String(client.conflict_check_status ?? "not_reviewed").replaceAll("_", " "),
  }));

  const practiceAreas = (practiceAreasRes.data ?? []).map((area) => ({
    value: String(area.id),
    label: String(area.name),
  }));

  const attorneys = (profilesRes.data ?? [])
    .map((profile) => String(profile.full_name ?? "").trim())
    .filter(Boolean)
    .map((name) => ({ value: name, label: name }));

  return { clients, practiceAreas, attorneys, error: null };
}

export async function fetchMatterCreationRequests(options?: {
  status?: MatterCreationRequestStatus | "all";
}): Promise<{ data: MatterCreationRequest[]; error: string | null }> {
  const supabase = createClientSafe();
  if (!supabase) {
    return { data: [], error: "Supabase is not configured." };
  }

  const mode = await detectStorageMode(supabase);
  if (mode === "audit") {
    try {
      const data = await fetchAuditRequests(supabase, options?.status);
      return { data, error: null };
    } catch (err) {
      return {
        data: [],
        error: err instanceof Error ? err.message : "Unable to load matter requests.",
      };
    }
  }

  let query = supabase
    .from("matter_creation_requests")
    .select(
      `
        *,
        clients (
          id, name, first_name, last_name, company_name, client_type, is_company
        ),
        practice_areas (
          id, name
        )
      `,
    )
    .order("created_at", { ascending: false });

  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;
  if (error) {
    return { data: [], error: error.message };
  }

  return {
    data: (data ?? []).map((row) =>
      mapRequestRow(
        row as Record<string, unknown>,
        (row as { clients?: Record<string, unknown> }).clients,
        (row as { practice_areas?: Record<string, unknown> }).practice_areas,
      ),
    ),
    error: null,
  };
}

export async function submitMatterCreationRequest(
  values: MatterCreationFormValues,
  actor: Actor,
): Promise<{ ok: boolean; error?: string; requestId?: string }> {
  const supabase = createClientSafe();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  if (!values.client_id || !values.title.trim()) {
    return { ok: false, error: "Client and matter title are required." };
  }

  const mode = await detectStorageMode(supabase);

  if (mode === "audit") {
    const requestId = crypto.randomUUID();
    const payload = formToStoredPayload(values, actor);
    const { error } = await supabase.from("audit_events").insert({
      actor_name: actor.name,
      actor_role: actor.role,
      module: AUDIT_MODULE,
      action: "Submit Matter Request",
      record_type: AUDIT_RECORD_TYPE,
      record_id: requestId,
      description: payload.title,
      after_value: JSON.stringify(payload),
      review_status: "Unreviewed",
      source_module: "Matters",
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, requestId };
  }

  const { data, error } = await supabase
    .from("matter_creation_requests")
    .insert(formToPayload(values, actor))
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, requestId: String(data.id) };
}

export async function approveMatterCreationRequest(
  requestId: string,
  reviewer: Actor,
  reviewNotes?: string,
): Promise<{ ok: boolean; error?: string; matterId?: string }> {
  const supabase = createClientSafe();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const mode = await detectStorageMode(supabase);

  if (mode === "audit") {
    const { data: event, error } = await supabase
      .from("audit_events")
      .select("*")
      .eq("record_type", AUDIT_RECORD_TYPE)
      .eq("record_id", requestId)
      .single();

    if (error || !event) {
      return { ok: false, error: error?.message ?? "Request not found." };
    }

    let payload: StoredMatterRequestPayload;
    try {
      payload = JSON.parse(String(event.after_value ?? "{}")) as StoredMatterRequestPayload;
    } catch {
      return { ok: false, error: "Request payload is invalid." };
    }

    if (payload.status !== "pending") {
      return { ok: false, error: "This request has already been reviewed." };
    }

    try {
      const matterId = await createMatterFromPayload(supabase, payload);
      const nextPayload: StoredMatterRequestPayload = {
        ...payload,
        status: "approved",
        reviewNotes: reviewNotes?.trim() || "",
        reviewedByName: reviewer.name,
        reviewedAt: new Date().toISOString(),
        createdMatterId: matterId,
      };

      const { error: updateError } = await supabase
        .from("audit_events")
        .update({
          review_status: "Reviewed",
          review_note: reviewNotes?.trim() || null,
          after_value: JSON.stringify(nextPayload),
          description: `${payload.title} (approved)`,
        })
        .eq("record_type", AUDIT_RECORD_TYPE)
        .eq("record_id", requestId);

      if (updateError) return { ok: false, error: updateError.message };
      return { ok: true, matterId };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Unable to create matter.",
      };
    }
  }

  const { data: request, error: requestError } = await supabase
    .from("matter_creation_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (requestError || !request) {
    return { ok: false, error: requestError?.message ?? "Request not found." };
  }

  if (request.status !== "pending") {
    return { ok: false, error: "This request has already been reviewed." };
  }

  const retainerAmount = asNumber(request.retainer_amount);
  const { data: matter, error: matterError } = await supabase
    .from("matters")
    .insert({
      client_id: request.client_id,
      practice_area_id: request.practice_area_id,
      title: request.title,
      description: request.description,
      status: "open",
      billing_type: request.billing_type,
      hourly_rate: asNumber(request.hourly_rate),
      fixed_fee_amount: asNumber(request.fixed_fee_amount),
      retainer_amount: retainerAmount,
      retainer_balance: retainerAmount,
      expense_terms: request.expense_terms,
    })
    .select("id")
    .single();

  if (matterError || !matter) {
    return { ok: false, error: matterError?.message ?? "Unable to create matter." };
  }

  const matterId = String(matter.id);
  const proposedAttorney = String(request.proposed_attorney_name ?? "").trim();
  if (proposedAttorney) {
    const profileId = await findProfileIdByName(supabase, proposedAttorney);
    if (profileId) {
      await supabase.from("matter_assignments").insert({
        matter_id: matterId,
        profile_id: profileId,
        role_on_matter: "lead_attorney",
      });
    }
  }

  const { error: updateError } = await supabase
    .from("matter_creation_requests")
    .update({
      status: "approved",
      review_notes: reviewNotes?.trim() || null,
      reviewed_by_name: reviewer.name,
      reviewed_at: new Date().toISOString(),
      created_matter_id: matterId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateError) return { ok: false, error: updateError.message };
  return { ok: true, matterId };
}

export async function rejectMatterCreationRequest(
  requestId: string,
  reviewer: Actor,
  reviewNotes?: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClientSafe();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const mode = await detectStorageMode(supabase);

  if (mode === "audit") {
    const { data: event, error } = await supabase
      .from("audit_events")
      .select("*")
      .eq("record_type", AUDIT_RECORD_TYPE)
      .eq("record_id", requestId)
      .single();

    if (error || !event) {
      return { ok: false, error: error?.message ?? "Request not found." };
    }

    let payload: StoredMatterRequestPayload;
    try {
      payload = JSON.parse(String(event.after_value ?? "{}")) as StoredMatterRequestPayload;
    } catch {
      return { ok: false, error: "Request payload is invalid." };
    }

    if (payload.status !== "pending") {
      return { ok: false, error: "This request has already been reviewed." };
    }

    const nextPayload: StoredMatterRequestPayload = {
      ...payload,
      status: "rejected",
      reviewNotes: reviewNotes?.trim() || "",
      reviewedByName: reviewer.name,
      reviewedAt: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("audit_events")
      .update({
        review_status: "Reviewed",
        review_note: reviewNotes?.trim() || null,
        after_value: JSON.stringify(nextPayload),
        description: `${payload.title} (rejected)`,
      })
      .eq("record_type", AUDIT_RECORD_TYPE)
      .eq("record_id", requestId);

    if (updateError) return { ok: false, error: updateError.message };
    return { ok: true };
  }

  const { error } = await supabase
    .from("matter_creation_requests")
    .update({
      status: "rejected",
      review_notes: reviewNotes?.trim() || null,
      reviewed_by_name: reviewer.name,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending");

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
