"use client";

import { AccountingWorkspace } from "@/components/accounting/AccountingWorkspace";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";

export function AccountingPageClient() {
  const { hasPermission } = useDemoRole();

  if (
    hasPermission("view_accounting_dashboard") ||
    hasPermission("manage_accounting") ||
    hasPermission("view_accounting")
  ) {
    return <AccountingWorkspace />;
  }

  return (
    <ModulePlaceholder
      title="Accounting"
      description="Trust accounting, retainers, write-downs, write-offs, and audit controls."
      iconName="accounting"
    />
  );
}
