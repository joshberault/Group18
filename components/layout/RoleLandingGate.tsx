"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDefaultHomePath } from "@/lib/auth/role-routes";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { LoadingState } from "@/components/ui/LoadingState";

/**
 * Role-aware landing at /dashboard.
 * Each demo role is sent to its operational home; managing partner stays on firm dashboard.
 */
export function RoleLandingGate() {
  const { role } = useDemoRole();
  const router = useRouter();
  const homePath = getDefaultHomePath(role);
  const isFirmDashboard = homePath === "/dashboard";

  useEffect(() => {
    if (!isFirmDashboard) {
      router.replace(homePath);
    }
  }, [homePath, isFirmDashboard, router]);

  if (!isFirmDashboard) {
    return <LoadingState message="Opening your dashboard..." />;
  }

  return <DashboardContent />;
}
