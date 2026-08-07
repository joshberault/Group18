import { createClientSafe } from "@/lib/supabase/client";
import { syncLeadAttorneyAssignment } from "@/lib/intake/matter-assignments";
import type { SpecialtyAttorneyProfile } from "@/lib/attorney/specialty-attorneys";

export type CreateMatterFromIntakeInput = {
  clientId: string;
  title: string;
  practiceAreaId: string;
  billingType: "hourly" | "fixed_fee" | "retainer" | "contingency";
  description?: string;
  leadAttorney: SpecialtyAttorneyProfile;
};

export async function createMatterFromIntake(
  input: CreateMatterFromIntakeInput,
): Promise<{ matterId: string | null; error: string | null }> {
  const supabase = createClientSafe();
  if (!supabase) {
    return { matterId: null, error: "Supabase is not configured." };
  }

  const matterId = crypto.randomUUID();

  const governancePayload = {
    activation_status: "draft",
    engagement_status: "not_started",
    billing_hold: false,
    needs_partner_review: true,
    partner_review_reason:
      "New intake — pending conflict clearance and engagement approval",
  };

  let { error: insertError } = await supabase.from("matters").insert({
    id: matterId,
    client_id: input.clientId,
    practice_area_id: input.practiceAreaId,
    title: input.title.trim() || "New matter",
    description: input.description?.trim() || null,
    status: "open",
    billing_type: input.billingType,
    ...governancePayload,
  });

  if (insertError?.message?.includes("matters_engagement_status_check")) {
    ({ error: insertError } = await supabase.from("matters").insert({
      id: matterId,
      client_id: input.clientId,
      practice_area_id: input.practiceAreaId,
      title: input.title.trim() || "New matter",
      description: input.description?.trim() || null,
      status: "open",
      billing_type: input.billingType,
      activation_status: "draft",
      engagement_status: "pending",
      billing_hold: false,
      needs_partner_review: true,
      partner_review_reason: governancePayload.partner_review_reason,
    }));
  }

  if (
    insertError?.message?.toLowerCase().includes("activation_status") ||
    insertError?.message?.toLowerCase().includes("engagement_status")
  ) {
    ({ error: insertError } = await supabase.from("matters").insert({
      id: matterId,
      client_id: input.clientId,
      practice_area_id: input.practiceAreaId,
      title: input.title.trim() || "New matter",
      description: input.description?.trim() || null,
      status: "open",
      billing_type: input.billingType,
    }));
  }

  if (insertError) {
    return { matterId: null, error: insertError.message };
  }

  const sync = await syncLeadAttorneyAssignment(
    matterId,
    input.leadAttorney.id,
    input.leadAttorney.fullName,
  );

  if (!sync.ok) {
    return { matterId: null, error: sync.error ?? "Failed to assign lead attorney." };
  }

  return { matterId, error: null };
}
