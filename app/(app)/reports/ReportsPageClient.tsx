"use client";

import { AccountingManagerReportsView } from "@/components/accounting-manager/reports/AccountingManagerReportsView";
import { ReportsContent } from "@/components/analytics/ReportsContent";
import { RoleReportsView } from "@/components/reports/RoleReportsView";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";

export function ReportsPageClient() {
  const { selectedRole } = useDemoRole();

  if (selectedRole === "accounting_manager") {
    return <AccountingManagerReportsView />;
  }

  if (selectedRole === "managing_partner") {
    return <ReportsContent />;
  }

  return <RoleReportsView />;
}
