import { BillingModuleShell } from "@/components/billing/BillingModuleShell";
import { InvoiceManagementSection } from "@/components/billing/InvoiceManagementSection";

/** Invoice Management — search, filter, and open invoice detail. */
export default function InvoicesPage() {
  return (
    <BillingModuleShell>
      <InvoiceManagementSection />
    </BillingModuleShell>
  );
}
