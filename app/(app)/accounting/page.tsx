import { RoleRestrictedModule } from "@/components/layout/RoleRestrictedModule";

export default function AccountingPage() {
  return (
    <RoleRestrictedModule
      href="/accounting"
      title="Accounting"
      description="General ledger, trust accounting, reconciliation, and financial controls."
      iconName="accounting"
    />
  );
}
