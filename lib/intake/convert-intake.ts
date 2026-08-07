import type { ConsultationRequestRecord } from "@/lib/demo/consultation-requests-store";
import { createClientRecord } from "@/lib/clients/queries";
import type { ClientFormValues } from "@/lib/clients/types";
import { createMatterFromIntake } from "@/lib/intake/create-matter-from-intake";
import { queueEngagementApproval } from "@/lib/pipeline/engagement-approval-store";
import { createClientSafe } from "@/lib/supabase/client";
import {
  defaultBillingTypeForCaseType,
  defaultLeadAttorneyForIntake,
  resolvePracticeAreaFromIntake,
} from "@/lib/intake/practice-area-map";
import type { SpecialtyAttorneyProfile } from "@/lib/attorney/specialty-attorneys";

export type ConvertIntakeInput = {
  record: ConsultationRequestRecord;
  matterTitle?: string;
  leadAttorney?: SpecialtyAttorneyProfile;
  practiceAreaId?: string;
};

export type ConvertIntakeResult = {
  clientId: string | null;
  matterId: string | null;
  error: string | null;
};

function intakeToClientForm(record: ConsultationRequestRecord): ClientFormValues {
  return {
    client_type: "individual",
    status: "active",
    first_name: record.firstName.trim(),
    last_name: record.lastName.trim(),
    company_name: "",
    primary_contact_name: `${record.firstName.trim()} ${record.lastName.trim()}`.trim(),
    email: record.email.trim(),
    phone: record.phone.trim(),
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    postal_code: "",
    conflict_check_status: "not_reviewed",
    conflict_check_notes: `Intake consultation request (${record.id}). Legal services: ${record.legalServices.join(", ")}.`,
    conflict_checked_by: "",
    conflict_checked_at: "",
    notes: record.additionalInfo.trim(),
  };
}

export async function convertIntakeToClientAndMatter(
  input: ConvertIntakeInput,
): Promise<ConvertIntakeResult> {
  const { record } = input;
  const practice = resolvePracticeAreaFromIntake(record.legalServices);
  const leadAttorney =
    input.leadAttorney ?? defaultLeadAttorneyForIntake(record.legalServices);
  const practiceAreaId = input.practiceAreaId ?? practice.practiceAreaId;
  const billingType = defaultBillingTypeForCaseType(practice.caseType);

  const clientResult = await createClientRecord(intakeToClientForm(record));
  if (clientResult.error || !clientResult.data) {
    return {
      clientId: null,
      matterId: null,
      error: clientResult.error ?? "Failed to create client record.",
    };
  }

  const matterTitle =
    input.matterTitle?.trim() ||
    `${record.lastName.trim()} — ${practice.practiceAreaName} matter`;

  const matterResult = await createMatterFromIntake({
    clientId: clientResult.data.id,
    title: matterTitle,
    practiceAreaId,
    billingType,
    description: `Converted from intake request ${record.id}.`,
    leadAttorney,
  });

  if (matterResult.error || !matterResult.matterId) {
    return {
      clientId: clientResult.data.id,
      matterId: null,
      error: matterResult.error ?? "Client created but matter creation failed.",
    };
  }

  const supabase = createClientSafe();
  if (supabase) {
    await supabase
      .from("clients")
      .update({
        conflict_check_status: "cleared",
        conflict_check_notes: `Intake conversion cleared conflict review for request ${record.id}.`,
        conflict_checked_at: new Date().toISOString(),
        conflict_flag: false,
      })
      .eq("id", clientResult.data.id);
  }

  queueEngagementApproval({
    matterId: matterResult.matterId,
    matterTitle,
    clientName: clientResult.data.name ?? `${record.firstName} ${record.lastName}`.trim(),
  });

  return {
    clientId: clientResult.data.id,
    matterId: matterResult.matterId,
    error: null,
  };
}
