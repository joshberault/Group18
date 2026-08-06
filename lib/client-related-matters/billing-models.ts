/**
 * Firm billing models by case type.
 * Mirrors the billing rules used across the client portal so the Billing module
 * applies the same guardrails when payment plans are changed.
 */

export type BillingModel = "hourly" | "retainer" | "flat_fee" | "contingency";

export const HOURLY_CASE_TYPES = [
  "Probate administration",
  "Commercial real estate",
  "Tax planning",
  "Insurance defense",
] as const;

export const RETAINER_CASE_TYPES = [
  "Corporate/business advisory",
  "Commercial litigation",
  "Civil litigation",
  "Employment counseling (employer)",
  "Family law",
  "Intellectual property litigation",
  "Tax controversy",
  "Mergers and acquisitions",
  "Regulatory compliance",
] as const;

export const CONTINGENCY_CASE_TYPES = [
  "Personal injury (plaintiff)",
  "Medical malpractice (plaintiff)",
  "Employment litigation (employee)",
  "Class action (plaintiff)",
  "Debt collection",
] as const;

export const FLAT_FEE_AMOUNTS: Record<string, number> = {
  "Criminal defense": 5000,
  "Estate planning": 2000,
  "Residential real estate closing": 1500,
  Bankruptcy: 2500,
  Immigration: 3500,
  "Intellectual property prosecution": 2000,
  "Contract drafting": 2000,
};

/** Percentage of the award invoiced when a contingency matter is won. */
export const CONTINGENCY_RATE = 0.35;

const HOURLY = new Set<string>(HOURLY_CASE_TYPES);
const RETAINER = new Set<string>(RETAINER_CASE_TYPES);
const CONTINGENCY = new Set<string>(CONTINGENCY_CASE_TYPES);

export function resolveBillingModel(caseType: string): BillingModel {
  if (HOURLY.has(caseType)) return "hourly";
  if (RETAINER.has(caseType)) return "retainer";
  if (CONTINGENCY.has(caseType)) return "contingency";
  if (caseType in FLAT_FEE_AMOUNTS) return "flat_fee";
  return "hourly";
}

export function getFlatFeeAmount(caseType: string): number | null {
  return FLAT_FEE_AMOUNTS[caseType] ?? null;
}

export const BILLING_MODEL_LABELS: Record<BillingModel, string> = {
  hourly: "Hourly",
  retainer: "Retainer",
  flat_fee: "Flat fee",
  contingency: "Contingency",
};
