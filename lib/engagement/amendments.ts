import { createClientSafe } from "@/lib/supabase/client";

export type AmendmentStatus = "draft" | "approved";

export type EngagementAmendment = {
  id: string;
  matterId: string;
  version: number;
  changes: Record<string, unknown>;
  reason: string;
  status: AmendmentStatus;
  createdAt: string;
};

type AmendmentRow = {
  id: string;
  matter_id: string;
  version: number;
  changes: Record<string, unknown> | null;
  reason: string;
  status: string;
  created_at: string;
};

function mapAmendmentRow(row: AmendmentRow): EngagementAmendment {
  return {
    id: String(row.id),
    matterId: String(row.matter_id),
    version: row.version,
    changes: row.changes && typeof row.changes === "object" ? row.changes : {},
    reason: row.reason ?? "",
    status: row.status === "approved" ? "approved" : "draft",
    createdAt: row.created_at,
  };
}

export async function listAmendments(
  matterId: string,
): Promise<{ amendments: EngagementAmendment[]; error: string | null }> {
  const supabase = createClientSafe();
  if (!supabase) {
    return { amendments: [], error: "Supabase unavailable" };
  }

  const { data, error } = await supabase
    .from("engagement_amendments")
    .select("id, matter_id, version, changes, reason, status, created_at")
    .eq("matter_id", matterId)
    .order("version", { ascending: false });

  if (error) {
    return { amendments: [], error: error.message };
  }

  return {
    amendments: (data ?? []).map((row) => mapAmendmentRow(row as AmendmentRow)),
    error: null,
  };
}

export async function createAmendment(input: {
  matterId: string;
  changes: Record<string, unknown>;
  reason: string;
  status?: AmendmentStatus;
}): Promise<{ amendment: EngagementAmendment | null; error: string | null }> {
  const supabase = createClientSafe();
  if (!supabase) {
    return { amendment: null, error: "Supabase unavailable" };
  }

  const { data: existing, error: listError } = await supabase
    .from("engagement_amendments")
    .select("version")
    .eq("matter_id", input.matterId)
    .order("version", { ascending: false })
    .limit(1);

  if (listError) {
    return { amendment: null, error: listError.message };
  }

  const nextVersion =
    existing && existing.length > 0 ? Number(existing[0].version) + 1 : 1;

  const { data, error } = await supabase
    .from("engagement_amendments")
    .insert({
      matter_id: input.matterId,
      version: nextVersion,
      changes: input.changes,
      reason: input.reason.trim(),
      status: input.status ?? "draft",
    })
    .select("id, matter_id, version, changes, reason, status, created_at")
    .single();

  if (error) {
    return { amendment: null, error: error.message };
  }

  return { amendment: mapAmendmentRow(data as AmendmentRow), error: null };
}
