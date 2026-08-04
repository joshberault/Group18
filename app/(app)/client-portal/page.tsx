import { RoleRestrictedModule } from "@/components/layout/RoleRestrictedModule";

export default function ClientPortalPage() {
  return (
    <RoleRestrictedModule
      href="/client-portal"
      title="Client Portal"
      description="Client-facing access to matters, invoices, trust balances, and secure document sharing."
      iconName="portal"
    />
  );
}
