"use client";

import { AccountsReceivableView } from "@/components/ar/AccountsReceivableView";
import { BillingModuleShell } from "@/components/billing/BillingModuleShell";
import { InvoiceManagementSection } from "@/components/billing/InvoiceManagementSection";
import { RoleRestrictedModule } from "@/components/layout/RoleRestrictedModule";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";

export function InvoicesPageClient() {
  const { selectedRole } = useDemoRole();

  if (selectedRole === "accounting_manager") {
    return <AccountsReceivableView />;
  }

  if (
    selectedRole === "billing_specialist" ||
    selectedRole === "managing_partner" ||
    selectedRole === "firm_administrator"
  ) {
    return (
      <BillingModuleShell>
        <InvoiceManagementSection />
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
