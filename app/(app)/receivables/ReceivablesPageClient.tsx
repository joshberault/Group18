"use client";

import { AccountsReceivableView } from "@/components/ar/AccountsReceivableView";
import { BillingModuleShell } from "@/components/billing/BillingModuleShell";
import { OutstandingReceivablesSection } from "@/components/billing/OutstandingReceivablesSection";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { Suspense } from "react";

export function ReceivablesPageClient() {
  const { selectedRole } = useDemoRole();

  if (selectedRole === "accounting_manager") {
    return (
      <Suspense fallback={<p className="p-6 text-sm text-muted">Loading receivables…</p>}>
        <AccountsReceivableView />
      </Suspense>
    );
  }

  return (
    <BillingModuleShell>
      <OutstandingReceivablesSection />
    </BillingModuleShell>
  );
}
