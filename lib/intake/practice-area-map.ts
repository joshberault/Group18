import type { ConsultationLegalServiceId } from "@/lib/demo/consultation-requests-store";
import type { CaseTypeId } from "@/lib/client-portal/case-task-lists";
import { CASE_TYPE_BILLING_MODELS } from "@/lib/client-portal/billing-models";
import {
  getLeadAttorneyForPracticeArea,
  type SpecialtyAttorneyProfile,
} from "@/lib/attorney/specialty-attorneys";

/** Known practice area UUIDs (matches seed-fifteen-client-pipeline.mjs). */
export const PRACTICE_AREA_IDS = {
  litigation: "d4e1bd24-0f84-475b-8353-d3fe57d62215",
  corporate: "85e83475-a571-485d-b68c-a57b1089a7c4",
  realEstate: "819de1f2-d9d7-4cd0-8cf3-01638b14307b",
  employment: "5b25138c-a451-4925-b3b9-e1be2e9097d1",
  ip: "135b6bf2-fa11-4c9b-9e1d-84012059c3a8",
} as const;

export const PRACTICE_AREA_OPTIONS = [
  { id: PRACTICE_AREA_IDS.litigation, name: "Litigation" },
  { id: PRACTICE_AREA_IDS.corporate, name: "Corporate" },
  { id: PRACTICE_AREA_IDS.employment, name: "Employment" },
  { id: PRACTICE_AREA_IDS.realEstate, name: "Real Estate" },
  { id: PRACTICE_AREA_IDS.ip, name: "Intellectual Property" },
] as const;

const CONSULTATION_TO_CASE_TYPE: Record<
  Exclude<ConsultationLegalServiceId, "other">,
  CaseTypeId
> = {
  corporate_business: "corporate_business_advisory",
  employment: "employment_litigation_employee",
  litigation: "commercial_litigation",
  real_estate: "commercial_real_estate",
};

const CONSULTATION_TO_PRACTICE: Record<
  Exclude<ConsultationLegalServiceId, "other">,
  { id: string; name: string }
> = {
  corporate_business: { id: PRACTICE_AREA_IDS.corporate, name: "Corporate" },
  employment: { id: PRACTICE_AREA_IDS.employment, name: "Employment" },
  litigation: { id: PRACTICE_AREA_IDS.litigation, name: "Litigation" },
  real_estate: { id: PRACTICE_AREA_IDS.realEstate, name: "Real Estate" },
};

export function resolvePracticeAreaFromIntake(
  legalServices: ConsultationLegalServiceId[],
): { practiceAreaId: string; practiceAreaName: string; caseType: CaseTypeId } {
  const primary = legalServices.find(
    (service): service is Exclude<ConsultationLegalServiceId, "other"> =>
      service !== "other",
  );

  if (primary) {
    return {
      practiceAreaId: CONSULTATION_TO_PRACTICE[primary].id,
      practiceAreaName: CONSULTATION_TO_PRACTICE[primary].name,
      caseType: CONSULTATION_TO_CASE_TYPE[primary],
    };
  }

  return {
    practiceAreaId: PRACTICE_AREA_IDS.litigation,
    practiceAreaName: "Litigation",
    caseType: "civil_litigation",
  };
}

export function defaultBillingTypeForCaseType(
  caseType: CaseTypeId,
): "hourly" | "fixed_fee" | "retainer" | "contingency" {
  const model = CASE_TYPE_BILLING_MODELS[caseType];
  if (model === "flat_fee") return "fixed_fee";
  return model;
}

export function defaultLeadAttorneyForIntake(
  legalServices: ConsultationLegalServiceId[],
): SpecialtyAttorneyProfile {
  const { practiceAreaName } = resolvePracticeAreaFromIntake(legalServices);
  return getLeadAttorneyForPracticeArea(practiceAreaName);
}
