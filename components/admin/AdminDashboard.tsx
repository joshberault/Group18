"use client";

import { useMemo, useState } from "react";
import {
  Briefcase,
  CheckSquare,
  FolderOpen,
  Gauge,
  LayoutDashboard,
  Scale,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { ApprovalQueue } from "@/components/admin/ApprovalQueue";
import { AssignmentsPanel } from "@/components/admin/AssignmentsPanel";
import { AttorneyManagement } from "@/components/admin/AttorneyManagement";
import { EmployeeProfiles } from "@/components/admin/EmployeeProfiles";
import { ManagerDashboard } from "@/components/admin/ManagerDashboard";
import { MattersPanel } from "@/components/admin/MattersPanel";
import { RolePermissions } from "@/components/admin/RolePermissions";
import { WorkloadBoard } from "@/components/admin/WorkloadBoard";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ADMIN_NAV_ITEMS } from "@/lib/admin/mock-data";
import type { AdminSectionKey } from "@/lib/admin/types";
import { cn } from "@/lib/utils/cn";

const SECTION_ICONS: Record<AdminSectionKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  attorneys: Scale,
  employees: Users,
  matters: FolderOpen,
  assignments: Briefcase,
  approvals: CheckSquare,
  workload: Gauge,
  roles: Shield,
};

const SECTION_COPY: Record<
  AdminSectionKey,
  { title: string; description: string }
> = {
  dashboard: {
    title: "Manager Dashboard",
    description:
      "Staffing overview, pending approvals, workload pressure, and productivity signals for internal law firm management.",
  },
  attorneys: {
    title: "Attorney Management",
    description:
      "Maintain attorney profiles, practice focus, billable targets, and current matter load for staffing decisions.",
  },
  employees: {
    title: "Employee Profiles",
    description:
      "Internal employee directory for titles, departments, employment status, and role keys.",
  },
  matters: {
    title: "Matters",
    description:
      "Track matter status, engagement agreements, responsible counsel, and staffing coverage for Admin/Staff Operations.",
  },
  assignments: {
    title: "Assignments",
    description:
      "Review matter and case staffing assignments across the firm.",
  },
  approvals: {
    title: "Approval Queue",
    description:
      "Review pending time, expense, vacation, and workload approval requests.",
  },
  workload: {
    title: "Workload Board",
    description:
      "Monitor attorney capacity, open matters, and allocation pressure.",
  },
  roles: {
    title: "Role Permissions",
    description:
      "See which internal roles can manage employees, assignments, approvals, and workload.",
  },
};
interface AdminDashboardProps {
  initialSection?: AdminSectionKey;
}

export function AdminDashboard({
  initialSection = "dashboard",
}: AdminDashboardProps) {
  const [activeSection, setActiveSection] =
    useState<AdminSectionKey>(initialSection);

  const header = SECTION_COPY[activeSection];

  const sectionContent = useMemo(() => {
    switch (activeSection) {
      case "attorneys":
        return <AttorneyManagement />;
      case "employees":
        return <EmployeeProfiles />;
      case "matters":
        return <MattersPanel />;
      case "assignments":
        return <AssignmentsPanel />;
      case "approvals":
        return <ApprovalQueue />;
      case "workload":
        return <WorkloadBoard />;
      case "roles":
        return <RolePermissions />;
      case "dashboard":
      default:
        return <ManagerDashboard />;
    }
  }, [activeSection]);

  return (
    <div>
      <PageHeader title={header.title} description={header.description} />

      <AdminSectionNav
        activeKey={activeSection}
        onSelect={setActiveSection}
      />

      {activeSection === "dashboard" && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ADMIN_NAV_ITEMS.filter((item) => item.key !== "dashboard").map(
            (item) => {
              const Icon = SECTION_ICONS[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveSection(item.key)}
                  className={cn(
                    "rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all",
                    "hover:border-gold-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-900",
                  )}
                >
                  <Card padding="none" className="border-0 shadow-none">
                    <CardHeader className="mb-0">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-gold-500">
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle>{item.label}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </button>
              );
            },
          )}
        </div>
      )}

      {sectionContent}
    </div>
  );
}
