import type { GenerateClient, GenerateMatter } from "@/lib/billing/generate-invoice-types";
import {
  addDynamicInvoiceCharge,
  type DynamicInvoiceCharge,
} from "@/lib/client-portal/invoice-charge-store";
import { resolvePortalCaseNumberForInvoice } from "@/lib/client-portal/invoice-client-map";
import { addInvoiceAddedNotification } from "@/lib/client-portal/notifications-store";

export type PushFinalizedInvoiceResult = {
  chargeAdded: boolean;
  notificationSent: boolean;
  caseNumber: string;
};

/**
 * After Billing finalizes/submits an invoice, post it to the matching client
 * portal Account Summary and notify the client of the new charge.
 */
export function pushFinalizedInvoiceToClientPortal(input: {
  invoiceNumber: string;
  invoiceDate: string;
  totalDue: number;
  client: GenerateClient;
  matter: GenerateMatter;
}): PushFinalizedInvoiceResult {
  const caseNumber = resolvePortalCaseNumberForInvoice({
    matterNumber: input.matter.matterNumber,
    matterName: input.matter.matterName,
    clientName: input.client.name,
  });

  const charge: DynamicInvoiceCharge = {
    id: `billing-finalize-${input.invoiceNumber}`,
    invoiceNumber: input.invoiceNumber,
    caseNumber,
    matterName: input.matter.matterName,
    clientName: input.client.name,
    amount: Math.round(input.totalDue * 100) / 100,
    reason: `Invoice ${input.invoiceNumber} charged for ${input.matter.matterName} (${input.matter.billingPeriod})`,
    chargeDate: input.invoiceDate,
    status: "unpaid",
    source: "billing_finalize",
  };

  const chargeAdded = addDynamicInvoiceCharge(charge);
  if (chargeAdded) {
    addInvoiceAddedNotification({
      invoiceNumber: input.invoiceNumber,
      amount: charge.amount,
      matterName: input.matter.matterName,
      matterReference: caseNumber,
    });
  }

  return {
    chargeAdded,
    notificationSent: chargeAdded,
    caseNumber,
  };
}
