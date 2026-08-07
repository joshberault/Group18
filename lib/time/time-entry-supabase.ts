import { createClientSafe } from "@/lib/supabase/client";
import {
  getApprovedBillableTimeEntriesForMatter,
  getDemoApprovalForTimeEntryId,
} from "@/lib/demo/time-workflow-store";

export type TimeEntryApprovalStatus = "pending" | "approved" | "rejected";

const DEMO_EMPLOYEE_PROFILE_IDS: Record<string, string> = {
  "demo-paralegal": "bbbb0202-0001-4001-8001-000000000002",
  "demo-profile-paralegal": "bbbb0202-0001-4001-8001-000000000002",
};

export function isSupabaseUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isUuid(value: string): boolean {
  return isSupabaseUuid(value);
}

function resolveProfileId(
  employeeId: string | undefined,
  profileIdHint?: string,
): string | null {
  if (profileIdHint && isUuid(profileIdHint)) return profileIdHint;
  const id = employeeId?.trim() ?? "";
  if (!id) return null;
  if (isUuid(id)) return id;
  return DEMO_EMPLOYEE_PROFILE_IDS[id] ?? null;
}

export type InsertTimeEntryInput = {
  matterId: string;
  profileId: string;
  entryDate: string;
  hours: number;
  description: string;
  isBillable: boolean;
};

export async function insertTimeEntryInSupabase(
  input: InsertTimeEntryInput,
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClientSafe();
  if (!supabase) {
    return { id: null, error: "Database unavailable." };
  }

  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      matter_id: input.matterId,
      profile_id: input.profileId,
      entry_date: input.entryDate,
      hours: input.hours,
      description: input.description,
      is_billable: input.isBillable,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    return { id: null, error: error.message };
  }

  return { id: String(data.id), error: null };
}

export async function updateTimeEntryStatusInSupabase(
  timeEntryId: string,
  status: TimeEntryApprovalStatus,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClientSafe();
  if (!supabase) {
    return { ok: false, error: "Database unavailable." };
  }

  const { error } = await supabase
    .from("time_entries")
    .update({ status })
    .eq("id", timeEntryId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, error: null };
}

type TimeEntryMatchInput = {
  matterId: string;
  entryDate: string;
  hours: number;
  description: string;
  profileId?: string;
  status?: TimeEntryApprovalStatus;
};

async function findTimeEntryInSupabase(
  input: TimeEntryMatchInput,
): Promise<string | null> {
  const supabase = createClientSafe();
  if (!supabase) return null;

  let query = supabase
    .from("time_entries")
    .select("id")
    .eq("matter_id", input.matterId)
    .eq("entry_date", input.entryDate)
    .eq("hours", input.hours)
    .eq("description", input.description)
    .order("created_at", { ascending: false })
    .limit(1);

  if (input.profileId) {
    query = query.eq("profile_id", input.profileId);
  }
  if (input.status) {
    query = query.eq("status", input.status);
  }

  const { data } = await query;
  const row = data?.[0];
  return row ? String((row as { id: string }).id) : null;
}

/** Match a pending row when the Supabase id was not stored at submit time. */
export async function findPendingTimeEntryInSupabase(input: {
  matterId: string;
  profileId: string;
  entryDate: string;
  hours: number;
  description: string;
}): Promise<string | null> {
  return findTimeEntryInSupabase({ ...input, status: "pending" });
}

async function insertTimeEntryWithStatus(
  input: InsertTimeEntryInput & { status: TimeEntryApprovalStatus },
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClientSafe();
  if (!supabase) {
    return { id: null, error: "Database unavailable." };
  }

  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      matter_id: input.matterId,
      profile_id: input.profileId,
      entry_date: input.entryDate,
      hours: input.hours,
      description: input.description,
      is_billable: input.isBillable,
      status: input.status,
    })
    .select("id")
    .single();

  if (error) {
    return { id: null, error: error.message };
  }

  return { id: String(data.id), error: null };
}

export type TimeApprovalSyncInput = {
  id?: string;
  matterId?: string;
  employeeId?: string;
  originalSnapshot?: string;
  timeEntryDate?: string;
  timeEntryHours?: number;
  timeEntryDescription?: string;
  timeEntryBillable?: boolean;
  profileIdHint?: string;
};

/** Create or update the Supabase time_entries row for an approval decision. */
export async function ensureTimeEntryFromApproval(
  approval: TimeApprovalSyncInput,
  decision: "approved" | "rejected" | "returned",
): Promise<{ ok: boolean; error: string | null }> {
  const status: TimeEntryApprovalStatus =
    decision === "approved" ? "approved" : "rejected";

  if (approval.id && isUuid(approval.id)) {
    return updateTimeEntryStatusInSupabase(approval.id, status);
  }

  let timeEntryId = parseSupabaseTimeEntryIdFromSnapshot(
    approval.originalSnapshot,
  );

  const profileId = resolveProfileId(
    approval.employeeId,
    approval.profileIdHint,
  );

  if (
    !timeEntryId &&
    approval.matterId &&
    approval.timeEntryDate &&
    approval.timeEntryHours != null &&
    approval.timeEntryDescription
  ) {
    if (profileId) {
      timeEntryId = await findPendingTimeEntryInSupabase({
        matterId: approval.matterId,
        profileId,
        entryDate: approval.timeEntryDate,
        hours: approval.timeEntryHours,
        description: approval.timeEntryDescription,
      });
    }

    if (!timeEntryId) {
      timeEntryId = await findTimeEntryInSupabase({
        matterId: approval.matterId,
        entryDate: approval.timeEntryDate,
        hours: approval.timeEntryHours,
        description: approval.timeEntryDescription,
        status: "approved",
      });
    }

    if (!timeEntryId) {
      timeEntryId = await findTimeEntryInSupabase({
        matterId: approval.matterId,
        entryDate: approval.timeEntryDate,
        hours: approval.timeEntryHours,
        description: approval.timeEntryDescription,
        status: "pending",
      });
    }
  }

  if (timeEntryId) {
    return updateTimeEntryStatusInSupabase(timeEntryId, status);
  }

  if (
    decision !== "approved" ||
    !approval.matterId ||
    !approval.timeEntryDate ||
    approval.timeEntryHours == null ||
    !approval.timeEntryDescription ||
    approval.timeEntryBillable === false
  ) {
    return { ok: true, error: null };
  }

  if (!profileId) {
    return {
      ok: false,
      error:
        "Could not resolve the timekeeper profile for this approved entry.",
    };
  }

  const inserted = await insertTimeEntryWithStatus({
    matterId: approval.matterId,
    profileId,
    entryDate: approval.timeEntryDate,
    hours: approval.timeEntryHours,
    description: approval.timeEntryDescription,
    isBillable: approval.timeEntryBillable ?? true,
    status: "approved",
  });

  if (inserted.error) {
    return { ok: false, error: inserted.error };
  }

  return { ok: true, error: null };
}

/** Backfill demo-workflow approved time into Supabase before invoicing. */
export async function backfillApprovedDemoTimeForMatter(
  matterId: string,
): Promise<void> {
  if (typeof window === "undefined") return;

  const entries = getApprovedBillableTimeEntriesForMatter(matterId);
  for (const entry of entries) {
    const approval = getDemoApprovalForTimeEntryId(entry.id);
    await ensureTimeEntryFromApproval(
      {
        matterId: entry.matter_id,
        employeeId: approval?.employeeId ?? entry.profile_id,
        profileIdHint: entry.profile_id,
        originalSnapshot: approval?.originalSnapshot,
        timeEntryDate: entry.entry_date,
        timeEntryHours: entry.hours,
        timeEntryDescription: entry.description,
        timeEntryBillable: entry.is_billable,
      },
      "approved",
    );
  }
}

export function parseSupabaseTimeEntryIdFromSnapshot(
  snapshot: string | undefined,
): string | null {
  if (!snapshot) return null;
  const parts = snapshot.split("|");
  if (parts[0] !== "time_entry" || !parts[2]) return null;
  if (parts[2].startsWith("time-demo-")) return null;
  return parts[2];
}

export async function syncTimeApprovalToSupabase(
  approval: TimeApprovalSyncInput,
  decision: "approved" | "rejected" | "returned",
): Promise<{ ok: boolean; error: string | null }> {
  return ensureTimeEntryFromApproval(approval, decision);
}

export async function deletePendingTimeEntryInSupabase(
  timeEntryId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClientSafe();
  if (!supabase) {
    return { ok: false, error: "Database unavailable." };
  }

  const { data, error: fetchError } = await supabase
    .from("time_entries")
    .select("status")
    .eq("id", timeEntryId)
    .maybeSingle();

  if (fetchError) {
    return { ok: false, error: fetchError.message };
  }
  if (!data) {
    return { ok: true, error: null };
  }

  const status = String((data as { status?: string }).status ?? "").toLowerCase();
  if (status !== "pending" && status !== "draft") {
    return {
      ok: false,
      error: "Only pending time entries can be deleted.",
    };
  }

  const { error } = await supabase.from("time_entries").delete().eq("id", timeEntryId);
  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, error: null };
}

/** Replace demo-sync ids with Supabase UUIDs before invoice finalize. */
export async function resolveTimeEntryIdForInvoicing(input: {
  id: string;
  matterId: string;
  entryDate: string;
  hours: number;
  description: string;
}): Promise<string> {
  if (isUuid(input.id) && !input.id.startsWith("demo-sync-")) {
    return input.id;
  }

  const demoId = input.id.startsWith("demo-sync-")
    ? input.id.slice("demo-sync-".length)
    : input.id;
  const approval = getDemoApprovalForTimeEntryId(demoId);

  await ensureTimeEntryFromApproval(
    {
      matterId: input.matterId,
      employeeId: approval?.employeeId,
      profileIdHint: approval?.employeeId,
      originalSnapshot: approval?.originalSnapshot,
      timeEntryDate: input.entryDate,
      timeEntryHours: input.hours,
      timeEntryDescription: input.description,
      timeEntryBillable: approval?.timeEntryBillable ?? true,
    },
    "approved",
  );

  const synced =
    parseSupabaseTimeEntryIdFromSnapshot(approval?.originalSnapshot) ??
    (await findTimeEntryInSupabase({
      matterId: input.matterId,
      entryDate: input.entryDate,
      hours: input.hours,
      description: input.description,
      status: "approved",
    }));

  return synced && isUuid(synced) ? synced : input.id;
}
