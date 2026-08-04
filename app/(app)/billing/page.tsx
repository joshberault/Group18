import { RoleRestrictedModule } from "@/components/layout/RoleRestrictedModule";

export default function BillingPage() {
  return (
    <RoleRestrictedModule
      href="/billing"
      title="Billing"
      description="Configure billing rates, fee arrangements, billing cycles, and pre-invoice review."
      iconName="billing"
    />
  );
}
