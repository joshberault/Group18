"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminDataProvider } from "@/components/admin/AdminDataProvider";
import { ApprovalQueue } from "@/components/admin/ApprovalQueue";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { getDefaultRouteForRole } from "@/lib/roles/role-config";

/**
 * Approval Queue for the Managing Partner dashboard.
 * Moved from Firm Administrator Admin/Staff sections.
 */
export default function ManagingPartnerApprovalsPage() {
  const { role, isClientReady } = useDemoRole();
  const router = useRouter();

  useEffect(() => {
    if (!isClientReady) return;
    if (role !== "managing_partner") {
      router.replace(getDefaultRouteForRole(role));
    }
  }, [isClientReady, role, router]);

  if (!isClientReady || role !== "managing_partner") {
    return <LoadingState message="Opening Approval Queue..." />;
  }

  return (
    <div>
      <PageHeader
        title="Approval Queue"
        description="Review pending time, expense, vacation, and staffing approval requests."
      />
      <AdminDataProvider>
        <ApprovalQueue />
      </AdminDataProvider>
    </div>
  );
}
