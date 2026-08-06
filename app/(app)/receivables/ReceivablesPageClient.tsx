"use client";

import { AccountsReceivableView } from "@/components/ar/AccountsReceivableView";
import { BillingModuleShell } from "@/components/billing/BillingModuleShell";
import { OutstandingReceivablesSection } from "@/components/billing/OutstandingReceivablesSection";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";

export function ReceivablesPageClient() {
  const { selectedRole } = useDemoRole();

  if (selectedRole === "accounting_manager") {
    return <AccountsReceivableView />;
  }

  return (
    <BillingModuleShell>
      <OutstandingReceivablesSection />
    </BillingModuleShell>
  );
}
