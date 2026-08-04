import { RoleRestrictedModule } from "@/components/layout/RoleRestrictedModule";

export default function ReportsPage() {
  return (
    <RoleRestrictedModule
      href="/reports"
      title="Reports"
      description="Profitability, utilization, collections, and operational analytics across the firm."
      iconName="reports"
    />
  );
}
