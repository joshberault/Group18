"use client";

import { BillingDashboard } from "@/components/billing/BillingDashboard";
import { BillingModuleShell } from "@/components/billing/BillingModuleShell";
import { BillingOversightView } from "@/components/billing/BillingOversightView";
import { ClientRelatedMatters } from "@/components/client-related-matters/ClientRelatedMatters";
import { RoleRestrictedModule } from "@/components/layout/RoleRestrictedModule";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import type { BillingDashboardData } from "@/lib/billing/types";

interface BillingPageClientProps {
  dashboardData: BillingDashboardData;
}

export function BillingPageClient({ dashboardData }: BillingPageClientProps) {
  const { selectedRole } = useDemoRole();

  if (selectedRole === "accounting_manager") {
    return <BillingOversightView />;
  }

  if (
    selectedRole === "billing_specialist" ||
    selectedRole === "managing_partner" ||
    selectedRole === "firm_administrator"
  ) {
    return (
      <>
        <BillingModuleShell>
          <BillingDashboard data={dashboardData} />
        </BillingModuleShell>
        {/* Rendered outside the shell so scoped .billing-module CSS does not override it. */}
        <ClientRelatedMatters />
      </>
    );
  }

  return (
    <RoleRestrictedModule
      href="/billing"
      title="Billing"
      description="Configure billing rates, fee arrangements, billing cycles, and pre-invoice review."
      iconName="billing"
    />
  );
}
