"use client";

import { useRouter } from "next/navigation";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { ManagerDashboard } from "@/components/admin/ManagerDashboard";
import { PageHeader } from "@/components/ui/PageHeader";
import { ADMIN_NAV_ITEMS } from "@/lib/admin/mock-data";
import type { AdminSectionKey } from "@/lib/admin/types";

/** Firm Administrator Dashboard — Person 5 daily action center. */
export default function AdminDashboardPage() {
  const router = useRouter();

  function handleSectionSelect(key: AdminSectionKey) {
    const item = ADMIN_NAV_ITEMS.find((nav) => nav.key === key);
    if (item) router.push(item.href);
  }

  return (
    <div>
      <PageHeader
        title="Firm Administrator Dashboard"
        description="Manage staffing, assignments, approvals, permissions, and workload."
      />
      <div className="mb-6 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-base font-semibold text-navy-900">
          Welcome, Reagan Weeks
        </p>
        <p className="text-sm text-muted">Role: Administrator</p>
      </div>
      <AdminSectionNav activeKey="dashboard" onSelect={handleSectionSelect} />
      <ManagerDashboard />
    </div>
  );
}
