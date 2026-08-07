import { PIPELINE_STAGE_LABELS } from "@/lib/demo/fifteen-clients";

export const MATTER_CREATION_PIPELINE_STEP = 3;
export const MATTER_CREATION_PIPELINE_TOTAL = 9;

export function matterCreationPipelineLabel(): string {
  return `Step ${MATTER_CREATION_PIPELINE_STEP} of ${MATTER_CREATION_PIPELINE_TOTAL}: ${PIPELINE_STAGE_LABELS.matter_created}`;
}

export function matterCreationNextStepLabel(): string {
  return PIPELINE_STAGE_LABELS.agreement_approved;
}

export function buildMatterCreationUrl(clientId?: string): string {
  const params = new URLSearchParams();
  if (clientId) params.set("clientId", clientId);
  const query = params.toString();
  return query ? `/matters/new?${query}` : "/matters/new";
}

export function buildFirmAdminApprovalsUrl(requestId?: string): string {
  const params = new URLSearchParams({ focus: "matter-approvals" });
  if (requestId) params.set("requestId", requestId);
  return `/matters?${params.toString()}`;
}
