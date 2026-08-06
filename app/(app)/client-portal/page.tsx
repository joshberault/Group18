"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClientPortalContent } from "@/components/client-portal/ClientPortalContent";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";

export default function ClientPortalPage() {
  const router = useRouter();
  const { selectedRole } = useDemoRole();

  useEffect(() => {
    if (selectedRole === "client") {
      router.replace("/client-portal/account-summary");
    }
  }, [router, selectedRole]);

  if (selectedRole === "client") {
    return null;
  }

  return <ClientPortalContent />;
}
