"use client";

import { AccountingManagerClientsView } from "@/components/accounting-manager/clients/AccountingManagerClientsView";
import { ClientsAccessGuard } from "@/components/clients/ClientsAccessGuard";
import { ClientsDashboard } from "@/components/clients/ClientsDashboard";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { CLIENTS_MODULE_ROLES } from "@/lib/clients/types";

export function ClientsPageClient() {
  const { selectedRole } = useDemoRole();

  if (selectedRole === "accounting_manager") {
    return <AccountingManagerClientsView />;
  }

  return (
    <ClientsAccessGuard allowedRoles={CLIENTS_MODULE_ROLES}>
      <ClientsDashboard />
    </ClientsAccessGuard>
  );
}
