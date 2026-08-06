import { AssignmentsPanel } from "@/components/admin/AssignmentsPanel";
import { AttorneyManagement } from "@/components/admin/AttorneyManagement";
import { EmployeeProfiles } from "@/components/admin/EmployeeProfiles";
import { ManagerDashboard } from "@/components/admin/ManagerDashboard";
import { MattersPanel } from "@/components/admin/MattersPanel";
import { RolePermissions } from "@/components/admin/RolePermissions";
import { WorkloadBoard } from "@/components/admin/WorkloadBoard";
import { PageHeader } from "@/components/ui/PageHeader";
import type { AdminSectionKey } from "@/lib/admin/types";

const SECTION_COPY: Partial<
  Record<AdminSectionKey, { title: string; description: string }>
> = {
  dashboard: {
    title: "Manager Dashboard",
    description:
      "Staffing overview, workload pressure, and productivity signals for internal law firm management.",
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
  workload: {
    title: "Workload Board",
    description:
      "Monitor attorney capacity, open matters, and allocation pressure.",
  },
  roles: {
    title: "Role Permissions",
    description:
      "See which internal roles can manage employees, assignments, and workload.",
  },
};

interface AdminDashboardProps {
  initialSection?: AdminSectionKey;
}

function renderSection(section: AdminSectionKey) {
  switch (section) {
    case "attorneys":
      return <AttorneyManagement />;
    case "employees":
      return <EmployeeProfiles />;
    case "matters":
      return <MattersPanel />;
    case "assignments":
      return <AssignmentsPanel />;
    case "workload":
      return <WorkloadBoard />;
    case "roles":
      return <RolePermissions />;
    case "approvals":
    case "dashboard":
    default:
      return <ManagerDashboard />;
  }
}

/** Section pages under Manager Dashboard — open from the sidebar. */
export function AdminDashboard({
  initialSection = "dashboard",
}: AdminDashboardProps) {
  const header =
    SECTION_COPY[initialSection] ?? SECTION_COPY.dashboard ?? {
      title: "Manager Dashboard",
      description: "Staffing overview for internal law firm management.",
    };

  return (
    <div>
      <PageHeader title={header.title} description={header.description} />
      {renderSection(initialSection)}
    </div>
  );
}
