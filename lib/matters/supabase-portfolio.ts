import { createClientSafe } from "@/lib/supabase/client";
import { SPECIALTY_ATTORNEY_PROFILES } from "@/lib/attorney/specialty-attorneys";
import { syncLeadAttorneyAssignment } from "@/lib/intake/matter-assignments";
import type {  EngagementFeeType,
  MatterActivationStatus,
  MatterEngagementStatus,
  MatterLifecycleStatus,
} from "@/lib/matters/firm-portfolio";

export type FirmPortfolioPatch = Partial<{
  status: MatterLifecycleStatus;
  activationStatus: MatterActivationStatus;
  engagementStatus: MatterEngagementStatus;
  feeType: EngagementFeeType;
  hourlyRate: number | null;
  flatFeeAmount: number | null;
  budgetCap: number | null;
  billingHold: boolean;
  responsibleAttorney: string | null;
  needsPartnerReview: boolean;
  partnerReviewReason: string | null;
}>;

function lifecycleToDbStatus(status: MatterLifecycleStatus): string {
  if (status === "closed") return "closed";
  if (status === "archived") return "archived";
  if (status === "on_hold") return "on_hold";
  return "open";
}

function lifecycleToActivation(status: MatterLifecycleStatus): MatterActivationStatus {
  if (status === "closed" || status === "archived") return "closed";
  if (status === "on_hold") return "pending_activation";
  return "active";
}

async function resolveProfileIdByAttorneyName(
  name: string,
): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const specialty = SPECIALTY_ATTORNEY_PROFILES.find(
    (attorney) => attorney.fullName.toLowerCase() === trimmed.toLowerCase(),
  );
  if (specialty) return specialty.id;

  const supabase = createClientSafe();
  if (!supabase) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id")
    .ilike("full_name", trimmed)
    .maybeSingle();

  return (data?.id as string | undefined) ?? null;
}

export async function persistFirmPortfolioPatch(
  matterId: string,
  patch: FirmPortfolioPatch,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClientSafe();
  if (!supabase) return { ok: false, error: "Supabase unavailable" };

  const matterUpdates: Record<string, unknown> = {};

  if (patch.status) {
    matterUpdates.status = lifecycleToDbStatus(patch.status);
    matterUpdates.activation_status =
      patch.activationStatus ?? lifecycleToActivation(patch.status);
  } else if (patch.activationStatus) {
    matterUpdates.activation_status = patch.activationStatus;
  }

  if (patch.engagementStatus) {
    matterUpdates.engagement_status = patch.engagementStatus;
  }

  if (patch.feeType) {
    matterUpdates.billing_type =
      patch.feeType === "flat"
        ? "fixed_fee"
        : patch.feeType === "contingency"
          ? "contingency"
          : patch.feeType === "retainer"
            ? "retainer"
            : patch.feeType === "hybrid"
              ? "hybrid"
              : "hourly";
  }
  if (patch.hourlyRate !== undefined) matterUpdates.hourly_rate = patch.hourlyRate;
  if (patch.flatFeeAmount !== undefined) {
    matterUpdates.fixed_fee_amount = patch.flatFeeAmount;
  }
  if (patch.billingHold !== undefined) matterUpdates.billing_hold = patch.billingHold;
  if (patch.needsPartnerReview !== undefined) {
    matterUpdates.needs_partner_review = patch.needsPartnerReview;
  }
  if (patch.partnerReviewReason !== undefined) {
    matterUpdates.partner_review_reason = patch.partnerReviewReason;
  }

  if (Object.keys(matterUpdates).length > 0) {
    const { error } = await supabase
      .from("matters")
      .update(matterUpdates)
      .eq("id", matterId);
    if (error) return { ok: false, error: error.message };
  }

  const profileUpdates: Record<string, unknown> = { matter_id: matterId };
  if (patch.budgetCap !== undefined) profileUpdates.budget = patch.budgetCap ?? 0;
  if (patch.billingHold !== undefined) profileUpdates.billing_hold = patch.billingHold;
  if (patch.responsibleAttorney !== undefined) {
    profileUpdates.billing_attorney = patch.responsibleAttorney;
  }
  if (Object.keys(profileUpdates).length > 1) {
    const { error } = await supabase
      .from("matter_accounting_profiles")
      .upsert(profileUpdates, { onConflict: "matter_id" });
    if (error) return { ok: false, error: error.message };
  }

  if (patch.responsibleAttorney) {
    const profileId = await resolveProfileIdByAttorneyName(patch.responsibleAttorney);
    if (profileId) {
      const sync = await syncLeadAttorneyAssignment(
        matterId,
        profileId,
        patch.responsibleAttorney,
      );
      if (!sync.ok) return sync;
    }
  }

  return { ok: true };
}
