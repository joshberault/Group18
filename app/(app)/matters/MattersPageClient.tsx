"use client";

import { AccountingManagerMattersView } from "@/components/accounting-manager/matters/AccountingManagerMattersView";
import { RoleRestrictedModule } from "@/components/layout/RoleRestrictedModule";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";

export function MattersPageClient() {
  const { selectedRole } = useDemoRole();

  if (selectedRole === "accounting_manager") {
    return <AccountingManagerMattersView />;
  }

  return (
    <RoleRestrictedModule
      href="/matters"
      title="Matters"
      description="Track legal matters, engagement terms, responsible attorneys, and matter lifecycle status."
      iconName="briefcase"
    />
  );
}
