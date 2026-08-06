import { DemoRoleGuard } from "@/components/auth/DemoRoleGuard";
import { ReportsContent } from "@/components/analytics/ReportsContent";
import { ANALYTICS_ROLES } from "@/lib/analytics/types";

export default function ReportsPage() {
  return (
    <DemoRoleGuard allowedRoles={[...ANALYTICS_ROLES]}>
      <ReportsContent />
    </DemoRoleGuard>
  );
}
