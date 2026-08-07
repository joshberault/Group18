"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDefaultHomePath } from "@/lib/auth/role-routes";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { LoadingState } from "@/components/ui/LoadingState";

const DashboardContent = dynamic(
  () =>
    import("@/components/dashboard/DashboardContent").then((m) => ({
      default: m.DashboardContent,
    })),
  { loading: () => <LoadingState message="Loading dashboard…" /> },
);

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
