"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AccountingManagerReportsView } from "@/components/accounting-manager/reports/AccountingManagerReportsView";
import { ReportsContent } from "@/components/analytics/ReportsContent";
import { RoleReportsView } from "@/components/reports/RoleReportsView";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { LoadingState } from "@/components/ui/LoadingState";

export function ReportsPageClient() {
  const router = useRouter();
  const { selectedRole } = useDemoRole();

  useEffect(() => {
    if (selectedRole === "managing_partner") {
      router.replace("/dashboard/analytics");
    }
  }, [router, selectedRole]);

  if (selectedRole === "accounting_manager") {
    return <AccountingManagerReportsView />;
  }

  if (selectedRole === "managing_partner") {
    return <LoadingState message="Opening Executive Analytics…" />;
  }

  return <RoleReportsView />;
}
