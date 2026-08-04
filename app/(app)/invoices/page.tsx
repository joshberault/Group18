import { RoleRestrictedModule } from "@/components/layout/RoleRestrictedModule";

export default function InvoicesPage() {
  return (
    <RoleRestrictedModule
      href="/invoices"
      title="Invoices & Collections"
      description="Generate invoices, track payments, manage collections, and monitor accounts receivable."
      iconName="invoices"
    />
  );
}
