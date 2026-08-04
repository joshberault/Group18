import { RoleRestrictedModule } from "@/components/layout/RoleRestrictedModule";

export default function ClientsPage() {
  return (
    <RoleRestrictedModule
      href="/clients"
      title="Clients"
      description="Manage client records, contacts, engagement history, and trust account relationships across the firm."
      iconName="users"
    />
  );
}
