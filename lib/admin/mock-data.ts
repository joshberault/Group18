/**
 * TEMPORARY MOCK DATA — Staff/Admin Operations
 *
 * This file holds demo data for UI development only.
 * It will later be replaced by Supabase queries against existing firm tables
 * (e.g. profiles, matter_assignments) plus any admin-specific tables
 * approved by the team (approvals, etc.).
 *
 * Do not treat these IDs as production database keys.
 */

import {
  buildDashboardSummary,
  buildProductivityMetrics,
  buildWorkloadItems,
} from "@/lib/admin/calculations";
import { MOCK_JOB_APPLICATIONS } from "@/lib/admin/job-applications-data";
import type {
  AdminApproval,
  AdminAssignment,
  AdminAttorneyProfile,
  AdminEmployee,
  AdminMatter,
  AdminNavItem,
  AdminRolePermission,
  AdminUnassignedMatter,
  AdminVacation,
} from "@/lib/admin/types";

export { MOCK_JOB_APPLICATIONS } from "@/lib/admin/job-applications-data";

/** Fixed “today” so due-soon / overdue demos stay stable. */
export const ADMIN_REFERENCE_DATE = "2026-08-04";

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    key: "dashboard",
    label: "Manager Dashboard",
    href: "/admin",
    description: "Firm staffing overview and productivity signals",
  },
  {
    key: "attorneys",
    label: "Attorney Management",
    href: "/admin/attorneys",
    description: "Attorney profiles and practice focus",
  },
  {
    key: "employees",
    label: "Employee Profiles",
    href: "/admin/employees",
    description: "Internal employee directory",
  },
  {
    key: "assignments",
    label: "Assignments",
    href: "/admin/assignments",
    description: "Matter and case staffing assignments",
  },
  {
    key: "approvals",
    label: "Approval Queue",
    href: "/admin/approvals",
    description: "Pending internal approvals",
  },
  {
    key: "workload",
    label: "Workload Board",
    href: "/admin/workload",
    description: "Capacity and internal workload",
  },
  {
    key: "roles",
    label: "Role Permissions",
    href: "/admin/roles",
    description: "Admin role capability matrix",
  },
];

/**
 * 12+ employees across roles and practice areas.
 * Includes: overloaded (>100%), near capacity (90–100%), approved leave,
 * inactive, and several available attorneys.
 *
 * assignedHours = planned load; actualHoursWorked = hours worked.
 * availableWorkHours = capacity denominator for utilization.
 */
export const MOCK_EMPLOYEES: AdminEmployee[] = [];

export const MOCK_ATTORNEYS: AdminAttorneyProfile[] = [];

export const MOCK_ROLE_PERMISSIONS: AdminRolePermission[] = [];

export const MOCK_MATTERS: AdminMatter[] = [];

export const MOCK_ASSIGNMENTS: AdminAssignment[] = [];

export const MOCK_UNASSIGNED_MATTERS: AdminUnassignedMatter[] = [];

export const MOCK_APPROVALS: AdminApproval[] = [];

export const MOCK_VACATIONS: AdminVacation[] = [];

export const MOCK_WORKLOAD = buildWorkloadItems(MOCK_EMPLOYEES, {}, {});

export const MOCK_PRODUCTIVITY = buildProductivityMetrics(MOCK_EMPLOYEES, {});

export const MOCK_DASHBOARD_SUMMARY = buildDashboardSummary({
  employees: MOCK_EMPLOYEES,
  approvals: MOCK_APPROVALS,
  assignments: MOCK_ASSIGNMENTS,
  unassignedMatters: MOCK_UNASSIGNED_MATTERS,
  referenceDate: ADMIN_REFERENCE_DATE,
});
/** Toggle helpers for empty/error UI patterns during development */
export const ADMIN_UI_FLAGS = {
  forceEmpty: false,
  forceError: false,
  forceLoading: false,
} as const;

/** Snapshot helper used by Refresh on the Manager Dashboard */
export function getAdminDashboardDataset() {
  return {
    referenceDate: ADMIN_REFERENCE_DATE,
    employees: MOCK_EMPLOYEES,
    attorneys: MOCK_ATTORNEYS,
    assignments: MOCK_ASSIGNMENTS,
    unassignedMatters: MOCK_UNASSIGNED_MATTERS,
    approvals: MOCK_APPROVALS,
    vacations: MOCK_VACATIONS,
    jobApplications: MOCK_JOB_APPLICATIONS,
    workload: buildWorkloadItems(MOCK_EMPLOYEES, {}, {}),
    productivity: buildProductivityMetrics(MOCK_EMPLOYEES, {}),
    summary: buildDashboardSummary({
      employees: MOCK_EMPLOYEES,
      approvals: MOCK_APPROVALS,
      assignments: MOCK_ASSIGNMENTS,
      unassignedMatters: MOCK_UNASSIGNED_MATTERS,
      referenceDate: ADMIN_REFERENCE_DATE,
    }),
  };
}
