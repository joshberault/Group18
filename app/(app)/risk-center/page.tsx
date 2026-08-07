"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DemoRoleGuard } from "@/components/auth/DemoRoleGuard";
import { RiskCenterContent } from "@/components/analytics/RiskCenterContent";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { LoadingState } from "@/components/ui/LoadingState";
import { ANALYTICS_ROLES } from "@/lib/analytics/types";

function RiskCenterPageBody() {
  const router = useRouter();
  const { selectedRole } = useDemoRole();

  useEffect(() => {
    if (selectedRole === "managing_partner") {
      router.replace("/dashboard");
    }
  }, [router, selectedRole]);

  if (selectedRole === "managing_partner") {
    return <LoadingState message="Opening Dashboard…" />;
  }

  return <RiskCenterContent />;
}

export default function RiskCenterPage() {
  return (
    <DemoRoleGuard allowedRoles={[...ANALYTICS_ROLES]}>
      <RiskCenterPageBody />
    </DemoRoleGuard>
  );
}
