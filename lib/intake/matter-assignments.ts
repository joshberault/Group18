import { createClientSafe } from "@/lib/supabase/client";

/** Sync lead attorney on matter_assignments and matter_accounting_profiles. */
export async function syncLeadAttorneyAssignment(
  matterId: string,
  profileId: string,
  attorneyName: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClientSafe();
  if (!supabase) return { ok: false, error: "Supabase unavailable" };

  const { error: assignError } = await supabase.from("matter_assignments").upsert(
    {
      matter_id: matterId,
      profile_id: profileId,
      role_on_matter: "lead_attorney",
      assigned_at: new Date().toISOString(),
    },
    { onConflict: "matter_id,profile_id" },
  );

  if (assignError) return { ok: false, error: assignError.message };

  const { error: profileError } = await supabase
    .from("matter_accounting_profiles")
    .upsert(
      {
        matter_id: matterId,
        billing_attorney: attorneyName,
      },
      { onConflict: "matter_id" },
    );

  if (profileError) return { ok: false, error: profileError.message };

  return { ok: true };
}
