export {
  PIPELINE_TOTAL as MATTER_CREATION_PIPELINE_TOTAL,
  buildFirmAdminMatterApprovalsUrl as buildFirmAdminApprovalsUrl,
  buildMatterCreationUrl,
} from "@/lib/pipeline/contract-to-cash";

import { pipelineNextStepLabel, pipelineStepLabel } from "@/lib/pipeline/contract-to-cash";

export const MATTER_CREATION_PIPELINE_STEP = 3;

export function matterCreationPipelineLabel(): string {
  return pipelineStepLabel("matter_created");
}

export function matterCreationNextStepLabel(): string {
  return pipelineNextStepLabel("matter_created");
}
