import { DemoRoleGuard } from "@/components/auth/DemoRoleGuard";
import { RiskCenterContent } from "@/components/analytics/RiskCenterContent";
import { ANALYTICS_ROLES } from "@/lib/analytics/types";

export default function RiskCenterPage() {
  return (
    <DemoRoleGuard allowedRoles={[...ANALYTICS_ROLES]}>
      <RiskCenterContent />
    </DemoRoleGuard>
  );
}
