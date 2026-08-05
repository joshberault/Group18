import type {
  AdminApproval,
  AdminAssignment,
  AdminDashboardFilters,
  AdminDashboardSummary,
  AdminEmployee,
  AdminProductivityMetric,
  AdminUnassignedMatter,
  AdminVacation,
  AdminWorkloadBoardRow,
  AdminWorkloadItem,
  EmployeeProfileProductivity,
  VacationStatusLabel,
  WorkloadBoardClassification,
  WorkloadBoardSortKey,
  WorkloadCapacityStatus,
  WorkloadLeaveDisplay,
  WorkloadPracticeAreaShare,
} from "@/lib/admin/types";

/**
 * Productivity and Manager Dashboard helpers for Staff/Admin Operations.
 * Pure functions over admin view-models / mock data.
 * Replace inputs with Supabase-backed data later — keep these calculators.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Utilization = billable (actual) hours / available work hours. Guards divide-by-zero. */
export function calculateUtilizationRate(
  billableHours: number,
  availableWorkHours: number,
): number {
  if (availableWorkHours <= 0) return 0;
  return Math.round((billableHours / availableWorkHours) * 1000) / 10;
}

/** Current workload % = assigned hours ÷ weekly capacity. Guards divide-by-zero. */
export function calculateWorkloadPercentage(
  assignedHours: number,
  weeklyCapacityHours: number,
): number {
  if (weeklyCapacityHours <= 0) return 0;
  return Math.round((assignedHours / weeklyCapacityHours) * 1000) / 10;
}

export function getVacationStatusLabel(
  employee: Pick<AdminEmployee, "id" | "status">,
  vacations: AdminVacation[],
  referenceDate: string,
): VacationStatusLabel {
  if (employee.status === "on_leave") return "On approved leave";

  const ref = new Date(referenceDate).getTime();
  const mine = vacations.filter((v) => v.employeeId === employee.id);
  if (mine.some((v) => v.status === "pending")) return "Leave pending approval";

  const upcomingOrCurrent = mine.some(
    (v) =>
      v.status === "approved" &&
      new Date(v.endDate).getTime() >= ref &&
      new Date(v.startDate).getTime() <= ref + 60 * MS_PER_DAY,
  );
  if (upcomingOrCurrent) {
    const onLeaveNow = mine.some(
      (v) =>
        v.status === "approved" &&
        new Date(v.startDate).getTime() <= ref &&
        new Date(v.endDate).getTime() >= ref,
    );
    return onLeaveNow ? "On approved leave" : "Leave upcoming";
  }

  return "None scheduled";
}

export function countActiveAssignmentsForEmployee(
  employeeId: string,
  assignments: AdminAssignment[],
): number {
  return assignments.filter(
    (a) =>
      a.employeeId === employeeId &&
      (a.status === "active" || a.status === "pending" || a.status === "overdue"),
  ).length;
}

export function sumEstimatedHoursForEmployee(
  employeeId: string,
  assignments: AdminAssignment[],
  excludeAssignmentId?: string,
): number {
  return assignments
    .filter(
      (a) =>
        a.employeeId === employeeId &&
        a.id !== excludeAssignmentId &&
        (a.status === "active" || a.status === "pending" || a.status === "overdue"),
    )
    .reduce((sum, a) => sum + (a.estimatedHours || 0), 0);
}

/** Projected workload % after applying estimated hours to current assigned load. */
export function projectWorkloadPercentage(
  currentAssignedHours: number,
  additionalEstimatedHours: number,
  weeklyCapacityHours: number,
): number {
  return calculateWorkloadPercentage(
    currentAssignedHours + additionalEstimatedHours,
    weeklyCapacityHours,
  );
}

export function datesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  const a0 = new Date(startA).getTime();
  const a1 = new Date(endA).getTime();
  const b0 = new Date(startB).getTime();
  const b1 = new Date(endB).getTime();
  if ([a0, a1, b0, b1].some((n) => Number.isNaN(n))) return false;
  return a0 <= b1 && b0 <= a1;
}

export function findVacationOverlap(
  employeeId: string,
  startDate: string,
  dueDate: string,
  vacations: AdminVacation[],
): AdminVacation | undefined {
  return vacations.find(
    (v) =>
      v.employeeId === employeeId &&
      v.status === "approved" &&
      datesOverlap(startDate, dueDate, v.startDate, v.endDate),
  );
}

export type AssignmentConflictLevel = "none" | "warning" | "critical";

export interface AssignmentConflictSummary {
  workloadPercent: number;
  workloadLevel: AssignmentConflictLevel;
  workloadMessage: string | null;
  onLeave: boolean;
  vacationOverlap: AdminVacation | undefined;
  vacationMessage: string | null;
  hasBlockingConflict: boolean;
}

/** Shared workload + vacation conflict evaluation for assignment UI. */
export function evaluateAssignmentConflicts(input: {
  employee: Pick<
    AdminEmployee,
    "status" | "assignedHours" | "weeklyCapacityHours" | "id"
  >;
  estimatedHours: number;
  priorEstimatedHours?: number;
  startDate: string;
  dueDate: string;
  vacations: AdminVacation[];
}): AssignmentConflictSummary {
  const prior = input.priorEstimatedHours ?? 0;
  const projectedAssigned = Math.max(
    0,
    input.employee.assignedHours - prior + input.estimatedHours,
  );
  const workloadPercent = calculateWorkloadPercentage(
    projectedAssigned,
    input.employee.weeklyCapacityHours,
  );

  let workloadLevel: AssignmentConflictLevel = "none";
  let workloadMessage: string | null = null;
  if (workloadPercent > 100) {
    workloadLevel = "critical";
    workloadMessage = `Projected workload is ${workloadPercent}% (above 100% capacity).`;
  } else if (workloadPercent >= 90) {
    workloadLevel = "warning";
    workloadMessage = `Projected workload is ${workloadPercent}% (near capacity, 90–100%).`;
  }

  const onLeave = input.employee.status === "on_leave";
  const vacationOverlap = findVacationOverlap(
    input.employee.id,
    input.startDate,
    input.dueDate,
    input.vacations,
  );

  let vacationMessage: string | null = null;
  if (onLeave) {
    vacationMessage =
      "Employee is currently on approved leave and should not take new assignments without coverage planning.";
  } else if (vacationOverlap) {
    vacationMessage = `Assignment dates overlap approved vacation (${vacationOverlap.startDate} → ${vacationOverlap.endDate}).`;
  }

  return {
    workloadPercent,
    workloadLevel,
    workloadMessage,
    onLeave,
    vacationOverlap,
    vacationMessage,
    hasBlockingConflict:
      workloadLevel === "critical" || onLeave || !!vacationOverlap,
  };
}

export function findDuplicateActiveAssignment(
  assignments: AdminAssignment[],
  input: {
    employeeId: string;
    matterId: string;
    roleOnMatter: string;
    excludeAssignmentId?: string;
  },
): AdminAssignment | undefined {
  return assignments.find(
    (a) =>
      a.id !== input.excludeAssignmentId &&
      a.employeeId === input.employeeId &&
      a.matterId === input.matterId &&
      a.roleOnMatter.trim().toLowerCase() ===
        input.roleOnMatter.trim().toLowerCase() &&
      (a.status === "active" || a.status === "pending" || a.status === "overdue"),
  );
}

export function isAttorneyOrPartnerTitle(title: string): boolean {
  const normalized = title.trim().toLowerCase();
  return (
    normalized === "attorney" ||
    normalized === "partner" ||
    normalized.includes("attorney") ||
    normalized.includes("partner") ||
    normalized.includes("of counsel")
  );
}

/**
 * Business rules:
 * - on_leave / inactive from employment status
 * - overloaded: workload (assigned/available) > 100%
 * - near_capacity: 90%–100%
 * - available: below 90% and not on approved leave
 */
export function deriveCapacityStatus(
  employee: Pick<
    AdminEmployee,
    "status" | "assignedHours" | "availableWorkHours"
  >,
): WorkloadCapacityStatus {
  if (employee.status === "inactive") return "inactive";
  if (employee.status === "on_leave") return "on_leave";

  const loadRate = calculateUtilizationRate(
    employee.assignedHours,
    employee.availableWorkHours,
  );

  if (loadRate > 100) return "overloaded";
  if (loadRate >= 90) return "near_capacity";
  return "available";
}

export function isAvailableAttorney(employee: AdminEmployee): boolean {
  if (!employee.isAttorney) return false;
  return deriveCapacityStatus(employee) === "available";
}

export function calculateAverageUtilization(
  metrics: AdminProductivityMetric[],
): number {
  if (metrics.length === 0) return 0;
  const total = metrics.reduce((sum, m) => sum + m.utilizationRate, 0);
  return Math.round((total / metrics.length) * 10) / 10;
}

export function buildProductivityMetrics(
  employees: AdminEmployee[],
  mattersClosedByEmployee: Record<string, number> = {},
): AdminProductivityMetric[] {
  return employees
    .filter((e) => e.isAttorney && e.status !== "inactive")
    .map((employee) => {
      const capacityStatus = deriveCapacityStatus(employee);
      const utilizationRate = calculateUtilizationRate(
        employee.actualHoursWorked,
        employee.availableWorkHours,
      );
      return {
        id: `prod-${employee.id}`,
        employeeId: employee.id,
        attorneyName: employee.fullName,
        practiceArea: employee.practiceArea,
        billableHours: employee.actualHoursWorked,
        actualHoursWorked: employee.actualHoursWorked,
        assignedHours: employee.assignedHours,
        availableWorkHours: employee.availableWorkHours,
        targetHours: employee.availableWorkHours,
        utilizationRate,
        mattersClosed: mattersClosedByEmployee[employee.id] ?? 0,
        capacityStatus,
      };
    });
}

export function buildWorkloadItems(
  employees: AdminEmployee[],
  openMattersByEmployee: Record<string, number> = {},
  pendingApprovalsByEmployee: Record<string, number> = {},
): AdminWorkloadItem[] {
  return employees
    .filter((e) => e.isAttorney && e.status !== "inactive")
    .map((employee) => {
      const capacityStatus = deriveCapacityStatus(employee);
      const utilizationRate = calculateUtilizationRate(
        employee.assignedHours,
        employee.availableWorkHours,
      );
      const level =
        capacityStatus === "overloaded"
          ? ("overallocated" as const)
          : capacityStatus === "near_capacity"
            ? ("heavy" as const)
            : utilizationRate < 50
              ? ("light" as const)
              : ("balanced" as const);

      return {
        id: `wl-${employee.id}`,
        employeeId: employee.id,
        attorneyName: employee.fullName,
        practiceArea: employee.practiceArea,
        openMatters: openMattersByEmployee[employee.id] ?? 0,
        weeklyBillableHours: employee.actualHoursWorked,
        assignedHours: employee.assignedHours,
        actualHoursWorked: employee.actualHoursWorked,
        availableWorkHours: employee.availableWorkHours,
        pendingApprovals: pendingApprovalsByEmployee[employee.id] ?? 0,
        level,
        capacityStatus,
        utilizationRate,
      };
    });
}

/** Urgent approvals first; within the same priority, oldest submittedAt first. */
export function sortApprovalsForQueue(approvals: AdminApproval[]): AdminApproval[] {
  return [...approvals].sort((a, b) => {
    const priorityRank = (p: AdminApproval["priority"]) =>
      p === "urgent" ? 0 : 1;
    const byPriority = priorityRank(a.priority) - priorityRank(b.priority);
    if (byPriority !== 0) return byPriority;
    return (
      new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
    );
  });
}

export function getPendingApprovalsSorted(
  approvals: AdminApproval[],
): AdminApproval[] {
  return sortApprovalsForQueue(
    approvals.filter((item) => item.status === "pending"),
  );
}

export function getUrgentPendingApprovals(
  approvals: AdminApproval[],
): AdminApproval[] {
  return getPendingApprovalsSorted(approvals).filter(
    (item) => item.priority === "urgent",
  );
}

export function isDueWithinDays(
  dueDate: string,
  referenceDate: string,
  days: number,
): boolean {
  const due = new Date(dueDate).getTime();
  const ref = new Date(referenceDate).getTime();
  if (Number.isNaN(due) || Number.isNaN(ref)) return false;
  const diffDays = (due - ref) / MS_PER_DAY;
  return diffDays >= 0 && diffDays <= days;
}

export function isOverdue(dueDate: string, referenceDate: string): boolean {
  const due = new Date(dueDate).getTime();
  const ref = new Date(referenceDate).getTime();
  if (Number.isNaN(due) || Number.isNaN(ref)) return false;
  return due < ref;
}

export function getAssignmentsDueSoon(
  assignments: AdminAssignment[],
  referenceDate: string,
  days = 7,
): AdminAssignment[] {
  return assignments.filter(
    (a) =>
      (a.status === "active" || a.status === "pending" || a.status === "overdue") &&
      isDueWithinDays(a.dueDate, referenceDate, days),
  );
}

export function getOverdueAssignments(
  assignments: AdminAssignment[],
  referenceDate: string,
): AdminAssignment[] {
  return assignments.filter(
    (a) =>
      a.status !== "completed" && isOverdue(a.dueDate, referenceDate),
  );
}

export function getUpcomingVacations(
  vacations: AdminVacation[],
  referenceDate: string,
): AdminVacation[] {
  const ref = new Date(referenceDate).getTime();
  return vacations
    .filter((v) => v.status === "approved" && new Date(v.endDate).getTime() >= ref)
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );
}

export function getWorkloadAlerts(
  workload: AdminWorkloadItem[],
): AdminWorkloadItem[] {
  return workload.filter(
    (item) =>
      item.capacityStatus === "overloaded" ||
      item.capacityStatus === "near_capacity",
  );
}

export function getAvailableAttorneys(
  employees: AdminEmployee[],
): AdminEmployee[] {
  return employees.filter(isAvailableAttorney);
}

export function filterEmployeesForDashboard(
  employees: AdminEmployee[],
  filters: AdminDashboardFilters,
): AdminEmployee[] {
  return employees.filter((employee) => {
    if (
      filters.practiceArea !== "all" &&
      employee.practiceArea !== filters.practiceArea
    ) {
      return false;
    }
    if (filters.workloadStatus !== "all") {
      if (deriveCapacityStatus(employee) !== filters.workloadStatus) {
        return false;
      }
    }
    return true;
  });
}

export function buildDashboardSummary(input: {
  employees: AdminEmployee[];
  approvals: AdminApproval[];
  assignments: AdminAssignment[];
  unassignedMatters: AdminUnassignedMatter[];
  referenceDate: string;
}): AdminDashboardSummary {
  const { employees, approvals, assignments, unassignedMatters, referenceDate } =
    input;

  const attorneys = employees.filter((e) => e.isAttorney);
  const attorneyMetrics = buildProductivityMetrics(attorneys);

  return {
    activeEmployees: employees.filter((e) => e.status === "active").length,
    availableAttorneys: getAvailableAttorneys(employees).length,
    employeesOnApprovedLeave: employees.filter((e) => e.status === "on_leave")
      .length,
    pendingApprovals: approvals.filter((a) => a.status === "pending").length,
    overloadedEmployees: employees.filter(
      (e) => deriveCapacityStatus(e) === "overloaded",
    ).length,
    assignmentsDueWithin7Days: getAssignmentsDueSoon(
      assignments,
      referenceDate,
      7,
    ).length,
    unassignedMatters: unassignedMatters.length,
    averageAttorneyUtilization: calculateAverageUtilization(attorneyMetrics),
  };
}

export function uniquePracticeAreas(employees: AdminEmployee[]): string[] {
  return [...new Set(employees.map((e) => e.practiceArea))].sort();
}

/** Count business days between submitted instant and reference date (Mon–Fri). */
export function countBusinessDaysAge(
  submittedAt: string,
  referenceDate: string,
): number {
  const start = new Date(submittedAt);
  const end = new Date(`${referenceDate}T23:59:59Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  if (end < start) return 0;

  let count = 0;
  const cursor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
  const endDay = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
  );

  while (cursor < endDay) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

export function isApprovalAgingOverdue(businessDayAge: number): boolean {
  return businessDayAge > 3;
}

export function getConflictingAssignmentsForVacation(
  employeeId: string,
  startDate: string,
  endDate: string,
  assignments: AdminAssignment[],
): AdminAssignment[] {
  return assignments.filter(
    (a) =>
      a.employeeId === employeeId &&
      (a.status === "active" || a.status === "pending" || a.status === "overdue") &&
      datesOverlap(startDate, endDate, a.startDate, a.dueDate),
  );
}

export function hasOverlappingApprovedVacation(
  employeeId: string,
  startDate: string,
  endDate: string,
  vacations: AdminVacation[],
  excludeVacationId?: string,
): boolean {
  return vacations.some(
    (v) =>
      v.employeeId === employeeId &&
      v.status === "approved" &&
      v.id !== excludeVacationId &&
      datesOverlap(startDate, endDate, v.startDate, v.endDate),
  );
}

/** Target Attainment = Billable Hours / Target Billable Hours */
export function calculateTargetAttainment(
  billableHours: number,
  targetBillableHours: number,
): number {
  if (targetBillableHours <= 0) return 0;
  return Math.round((billableHours / targetBillableHours) * 1000) / 10;
}

/**
 * Completion Rate = Completed Assignments / Assignments Due
 * Assignments Due = assignments with a due date on or before the reference date,
 * plus any already completed assignments.
 */
export function calculateAssignmentCompletionRate(
  assignments: AdminAssignment[],
  referenceDate: string,
): number {
  const due = assignments.filter(
    (a) =>
      a.status === "completed" ||
      isOverdue(a.dueDate, referenceDate) ||
      a.dueDate <= referenceDate,
  );
  if (due.length === 0) return 0;
  const completed = due.filter((a) => a.status === "completed").length;
  return Math.round((completed / due.length) * 1000) / 10;
}

/** On-Time Completion Rate = completed on/before due date / completed assignments */
export function calculateOnTimeCompletionRate(
  assignments: AdminAssignment[],
): number {
  const completed = assignments.filter((a) => a.status === "completed");
  if (completed.length === 0) return 0;
  const onTime = completed.filter((a) => {
    if (!a.completedDate) return false;
    return new Date(a.completedDate).getTime() <= new Date(a.dueDate).getTime();
  }).length;
  return Math.round((onTime / completed.length) * 1000) / 10;
}

export function countPendingApprovalsForEmployee(
  employeeId: string,
  approvals: AdminApproval[],
): number {
  return approvals.filter(
    (a) => a.employeeId === employeeId && a.status === "pending",
  ).length;
}

export function getEmployeeById(
  employees: AdminEmployee[],
  employeeId: string,
): AdminEmployee | undefined {
  return employees.find((e) => e.id === employeeId);
}

export function buildEmployeeProfileProductivity(
  employee: AdminEmployee,
  assignments: AdminAssignment[],
  referenceDate: string,
): EmployeeProfileProductivity {
  const mine = assignments.filter((a) => a.employeeId === employee.id);
  const due = mine.filter(
    (a) =>
      a.status === "completed" ||
      isOverdue(a.dueDate, referenceDate) ||
      a.dueDate <= referenceDate,
  );
  const completed = mine.filter((a) => a.status === "completed");
  const completedOnTime = completed.filter(
    (a) =>
      !!a.completedDate &&
      new Date(a.completedDate).getTime() <= new Date(a.dueDate).getTime(),
  ).length;

  return {
    utilizationRate: calculateUtilizationRate(
      employee.actualHoursWorked,
      employee.availableWorkHours,
    ),
    targetAttainment: calculateTargetAttainment(
      employee.actualHoursWorked,
      employee.targetBillableHours,
    ),
    assignmentCompletionRate: calculateAssignmentCompletionRate(
      mine,
      referenceDate,
    ),
    onTimeCompletionRate: calculateOnTimeCompletionRate(mine),
    billableHours: employee.actualHoursWorked,
    availableWorkHours: employee.availableWorkHours,
    targetBillableHours: employee.targetBillableHours,
    completedAssignments: completed.length,
    assignmentsDue: due.length,
    completedOnTime,
  };
}

function isOpenAssignment(assignment: AdminAssignment): boolean {
  return (
    assignment.status === "active" ||
    assignment.status === "pending" ||
    assignment.status === "overdue"
  );
}

export function getOpenAssignmentsForEmployee(
  employeeId: string,
  assignments: AdminAssignment[],
): AdminAssignment[] {
  return assignments.filter(
    (a) => a.employeeId === employeeId && isOpenAssignment(a),
  );
}

/** Board leave label: Current Leave vs Upcoming Leave (not “current” for future only). */
export function getWorkloadLeaveDisplay(
  employee: Pick<AdminEmployee, "id" | "status">,
  vacations: AdminVacation[],
  referenceDate: string,
): {
  leaveStatus: WorkloadLeaveDisplay;
  currentLeave: AdminVacation | null;
  upcomingLeave: AdminVacation[];
} {
  const ref = new Date(`${referenceDate}T12:00:00Z`).getTime();
  const mine = vacations.filter((v) => v.employeeId === employee.id);

  const currentLeave =
    mine.find(
      (v) =>
        v.status === "approved" &&
        new Date(`${v.startDate}T00:00:00Z`).getTime() <= ref &&
        new Date(`${v.endDate}T23:59:59Z`).getTime() >= ref,
    ) ?? null;

  const upcomingLeave = mine
    .filter(
      (v) =>
        v.status === "approved" &&
        new Date(`${v.startDate}T00:00:00Z`).getTime() > ref,
    )
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );

  if (employee.status === "on_leave" || currentLeave) {
    return {
      leaveStatus: "Current Leave",
      currentLeave:
        currentLeave ??
        mine.find((v) => v.status === "approved") ??
        null,
      upcomingLeave,
    };
  }

  if (mine.some((v) => v.status === "pending")) {
    return { leaveStatus: "Leave pending approval", currentLeave: null, upcomingLeave };
  }

  if (upcomingLeave.length > 0) {
    return {
      leaveStatus: "Upcoming Leave",
      currentLeave: null,
      upcomingLeave,
    };
  }

  return { leaveStatus: "None", currentLeave: null, upcomingLeave: [] };
}

/**
 * Workload Board classification:
 * Unavailable (inactive / current leave); else by open estimated ÷ weekly capacity.
 */
export function classifyWorkloadBoard(
  employmentStatus: AdminEmployee["status"],
  leaveStatus: WorkloadLeaveDisplay,
  workloadPercentage: number | null,
): WorkloadBoardClassification {
  if (employmentStatus === "inactive" || leaveStatus === "Current Leave") {
    return "unavailable";
  }
  if (workloadPercentage == null) return "unavailable";
  if (workloadPercentage > 100) return "over_capacity";
  if (workloadPercentage >= 90) return "near_capacity";
  if (workloadPercentage >= 60) return "balanced";
  return "available";
}

function buildPracticeAreaDistribution(
  openAssignments: AdminAssignment[],
): WorkloadPracticeAreaShare[] {
  const map = new Map<string, WorkloadPracticeAreaShare>();
  for (const a of openAssignments) {
    const existing = map.get(a.practiceArea);
    if (existing) {
      existing.estimatedHours += a.estimatedHours || 0;
      existing.assignmentCount += 1;
    } else {
      map.set(a.practiceArea, {
        practiceArea: a.practiceArea,
        estimatedHours: a.estimatedHours || 0,
        assignmentCount: 1,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.estimatedHours - a.estimatedHours);
}

export function buildWorkloadBoardRows(
  employees: AdminEmployee[],
  assignments: AdminAssignment[],
  vacations: AdminVacation[],
  referenceDate: string,
): AdminWorkloadBoardRow[] {
  return employees.map((employee) => {
    const openAssignments = getOpenAssignmentsForEmployee(
      employee.id,
      assignments,
    );
    const openEstimatedHours = openAssignments.reduce(
      (sum, a) => sum + (a.estimatedHours || 0),
      0,
    );
    const capacity = employee.weeklyCapacityHours;
    const capacityMissing = capacity == null || capacity <= 0;
    const capacityDataWarning = capacityMissing
      ? "Weekly capacity is zero or missing — workload percentage cannot be calculated."
      : null;
    const workloadPercentage = capacityMissing
      ? null
      : calculateWorkloadPercentage(openEstimatedHours, capacity);
    const remainingAvailableHours = capacityMissing
      ? null
      : Math.round((capacity - openEstimatedHours) * 10) / 10;

    const dueSoonCount = openAssignments.filter((a) =>
      isDueWithinDays(a.dueDate, referenceDate, 7),
    ).length;
    const overdueCount = openAssignments.filter(
      (a) => a.status === "overdue" || isOverdue(a.dueDate, referenceDate),
    ).length;

    const matterIds = new Set(openAssignments.map((a) => a.matterId));
    const { leaveStatus, currentLeave, upcomingLeave } = getWorkloadLeaveDisplay(
      employee,
      vacations,
      referenceDate,
    );
    const classification = classifyWorkloadBoard(
      employee.status,
      leaveStatus,
      workloadPercentage,
    );

    const practiceAreaDistribution =
      buildPracticeAreaDistribution(openAssignments);

    const warnings: string[] = [];
    if (classification === "over_capacity") {
      warnings.push("Over capacity: open estimated hours exceed weekly capacity.");
    } else if (classification === "near_capacity") {
      warnings.push("Near capacity: workload is between 90% and 100%.");
    }
    if (overdueCount > 0) {
      warnings.push(
        `${overdueCount} overdue assignment${overdueCount === 1 ? "" : "s"}.`,
      );
    }
    if (capacityDataWarning) {
      warnings.push(capacityDataWarning);
    }

    const leaveWindows = [
      ...(currentLeave ? [currentLeave] : []),
      ...upcomingLeave,
    ];
    const dueDuringLeave = openAssignments.filter((a) =>
      leaveWindows.some((v) =>
        datesOverlap(a.startDate, a.dueDate, v.startDate, v.endDate),
      ),
    );
    if (dueDuringLeave.length > 0) {
      warnings.push(
        `${dueDuringLeave.length} assignment(s) have due dates during approved leave.`,
      );
    }

    const outsidePractice = openAssignments.filter(
      (a) => a.practiceArea !== employee.practiceArea,
    );
    if (outsidePractice.length > 0) {
      warnings.push(
        `${outsidePractice.length} assignment(s) outside main practice area (${employee.practiceArea}).`,
      );
    }

    if (employee.status === "inactive" && openAssignments.length > 0) {
      warnings.push(
        "Inactive employee still has active or open assignments.",
      );
    }

    return {
      employeeId: employee.id,
      employeeName: employee.fullName,
      jobTitle: employee.title,
      roleLabel: employee.roleLabel,
      practiceArea: employee.practiceArea,
      employmentStatus: employee.status,
      weeklyCapacityHours: capacity,
      openEstimatedHours,
      actualHoursWorked: employee.actualHoursWorked,
      remainingAvailableHours,
      workloadPercentage,
      capacityDataWarning,
      activeMatterCount: matterIds.size,
      dueSoonCount,
      overdueCount,
      leaveStatus,
      classification,
      currentLeave,
      upcomingLeave,
      practiceAreaDistribution,
      warnings,
      openAssignments,
    };
  });
}

export function sortWorkloadBoardRows(
  rows: AdminWorkloadBoardRow[],
  sortKey: WorkloadBoardSortKey,
): AdminWorkloadBoardRow[] {
  const copy = [...rows];
  const pct = (r: AdminWorkloadBoardRow) => r.workloadPercentage ?? -1;
  const avail = (r: AdminWorkloadBoardRow) => r.remainingAvailableHours ?? -9999;

  switch (sortKey) {
    case "workload_high":
      return copy.sort((a, b) => pct(b) - pct(a) || a.employeeName.localeCompare(b.employeeName));
    case "workload_low":
      return copy.sort((a, b) => pct(a) - pct(b) || a.employeeName.localeCompare(b.employeeName));
    case "overdue":
      return copy.sort(
        (a, b) =>
          b.overdueCount - a.overdueCount ||
          a.employeeName.localeCompare(b.employeeName),
      );
    case "due_soon":
      return copy.sort(
        (a, b) =>
          b.dueSoonCount - a.dueSoonCount ||
          a.employeeName.localeCompare(b.employeeName),
      );
    case "available_hours":
      return copy.sort(
        (a, b) =>
          avail(b) - avail(a) || a.employeeName.localeCompare(b.employeeName),
      );
    case "name":
    default:
      return copy.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }
}

export function workloadBoardClassificationLabel(
  classification: WorkloadBoardClassification,
): string {
  switch (classification) {
    case "available":
      return "Available";
    case "balanced":
      return "Balanced";
    case "near_capacity":
      return "Near Capacity";
    case "over_capacity":
      return "Over Capacity";
    case "unavailable":
      return "Unavailable";
  }
}
