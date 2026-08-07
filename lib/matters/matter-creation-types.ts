export type MatterCreationRequestStatus = "pending" | "approved" | "rejected";

export type MatterBillingType = "hourly" | "fixed_fee" | "retainer" | "contingency";

export interface MatterCreationFormValues {
  client_id: string;
  practice_area_id: string;
  title: string;
  description: string;
  billing_type: MatterBillingType;
  hourly_rate: string;
  fixed_fee_amount: string;
  retainer_amount: string;
  expense_terms: string;
  proposed_attorney_name: string;
}

export interface MatterCreationRequest {
  id: string;
  clientId: string;
  clientName: string;
  practiceAreaId: string | null;
  practiceAreaName: string;
  title: string;
  description: string;
  billingType: MatterBillingType;
  hourlyRate: number | null;
  fixedFeeAmount: number | null;
  retainerAmount: number | null;
  expenseTerms: string;
  proposedAttorneyName: string;
  submittedByName: string;
  submittedByRole: string;
  status: MatterCreationRequestStatus;
  reviewNotes: string;
  reviewedByName: string;
  reviewedAt: string | null;
  createdMatterId: string | null;
  createdAt: string;
}

export interface MatterCreationLookupOption {
  value: string;
  label: string;
  meta?: string;
}

export function emptyMatterCreationForm(): MatterCreationFormValues {
  return {
    client_id: "",
    practice_area_id: "",
    title: "",
    description: "",
    billing_type: "hourly",
    hourly_rate: "",
    fixed_fee_amount: "",
    retainer_amount: "",
    expense_terms: "",
    proposed_attorney_name: "",
  };
}

export const MATTER_BILLING_TYPE_LABELS: Record<MatterBillingType, string> = {
  hourly: "Hourly",
  fixed_fee: "Flat fee",
  retainer: "Retainer",
  contingency: "Contingency",
};
