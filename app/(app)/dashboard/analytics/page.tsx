import { Suspense } from "react";
import { DemoRoleGuard } from "@/components/auth/DemoRoleGuard";
import { ExecutiveDashboardContent } from "@/components/analytics/ExecutiveDashboardContent";
import { LoadingState } from "@/components/ui/LoadingState";
import { ANALYTICS_ROLES } from "@/lib/analytics/types";

export default function ExecutiveAnalyticsPage() {
  return (
    <DemoRoleGuard allowedRoles={[...ANALYTICS_ROLES]}>
      <Suspense fallback={<LoadingState message="Loading analytics…" />}>
        <ExecutiveDashboardContent />
      </Suspense>
    </DemoRoleGuard>
  );
}
