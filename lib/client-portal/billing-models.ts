import type { CaseTypeId } from "@/lib/client-portal/case-task-lists";
import { getDynamicInvoiceCharges } from "@/lib/client-portal/invoice-charge-store";
import { invoiceCharges } from "@/lib/mock-data/client-portal";

export type PortalBillingModel =
  | "hourly"
  | "retainer"
  | "flat_fee"
  | "contingency";

export const CASE_TYPE_BILLING_MODELS: Record<
  CaseTypeId,
  PortalBillingModel
> = {
  corporate_business_advisory: "retainer",
  commercial_litigation: "retainer",
  civil_litigation: "retainer",
  personal_injury_plaintiff: "contingency",
  medical_malpractice_plaintiff: "contingency",
  employment_litigation_employee: "contingency",
  employment_counseling_employer: "retainer",
  family_law: "retainer",
  criminal_defense: "flat_fee",
  estate_planning: "flat_fee",
  probate_administration: "hourly",
  real_estate_closings: "flat_fee",
  commercial_real_estate: "hourly",
  bankruptcy: "flat_fee",
  immigration: "flat_fee",
  intellectual_property_prosecution: "flat_fee",
  intellectual_property_litigation: "retainer",
  tax_planning: "hourly",
  tax_controversy: "retainer",
  mergers_and_acquisitions: "retainer",
  contract_drafting: "flat_fee",
  regulatory_compliance: "retainer",
  debt_collection: "contingency",
  class_action_litigation: "contingency",
  insurance_defense: "hourly",
};

export function getPortalBillingModel(caseType: CaseTypeId) {
  return CASE_TYPE_BILLING_MODELS[caseType];
}

/**
 * Mirrors the balance shown in Account Summary: task progress for a retainer
 * matter unlocks only when every static and dynamically generated charge is paid.
 */
export function areAllClientInvoicesPaid() {
  return [...invoiceCharges, ...getDynamicInvoiceCharges()].every(
    (charge) => charge.status === "paid",
  );
}
