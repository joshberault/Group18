import { BillingModuleShell } from "@/components/billing/BillingModuleShell";
import { GenerateInvoiceWizard } from "@/components/billing/GenerateInvoiceWizard";

/** Multi-step Generate Invoice workflow. */
export default function GenerateInvoicePage() {
  return (
    <BillingModuleShell>
      <GenerateInvoiceWizard />
    </BillingModuleShell>
  );
}
