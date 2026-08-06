/**
 * Live Admin/Staff Information queries against shared CounselFlow tables.
 * Maps profiles, matters, matter_assignments, time_entries, expenses,
 * vacations, and job_applications into Admin view-models.
 */

import {
  buildDashboardSummary,
  buildProductivityMetrics,
  buildWorkloadItems,
} from "@/lib/admin/calculations";
import { DEMO_STAFF_ROLE_PERMISSIONS } from "@/lib/admin/demo-staff";
import { ADMIN_REFERENCE_DATE } from "@/lib/admin/mock-data";
import type {
  AdminApproval,
  AdminAssignment,
  AdminAttorneyProfile,
  AdminDashboardSummary,
  AdminEmployee,
  AdminJobApplication,
  AdminMatter,
  AdminProductivityMetric,
  AdminRolePermission,
  AdminUnassignedMatter,
  AdminVacation,
  AdminWorkloadItem,
  AssignmentStatus,
  EmploymentStatus,
  JobApplicationStatus,
  MatterLifecycleStatus,
} from "@/lib/admin/types";
import { createClientSafe, getSupabaseConfigError } from "@/lib/supabase/client";
import { USER_ROLE_LABELS, type UserRole } from "@/lib/types";

export type AdminOperationsDataset = {
  referenceDate: string;
  employees: AdminEmployee[];
  attorneys: AdminAttorneyProfile[];
  matters: AdminMatter[];
  assignments: AdminAssignment[];
  unassignedMatters: AdminUnassignedMatter[];
  approvals: AdminApproval[];
  vacations: AdminVacation[];
  jobApplications: AdminJobApplication[];
  rolePermissions: AdminRolePermission[];
  workload: AdminWorkloadItem[];
  productivity: AdminProductivityMetric[];
  summary: AdminDashboardSummary;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  practice_area_id: string | null;
  created_at: string | null;
};

type PracticeAreaRow = { id: string; name: string | null };
type ClientRow = { id: string; name: string | null };

type MatterRow = {
  id: string;
  title: string | null;
  status: string | null;
  client_id: string | null;
  practice_area_id: string | null;
  created_at: string | null;
};

type AssignmentRow = {
  id: string;
  matter_id: string;
  profile_id: string;
  role_on_matter: string | null;
  assigned_at: string | null;
};

type TimeEntryRow = {
  id: string;
  matter_id: string | null;
  profile_id: string | null;
  entry_date: string | null;
  hours: number | string | null;
  description: string | null;
  is_billable: boolean | null;
  status: string | null;
  billed: boolean | null;
  created_at: string | null;
};

type ExpenseRow = {
  id: string;
  matter_id: string | null;
  profile_id: string | null;
  expense_date: string | null;
  amount: number | string | null;
  description: string | null;
  status: string | null;
  created_at: string | null;
};

type VacationRow = {
  id: string;
  profile_id: string | null;
  employee_name: string | null;
  start_date: string;
  end_date: string;
  status: string | null;
  notes: string | null;
};

type JobAppRow = {
  id: string;
  applicant_name: string | null;
  role_applied: string | null;
  email: string | null;
  status: string | null;
  submitted_at: string | null;
  notes: string | null;
};

const ATTORNEY_ROLES = new Set([
  "attorney",
  "managing_partner",
  "admin",
  "manager",
]);

const WEEKLY_CAPACITY = 40;
const DEFAULT_ESTIMATED_HOURS = 8;

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Unknown", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function mapDbRoleToUi(role: string | null): {
  roleKey: string;
  roleLabel: string;
  title: string;
  department: string;
  isAttorney: boolean;
} {
  const raw = (role || "staffer").toLowerCase();
  const uiRoleMap: Record<string, UserRole> = {
    attorney: "attorney",
    paralegal: "paralegal",
    managing_partner: "managing_partner",
    admin: "firm_administrator",
    manager: "managing_partner",
    staffer: "billing_specialist",
    client: "client",
  };
  const uiRole = uiRoleMap[raw];
  if (uiRole && uiRole in USER_ROLE_LABELS) {
    const label = USER_ROLE_LABELS[uiRole];
    return {
      roleKey: uiRole,
      roleLabel: label,
      title: label,
      department:
        uiRole === "attorney" || uiRole === "managing_partner"
          ? "Legal Practice"
          : uiRole === "paralegal"
            ? "Legal Support"
            : "Administration",
      isAttorney: ATTORNEY_ROLES.has(raw) || uiRole === "attorney",
    };
  }
  return {
    roleKey: raw,
    roleLabel: raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    title: raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    department: "Staff",
    isAttorney: ATTORNEY_ROLES.has(raw),
  };
}

function toMatterStatus(status: string | null): MatterLifecycleStatus {
  if (status === "closed" || status === "archived") return status;
  return "open";
}

function toApprovalStatus(
  status: string | null,
): AdminApproval["status"] {
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  if (status === "returned") return "returned";
  return "pending";
}

function toJobStatus(status: string | null): JobApplicationStatus {
  if (status === "interview" || status === "hired" || status === "rejected") {
    return status;
  }
  return "pending";
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function businessDaysBetween(start: string, end: string): number {
  const a = new Date(`${start}T12:00:00Z`);
  const b = new Date(`${end}T12:00:00Z`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return 0;
  let count = 0;
  const cur = new Date(a);
  while (cur <= b) {
    const day = cur.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

function matterReference(id: string, index: number): string {
  return `CF-${String(index + 1).padStart(4, "0")}-${id.slice(0, 4).toUpperCase()}`;
}

function mapEmployee(
  profile: ProfileRow,
  practiceAreaName: string,
  hoursByProfile: Map<string, { assigned: number; actual: number }>,
  index: number,
): AdminEmployee {
  const fullName = profile.full_name?.trim() || "Unnamed Staff";
  const { firstName, lastName } = splitName(fullName);
  const roleMeta = mapDbRoleToUi(profile.role);
  const hours = hoursByProfile.get(profile.id) ?? { assigned: 0, actual: 0 };
  const hireDate = profile.created_at
    ? profile.created_at.slice(0, 10)
    : ADMIN_REFERENCE_DATE;

  return {
    id: profile.id,
    firstName,
    lastName,
    fullName,
    email: profile.email?.trim() || `${firstName.toLowerCase()}@firm.demo`,
    phone: "",
    employeeNumber: `E-${String(index + 1).padStart(4, "0")}`,
    title: roleMeta.title,
    department: roleMeta.department,
    roleKey: roleMeta.roleKey,
    roleLabel: roleMeta.roleLabel,
    practiceArea: practiceAreaName || "General",
    status: "active" as EmploymentStatus,
    hireDate,
    barNumber: roleMeta.isAttorney ? `BAR-${profile.id.slice(0, 6).toUpperCase()}` : "",
    internalHourlyCostRate: roleMeta.isAttorney ? 185 : 75,
    standardBillableRate: roleMeta.isAttorney ? 425 : 175,
    weeklyCapacityHours: WEEKLY_CAPACITY,
    targetBillableHours: roleMeta.isAttorney ? 35 : 30,
    managerId: null,
    availableWorkHours: WEEKLY_CAPACITY,
    assignedHours: hours.assigned,
    actualHoursWorked: hours.actual,
    isAttorney: roleMeta.isAttorney,
    profileId: profile.id,
  };
}

function mapMatter(
  row: MatterRow,
  clientName: string,
  practiceArea: string,
  index: number,
  responsible?: { name: string; employeeId: string },
): AdminMatter {
  const title = row.title?.trim() || "Untitled Matter";
  return {
    id: row.id,
    matterLabel: title,
    matterReference: matterReference(row.id, index),
    clientName: clientName || "Unknown Client",
    practiceArea: practiceArea || "General",
    status: toMatterStatus(row.status),
    openedDate: row.created_at?.slice(0, 10) || ADMIN_REFERENCE_DATE,
    engagementStatus: "signed",
    summary: `${clientName || "Client"} — ${title}`,
    staffingUrgency: "medium",
    responsibleAttorneyName: responsible?.name,
    responsibleEmployeeId: responsible?.employeeId,
  };
}

function mapAssignment(
  row: AssignmentRow,
  matter: AdminMatter | undefined,
  employee: AdminEmployee | undefined,
  actualHours: number,
): AdminAssignment {
  const assignedDate = row.assigned_at?.slice(0, 10) || ADMIN_REFERENCE_DATE;
  const dueDate = addDays(assignedDate, 14);
  const matterStatus = matter?.status ?? "open";
  let status: AssignmentStatus =
    matterStatus === "closed" || matterStatus === "archived"
      ? "completed"
      : "active";
  if (status === "active" && dueDate < ADMIN_REFERENCE_DATE) {
    status = "overdue";
  }

  return {
    id: row.id,
    matterId: row.matter_id,
    matterLabel: matter?.matterLabel || "Unknown Matter",
    matterReference: matter?.matterReference || "—",
    clientName: matter?.clientName || "Unknown Client",
    attorneyName: employee?.fullName || "Unassigned",
    employeeId: row.profile_id,
    roleOnMatter: row.role_on_matter?.replace(/_/g, " ") || "Assigned",
    practiceArea: matter?.practiceArea || employee?.practiceArea || "General",
    priority: "medium",
    status,
    assignedDate,
    startDate: assignedDate,
    dueDate,
    estimatedHours: DEFAULT_ESTIMATED_HOURS,
    actualHours,
    matterStatus,
    completedDate:
      status === "completed" ? matter?.openedDate : undefined,
    profileId: row.profile_id,
  };
}

function mapVacation(
  row: VacationRow,
  employee: AdminEmployee | undefined,
): AdminVacation {
  const status =
    row.status?.toLowerCase() === "approved" ? "approved" : "pending";
  return {
    id: row.id,
    employeeId: row.profile_id || employee?.id || "",
    employeeName:
      row.employee_name?.trim() || employee?.fullName || "Unknown Employee",
    practiceArea: employee?.practiceArea || "General",
    startDate: row.start_date,
    endDate: row.end_date,
    status,
    days: businessDaysBetween(row.start_date, row.end_date),
  };
}

function mapJobApplication(row: JobAppRow): AdminJobApplication {
  return {
    id: row.id,
    applicantName: row.applicant_name?.trim() || "Unknown Applicant",
    email: row.email?.trim() || "",
    phone: "",
    appliedRole: row.role_applied?.trim() || "Open Role",
    practiceArea: "General",
    submittedAt: row.submitted_at || new Date().toISOString(),
    status: toJobStatus(row.status),
    yearsExperience: 0,
    notes: row.notes?.trim() || "",
    resumeOnFile: false,
  };
}

function mapTimeApproval(
  row: TimeEntryRow,
  employee: AdminEmployee | undefined,
  matter: AdminMatter | undefined,
): AdminApproval {
  const hours = Number(row.hours) || 0;
  const name = employee?.fullName || "Unknown";
  const desc = row.description?.trim() || "Time entry";
  return {
    id: row.id,
    title: `Time — ${desc}`,
    type: "time_entry",
    submittedBy: name,
    employeeId: row.profile_id || "",
    summary: `${hours} hrs — ${desc}`,
    status: toApprovalStatus(row.status),
    priority: hours >= 8 ? "urgent" : "normal",
    submittedAt: row.created_at || `${row.entry_date || ADMIN_REFERENCE_DATE}T12:00:00Z`,
    amountOrHours: `${hours} hrs`,
    matterId: row.matter_id || undefined,
    matterLabel: matter?.matterLabel,
    matterReference: matter?.matterReference,
    matterStatus: matter?.status,
    assignedApproverId: "firm-admin",
    assignedApproverName: "Firm Administrator",
    originalSnapshot: JSON.stringify({
      hours,
      entry_date: row.entry_date,
      description: desc,
      is_billable: row.is_billable,
    }),
    timeEntryDate: row.entry_date || undefined,
    timeEntryHours: hours,
    timeEntryBillable: row.is_billable ?? true,
    timeEntryDescription: desc,
  };
}

function mapExpenseApproval(
  row: ExpenseRow,
  employee: AdminEmployee | undefined,
  matter: AdminMatter | undefined,
): AdminApproval {
  const amount = Number(row.amount) || 0;
  const name = employee?.fullName || "Unknown";
  const desc = row.description?.trim() || "Expense";
  return {
    id: row.id,
    title: `Expense — ${desc}`,
    type: "expense",
    submittedBy: name,
    employeeId: row.profile_id || "",
    summary: `$${amount.toFixed(2)} — ${desc}`,
    status: toApprovalStatus(row.status),
    priority: amount >= 250 ? "urgent" : "normal",
    submittedAt: row.created_at || `${row.expense_date || ADMIN_REFERENCE_DATE}T12:00:00Z`,
    amountOrHours: `$${amount.toFixed(2)}`,
    matterId: row.matter_id || undefined,
    matterLabel: matter?.matterLabel,
    matterReference: matter?.matterReference,
    matterStatus: matter?.status,
    assignedApproverId: "firm-admin",
    assignedApproverName: "Firm Administrator",
    originalSnapshot: JSON.stringify({
      amount,
      expense_date: row.expense_date,
      description: desc,
    }),
    expenseAmount: amount,
    expenseCategory: "General",
    expensePurpose: desc,
    receiptStatus: "not_required",
  };
}

function mapVacationApproval(
  vacation: AdminVacation,
): AdminApproval {
  return {
    id: `vac-appr-${vacation.id}`,
    title: `Leave — ${vacation.employeeName}`,
    type: "vacation",
    submittedBy: vacation.employeeName,
    employeeId: vacation.employeeId,
    summary: `${vacation.startDate} → ${vacation.endDate} (${vacation.days} days)`,
    status: vacation.status === "approved" ? "approved" : "pending",
    priority: "normal",
    submittedAt: `${vacation.startDate}T12:00:00Z`,
    assignedApproverId: "firm-admin",
    assignedApproverName: "Firm Administrator",
    originalSnapshot: JSON.stringify(vacation),
    vacationStartDate: vacation.startDate,
    vacationEndDate: vacation.endDate,
    vacationWorkdays: vacation.days,
  };
}

/**
 * Fetch the full Admin/Staff Information dataset from Supabase.
 * Throws with a readable message when config/query fails.
 */
export async function fetchAdminOperationsDataset(): Promise<AdminOperationsDataset> {
  const configError = getSupabaseConfigError();
  if (configError) throw new Error(configError);

  const supabase = createClientSafe();
  if (!supabase) throw new Error(configError || "Supabase client unavailable.");

  const [
    profilesRes,
    practiceAreasRes,
    clientsRes,
    mattersRes,
    assignmentsRes,
    timeRes,
    expensesRes,
    vacationsRes,
    jobsRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, practice_area_id, created_at")
      .order("full_name"),
    supabase.from("practice_areas").select("id, name"),
    supabase.from("clients").select("id, name"),
    supabase
      .from("matters")
      .select("id, title, status, client_id, practice_area_id, created_at")
      .order("created_at"),
    supabase
      .from("matter_assignments")
      .select("id, matter_id, profile_id, role_on_matter, assigned_at"),
    supabase
      .from("time_entries")
      .select(
        "id, matter_id, profile_id, entry_date, hours, description, is_billable, status, billed, created_at",
      )
      .order("entry_date", { ascending: false }),
    supabase
      .from("expense_submissions")
      .select(
        "id, matter_id, profile_id, expense_date, amount, description, status, created_at",
      )
      .order("expense_date", { ascending: false }),
    supabase
      .from("employee_vacations")
      .select(
        "id, profile_id, employee_name, start_date, end_date, status, notes",
      ),
    supabase
      .from("job_applications")
      .select(
        "id, applicant_name, role_applied, email, status, submitted_at, notes",
      )
      .order("submitted_at", { ascending: false }),
  ]);

  const firstError =
    profilesRes.error ||
    practiceAreasRes.error ||
    clientsRes.error ||
    mattersRes.error ||
    assignmentsRes.error ||
    timeRes.error ||
    expensesRes.error ||
    vacationsRes.error ||
    jobsRes.error;

  if (firstError) {
    throw new Error(firstError.message || "Failed to load Admin data.");
  }

  const profiles = (profilesRes.data ?? []) as ProfileRow[];
  const practiceAreas = (practiceAreasRes.data ?? []) as PracticeAreaRow[];
  const clients = (clientsRes.data ?? []) as ClientRow[];
  const matterRows = (mattersRes.data ?? []) as MatterRow[];
  const assignmentRows = (assignmentsRes.data ?? []) as AssignmentRow[];
  const timeRows = (timeRes.data ?? []) as TimeEntryRow[];
  const expenseRows = (expensesRes.data ?? []) as ExpenseRow[];
  const vacationRows = (vacationsRes.data ?? []) as VacationRow[];
  const jobRows = (jobsRes.data ?? []) as JobAppRow[];

  const practiceById = new Map(
    practiceAreas.map((p) => [p.id, p.name?.trim() || "General"]),
  );
  const clientById = new Map(
    clients.map((c) => [c.id, c.name?.trim() || "Unknown Client"]),
  );

  const actualHoursByProfile = new Map<string, number>();
  const actualHoursByAssignmentKey = new Map<string, number>();
  for (const te of timeRows) {
    if (!te.profile_id) continue;
    const hrs = Number(te.hours) || 0;
    if (te.status === "approved" || te.status === "pending") {
      actualHoursByProfile.set(
        te.profile_id,
        (actualHoursByProfile.get(te.profile_id) ?? 0) + hrs,
      );
    }
    if (te.matter_id) {
      const key = `${te.profile_id}:${te.matter_id}`;
      actualHoursByAssignmentKey.set(
        key,
        (actualHoursByAssignmentKey.get(key) ?? 0) + hrs,
      );
    }
  }

  const openMatterCountByProfile = new Map<string, number>();
  const assignedHoursByProfile = new Map<string, number>();
  for (const a of assignmentRows) {
    const matter = matterRows.find((m) => m.id === a.matter_id);
    if (!matter || toMatterStatus(matter.status) !== "open") continue;
    openMatterCountByProfile.set(
      a.profile_id,
      (openMatterCountByProfile.get(a.profile_id) ?? 0) + 1,
    );
    assignedHoursByProfile.set(
      a.profile_id,
      (assignedHoursByProfile.get(a.profile_id) ?? 0) + DEFAULT_ESTIMATED_HOURS,
    );
  }

  const hoursByProfile = new Map<string, { assigned: number; actual: number }>();
  for (const p of profiles) {
    hoursByProfile.set(p.id, {
      assigned: assignedHoursByProfile.get(p.id) ?? 0,
      actual: actualHoursByProfile.get(p.id) ?? 0,
    });
  }

  const staffProfiles = profiles.filter((p) => {
    const role = (p.role || "").toLowerCase();
    return role !== "client";
  });

  const employees = staffProfiles.map((p, index) =>
    mapEmployee(
      p,
      practiceById.get(p.practice_area_id || "") || "General",
      hoursByProfile,
      index,
    ),
  );
  const employeeById = new Map(employees.map((e) => [e.id, e]));

  const leadByMatter = new Map<string, { name: string; employeeId: string }>();
  for (const a of assignmentRows) {
    if (leadByMatter.has(a.matter_id)) continue;
    const emp = employeeById.get(a.profile_id);
    if (emp) {
      leadByMatter.set(a.matter_id, {
        name: emp.fullName,
        employeeId: emp.id,
      });
    }
  }

  const matters = matterRows.map((m, index) =>
    mapMatter(
      m,
      clientById.get(m.client_id || "") || "Unknown Client",
      practiceById.get(m.practice_area_id || "") || "General",
      index,
      leadByMatter.get(m.id),
    ),
  );
  const matterById = new Map(matters.map((m) => [m.id, m]));

  const assignments = assignmentRows.map((a) =>
    mapAssignment(
      a,
      matterById.get(a.matter_id),
      employeeById.get(a.profile_id),
      actualHoursByAssignmentKey.get(`${a.profile_id}:${a.matter_id}`) ?? 0,
    ),
  );

  const assignedMatterIds = new Set(
    assignments
      .filter(
        (a) =>
          a.status === "active" ||
          a.status === "pending" ||
          a.status === "overdue",
      )
      .map((a) => a.matterId),
  );

  const unassignedMatters: AdminUnassignedMatter[] = matters
    .filter((m) => m.status === "open" && !assignedMatterIds.has(m.id))
    .map((m) => ({
      id: m.id,
      matterLabel: m.matterLabel,
      matterReference: m.matterReference,
      practiceArea: m.practiceArea,
      openedDate: m.openedDate,
      urgency: m.staffingUrgency,
    }));

  const vacations = vacationRows.map((v) =>
    mapVacation(v, v.profile_id ? employeeById.get(v.profile_id) : undefined),
  );

  // Reflect approved leave onto employee status when overlapping reference date
  const ref = ADMIN_REFERENCE_DATE;
  for (const v of vacations) {
    if (v.status !== "approved") continue;
    if (v.startDate <= ref && v.endDate >= ref) {
      const emp = employeeById.get(v.employeeId);
      if (emp) emp.status = "on_leave";
    }
  }

  const approvals: AdminApproval[] = [
    ...timeRows.map((t) =>
      mapTimeApproval(
        t,
        t.profile_id ? employeeById.get(t.profile_id) : undefined,
        t.matter_id ? matterById.get(t.matter_id) : undefined,
      ),
    ),
    ...expenseRows.map((e) =>
      mapExpenseApproval(
        e,
        e.profile_id ? employeeById.get(e.profile_id) : undefined,
        e.matter_id ? matterById.get(e.matter_id) : undefined,
      ),
    ),
    ...vacations.map(mapVacationApproval),
  ].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  const jobApplications = jobRows.map(mapJobApplication);

  // Role matrix from shared CounselFlow role-config (DB role_permissions is sparse/empty).
  const rolePermissions: AdminRolePermission[] =
    DEMO_STAFF_ROLE_PERMISSIONS.map((r) => ({ ...r }));

  const pendingApprovalsByEmployee: Record<string, number> = {};
  for (const a of approvals) {
    if (a.status !== "pending" || !a.employeeId) continue;
    pendingApprovalsByEmployee[a.employeeId] =
      (pendingApprovalsByEmployee[a.employeeId] ?? 0) + 1;
  }

  const openMattersByEmployee: Record<string, number> = {};
  for (const [id, count] of openMatterCountByProfile) {
    openMattersByEmployee[id] = count;
  }

  const attorneys: AdminAttorneyProfile[] = employees
    .filter((e) => e.isAttorney)
    .map((e) => ({
      id: `atty-${e.id}`,
      employeeId: e.id,
      fullName: e.fullName,
      email: e.email,
      practiceFocus: e.practiceArea,
      barNumber: e.barNumber,
      billableTargetHours: e.targetBillableHours,
      currentOpenMatters: openMattersByEmployee[e.id] ?? 0,
      status: e.status,
    }));

  const workload = buildWorkloadItems(
    employees,
    openMattersByEmployee,
    pendingApprovalsByEmployee,
  );
  const productivity = buildProductivityMetrics(employees);
  const summary = buildDashboardSummary({
    employees,
    approvals,
    assignments,
    unassignedMatters,
    referenceDate: ADMIN_REFERENCE_DATE,
  });

  return {
    referenceDate: ADMIN_REFERENCE_DATE,
    employees,
    attorneys,
    matters,
    assignments,
    unassignedMatters,
    approvals,
    vacations,
    jobApplications,
    rolePermissions,
    workload,
    productivity,
    summary,
  };
}
