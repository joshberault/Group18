"use client";

import { AccountingManagerReportsView } from "@/components/accounting-manager/reports/AccountingManagerReportsView";
import { RoleRestrictedModule } from "@/components/layout/RoleRestrictedModule";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";

export function ReportsPageClient() {
  const { selectedRole } = useDemoRole();

  if (selectedRole === "accounting_manager") {
    return <AccountingManagerReportsView />;
  }

  return (
    <RoleRestrictedModule
      href="/reports"
      title="Reports"
      description="Profitability, utilization, collections, and operational analytics across the firm."
      iconName="reports"
    />
  );
}
