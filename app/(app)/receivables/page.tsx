import { BillingModuleShell } from "@/components/billing/BillingModuleShell";
import { OutstandingReceivablesSection } from "@/components/billing/OutstandingReceivablesSection";

/** Outstanding accounts receivable and collections actions. */
export default function ReceivablesPage() {
  return (
    <BillingModuleShell>
      <OutstandingReceivablesSection />
    </BillingModuleShell>
  );
}
