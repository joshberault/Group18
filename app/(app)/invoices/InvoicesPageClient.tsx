"use client";

import { Suspense } from "react";
import { BillingModuleShell } from "@/components/billing/BillingModuleShell";
import { InvoiceManagementSection } from "@/components/billing/InvoiceManagementSection";
import { RoleRestrictedModule } from "@/components/layout/RoleRestrictedModule";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";

function InvoiceManagementFallback() {
  return (
    <div className="space-y-4 p-2">
      <p className="text-sm text-muted">Loading invoices…</p>
    </div>
  );
}

export function InvoicesPageClient() {
  const { selectedRole } = useDemoRole();

  if (
    selectedRole === "accounting_manager" ||
    selectedRole === "billing_specialist" ||
    selectedRole === "managing_partner" ||
    selectedRole === "firm_administrator"
  ) {
    return (
      <BillingModuleShell>
        <Suspense fallback={<InvoiceManagementFallback />}>
          <InvoiceManagementSection />
        </Suspense>
      </BillingModuleShell>
    );
  }

  return (
    <RoleRestrictedModule
      href="/invoices"
      title="Invoices & Collections"
      description="Generate invoices, track payments, manage collections, and monitor accounts receivable."
      iconName="invoices"
    />
  );
}
