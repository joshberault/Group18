import { DemoRoleGuard } from "@/components/auth/DemoRoleGuard";
import { ExecutiveDashboardContent } from "@/components/analytics/ExecutiveDashboardContent";
import { ANALYTICS_ROLES } from "@/lib/analytics/types";

export default function ExecutiveAnalyticsPage() {
  return (
    <DemoRoleGuard allowedRoles={[...ANALYTICS_ROLES]}>
      <ExecutiveDashboardContent />
    </DemoRoleGuard>
  );
}
