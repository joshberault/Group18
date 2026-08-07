import {
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABELS,
  type PipelineStage,
} from "@/lib/demo/fifteen-clients";
import { generateInvoiceHref, receivablesHref } from "@/lib/billing/routes";

export const PIPELINE_TOTAL = PIPELINE_STAGES.length;

export type PipelineHandoffRole =
  | "managing_partner"
  | "firm_administrator"
  | "attorney"
  | "paralegal"
  | "billing_specialist"
  | "client";

export const PIPELINE_STEP_ROLES: Record<PipelineStage, PipelineHandoffRole> = {
  client_created: "managing_partner",
  conflict_checked: "firm_administrator",
  matter_created: "managing_partner",
  agreement_approved: "firm_administrator",
  work_completed: "attorney",
  client_billed: "billing_specialist",
  payment_collected: "billing_specialist",
  profit_reviewed: "managing_partner",
  matter_closed: "managing_partner",
};

export const PIPELINE_NEXT_ACTOR: Partial<
  Record<PipelineStage, PipelineHandoffRole>
> = {
  client_created: "firm_administrator",
  conflict_checked: "managing_partner",
  matter_created: "firm_administrator",
  agreement_approved: "attorney",
  work_completed: "managing_partner",
  client_billed: "billing_specialist",
  payment_collected: "managing_partner",
  profit_reviewed: "managing_partner",
};

const ROLE_LABELS: Record<PipelineHandoffRole, string> = {
  managing_partner: "Managing Partner",
  firm_administrator: "Firm Administrator",
  attorney: "Attorney",
  paralegal: "Paralegal",
  billing_specialist: "Billing Specialist",
  client: "Client",
};

export function pipelineStepNumber(stage: PipelineStage): number {
  const index = PIPELINE_STAGES.indexOf(stage);
  return index >= 0 ? index + 1 : 0;
}

export function pipelineStepLabel(stage: PipelineStage): string {
  const step = pipelineStepNumber(stage);
  return `Step ${step} of ${PIPELINE_TOTAL}: ${PIPELINE_STAGE_LABELS[stage]}`;
}

export function pipelineNextStage(stage: PipelineStage): PipelineStage | null {
  const index = PIPELINE_STAGES.indexOf(stage);
  if (index < 0 || index >= PIPELINE_STAGES.length - 1) return null;
  return PIPELINE_STAGES[index + 1];
}

export function pipelineNextStepLabel(stage: PipelineStage): string {
  const next = pipelineNextStage(stage);
  return next ? PIPELINE_STAGE_LABELS[next] : "Pipeline complete";
}

export function pipelineNextActorLabel(stage: PipelineStage): string | null {
  const actor = PIPELINE_NEXT_ACTOR[stage];
  return actor ? ROLE_LABELS[actor] : null;
}

export function buildClientDetailUrl(
  clientId: string,
  params?: Record<string, string | undefined>,
): string {
  const q = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) q.set(key, value);
    }
  }
  const query = q.toString();
  return query
    ? `/clients/${clientId}?${query}`
    : `/clients/${clientId}`;
}

export function buildConflictCheckUrl(clientId: string): string {
  return buildClientDetailUrl(clientId, {
    focus: "conflict",
    submitted: "client-created",
  });
}

export function buildMatterCreationUrl(clientId?: string): string {
  const params = new URLSearchParams();
  if (clientId) params.set("clientId", clientId);
  const query = params.toString();
  return query ? `/matters/new?${query}` : "/matters/new";
}

export function buildFirmAdminMatterApprovalsUrl(requestId?: string): string {
  const params = new URLSearchParams({ focus: "matter-approvals" });
  if (requestId) params.set("requestId", requestId);
  return `/matters?${params.toString()}`;
}

export function buildEngagementApprovalsUrl(matterId?: string): string {
  const params = new URLSearchParams({ focus: "engagement-approvals" });
  if (matterId) params.set("matterId", matterId);
  return `/matters?${params.toString()}`;
}

export function buildAttorneyTimeUrl(matterId?: string): string {
  const params = new URLSearchParams();
  if (matterId) params.set("matterId", matterId);
  params.set("submitted", "engagement-approved");
  const query = params.toString();
  return query ? `/attorney/time?${query}` : "/attorney/time";
}

export function buildTimeApprovalUrl(matterId?: string): string {
  const params = new URLSearchParams({ focus: "time-approvals" });
  if (matterId) params.set("matterId", matterId);
  params.set("submitted", "time-entry");
  return `/dashboard/approvals?${params.toString()}`;
}

export function buildGenerateInvoiceUrl(params?: {
  clientId?: string;
  matterId?: string;
  matterName?: string;
}): string {
  return generateInvoiceHref({
    clientId: params?.clientId,
    matterId: params?.matterId,
    matterName: params?.matterName,
    submitted: "time-approved",
  });
}

export function buildReceivablesUrl(params?: {
  matterId?: string;
  invoiceNumber?: string;
}): string {
  return receivablesHref({
    matterId: params?.matterId,
    highlight: params?.invoiceNumber,
    submitted: "invoice-sent",
  });
}

export function buildProfitReviewUrl(matterId?: string): string {
  const params = new URLSearchParams({ focus: "profit-review" });
  if (matterId) params.set("matterId", matterId);
  params.set("submitted", "payment-collected");
  return `/dashboard/analytics?${params.toString()}`;
}

export function buildMatterCloseUrl(matterId?: string): string {
  const params = new URLSearchParams({ focus: "matter-close" });
  if (matterId) params.set("matterId", matterId);
  params.set("submitted", "profit-reviewed");
  return `/matters?${params.toString()}`;
}
