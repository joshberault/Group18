import { createClientSafe } from "@/lib/supabase/client";
import type { ConflictCheckStatus } from "@/lib/clients/types";
import type {
  MatterActivationStatus,
  MatterEngagementStatus,
} from "@/lib/matters/firm-portfolio";
import { activateMatterForBillableWork } from "@/lib/matters/supabase-portfolio";
import {
  isEngagementApproved,
  syncApprovedEngagementsToSupabase,
} from "@/lib/pipeline/engagement-approval-store";

export type MatterGateContext = {
  matterId: string;
  activationStatus: MatterActivationStatus;
  engagementStatus: MatterEngagementStatus;
  billingHold: boolean;
  conflictStatus: ConflictCheckStatus;
  lifecycleStatus: string;
};

export type MatterGateResult = {
  allowed: boolean;
  reason: string | null;
};

const DEMO_MATTER_ID_PATTERN = /^matter-/;

function mapConflict(
  conflictFlag: boolean,
  raw: string | null | undefined,
): ConflictCheckStatus {
  if (conflictFlag) return "possible_conflict";
  const t = (raw ?? "").toLowerCase();
  if (
    t === "cleared" ||
    t === "pending" ||
    t === "not_reviewed" ||
    t === "possible_conflict"
  ) {
    return t;
  }
  return conflictFlag ? "possible_conflict" : "cleared";
}

export function evaluateMatterGate(ctx: MatterGateContext): MatterGateResult {
  if (ctx.activationStatus !== "active") {
    const label =
      ctx.activationStatus === "draft"
        ? "draft"
        : ctx.activationStatus === "pending_activation"
          ? "pending activation"
          : "closed";
    return {
      allowed: false,
      reason: `Matter is ${label}. Activate the matter before recording time or billing.`,
    };
  }

  if (ctx.billingHold) {
    return {
      allowed: false,
      reason: "Billing hold is in effect on this matter.",
    };
  }

  if (ctx.conflictStatus !== "cleared") {
    const conflictLabel =
      ctx.conflictStatus === "possible_conflict"
        ? "a possible conflict"
        : ctx.conflictStatus === "pending"
          ? "a pending conflict check"
          : "an uncleared conflict check";
    return {
      allowed: false,
      reason: `Conflict clearance required — client has ${conflictLabel}.`,
    };
  }

  return { allowed: true, reason: null };
}

export async function fetchMatterGateContext(
  matterId: string,
): Promise<MatterGateContext | null> {
  if (DEMO_MATTER_ID_PATTERN.test(matterId)) {
    return {
      matterId,
      activationStatus: "active",
      engagementStatus: "signed",
      billingHold: false,
      conflictStatus: "cleared",
      lifecycleStatus: "open",
    };
  }

  const supabase = createClientSafe();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("matters")
    .select(
      `
      id,
      status,
      activation_status,
      engagement_status,
      billing_hold,
      client:clients (
        conflict_flag,
        conflict_check_status
      )
    `,
    )
    .eq("id", matterId)
    .maybeSingle();

  if (error?.message?.toLowerCase().includes("activation_status")) {
    const legacy = await supabase
      .from("matters")
      .select(
        `
        id,
        status,
        client:clients (
          conflict_flag,
          conflict_check_status
        )
      `,
      )
      .eq("id", matterId)
      .maybeSingle();
    if (legacy.error || !legacy.data) return null;
    const client = (
      legacy.data as {
        client?: {
          conflict_flag?: boolean;
          conflict_check_status?: string | null;
        } | null;
      }
    ).client;
    const lifecycleStatus = String(legacy.data.status ?? "open");
    return {
      matterId: String(legacy.data.id),
      activationStatus:
        lifecycleStatus === "closed" || lifecycleStatus === "archived"
          ? "closed"
          : lifecycleStatus === "on_hold"
            ? "pending_activation"
            : "active",
      engagementStatus: "signed",
      billingHold: false,
      conflictStatus: mapConflict(
        Boolean(client?.conflict_flag),
        client?.conflict_check_status,
      ),
      lifecycleStatus,
    };
  }

  if (error || !data) return null;

  const client = (
    data as {
      client?: {
        conflict_flag?: boolean;
        conflict_check_status?: string | null;
      } | null;
    }
  ).client;

  return {
    matterId: String(data.id),
    activationStatus: (data.activation_status ??
      "active") as MatterActivationStatus,
    engagementStatus: (data.engagement_status ??
      "signed") as MatterEngagementStatus,
    billingHold: Boolean(data.billing_hold),
    conflictStatus: mapConflict(
      Boolean(client?.conflict_flag),
      client?.conflict_check_status,
    ),
    lifecycleStatus: String(data.status ?? "open"),
  };
}

export async function checkMatterBillable(
  matterId: string,
): Promise<MatterGateResult> {
  await syncApprovedEngagementsToSupabase();

  let ctx = await fetchMatterGateContext(matterId);
  if (!ctx) {
    return { allowed: true, reason: null };
  }

  const engagementReadyForWork =
    ctx.engagementStatus === "signed" ||
    ctx.engagementStatus === "letter_sent" ||
    isEngagementApproved(matterId);

  const shouldActivate =
    ctx.activationStatus === "draft" &&
    ctx.lifecycleStatus === "open" &&
    !ctx.billingHold &&
    ctx.conflictStatus === "cleared" &&
    engagementReadyForWork;

  if (shouldActivate) {
    const activation = await activateMatterForBillableWork(matterId);
    if (!activation.ok) {
      return {
        allowed: false,
        reason:
          activation.error ??
          "Could not activate this matter for time entry. Check Supabase connectivity and try again.",
      };
    }
    ctx = (await fetchMatterGateContext(matterId)) ?? ctx;
  }

  const result = evaluateMatterGate(ctx);
  if (
    !result.allowed &&
    ctx.activationStatus === "draft" &&
    ctx.engagementStatus === "not_started"
  ) {
    return {
      allowed: false,
      reason:
        "Engagement terms are not set up yet. Open the matter workspace, apply engagement terms, or have Firm Administrator approve the engagement before recording time.",
    };
  }

  return result;
}

export function evaluateMatterGateFromPortfolio(input: {
  activationStatus: MatterActivationStatus;
  engagementStatus?: MatterEngagementStatus;
  billingHold: boolean;
  conflictStatus: ConflictCheckStatus;
  lifecycleStatus?: string;
}): MatterGateResult {
  return evaluateMatterGate({
    matterId: "",
    activationStatus: input.activationStatus,
    engagementStatus: input.engagementStatus ?? "signed",
    billingHold: input.billingHold,
    conflictStatus: input.conflictStatus,
    lifecycleStatus: input.lifecycleStatus ?? "open",
  });
}
