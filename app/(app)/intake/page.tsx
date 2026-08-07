"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { LoadingState } from "@/components/ui/LoadingState";
import { getDefaultRouteForRole } from "@/lib/roles/role-config";

/** Legacy route — intake queue lives on the role dashboard. */
export default function IntakeRedirectPage() {
  const { role, isClientReady } = useDemoRole();
  const router = useRouter();

  useEffect(() => {
    if (!isClientReady) return;
    const base =
      role === "firm_administrator"
        ? "/admin"
        : role === "managing_partner"
          ? "/dashboard"
          : getDefaultRouteForRole(role);
    router.replace(`${base}#intake-queue`);
  }, [isClientReady, role, router]);

  return <LoadingState message="Opening intake queue..." />;
}
