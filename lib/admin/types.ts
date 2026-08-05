/**
 * Staff/Admin Operations domain types (Person 5 — Reagan Weeks).
 * UI/view-model types for the Admin section only.
 * Do not redefine shared CounselFlow tables (profiles, matters,
 * matter_assignments, time_entries). Supabase will map into these later.
 */

export type EmploymentStatus = "active" | "inactive" | "on_leave";

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "returned";

export type ApprovalPriority = "urgent" | "normal";

export type ApprovalType =
  | "time_entry"
  | "expense"
  | "vacation"
  | "write_down"
  | "additional_work"
  | "matter_closure"
  | "reassignment";

export type AssignmentStatus =
  | "active"
  | "completed"
  | "pending"
  | "overdue"
  | "canceled";

export type AssignmentPriority = "low" | "medium" | "high" | "urgent";

export type MatterLifecycleStatus = "open" | "closed" | "archived";

export type WorkloadLevel = "light" | "balanced" | "heavy" | "overallocated";

/** Derived capacity band used by Manager Dashboard filters and alerts. */
export type WorkloadCapacityStatus =
  | "available"
  | "near_capacity"
  | "overloaded"
  | "on_leave"
  | "inactive";

/**
 * Workload Board classification (Person 5 staffing board).
 * Available &lt;60%; Balanced 60–89%; Near Capacity 90–100%;
 * Over Capacity &gt;100%; Unavailable = inactive or current approved leave.
 */
export type WorkloadBoardClassification =
  | "available"
  | "balanced"
  | "near_capacity"
  | "over_capacity"
  | "unavailable";

export type WorkloadLeaveDisplay =
  | "None"
  | "Current Leave"
  | "Upcoming Leave"
  | "Leave pending approval";

export interface WorkloadPracticeAreaShare {
  practiceArea: string;
  estimatedHours: number;
  assignmentCount: number;
}

/** Full Workload Board row — calculated from employees + assignments + leave. */
export interface AdminWorkloadBoardRow {
  employeeId: string;
  employeeName: string;
  jobTitle: string;
  roleLabel: string;
  practiceArea: string;
  employmentStatus: EmploymentStatus;
  weeklyCapacityHours: number;
  /** Sum of open assignment estimated hours (not actual hours). */
  openEstimatedHours: number;
  actualHoursWorked: number;
  remainingAvailableHours: number | null;
  workloadPercentage: number | null;
  capacityDataWarning: string | null;
  activeMatterCount: number;
  dueSoonCount: number;
  overdueCount: number;
  leaveStatus: WorkloadLeaveDisplay;
  classification: WorkloadBoardClassification;
  currentLeave: AdminVacation | null;
  upcomingLeave: AdminVacation[];
  practiceAreaDistribution: WorkloadPracticeAreaShare[];
  warnings: string[];
  openAssignments: AdminAssignment[];
}

export interface AdminEmployee {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  /** Work phone only — no personal contact data. */
  phone: string;
  employeeNumber: string;
  title: string;
  department: string;
  roleKey: string;
  roleLabel: string;
  practiceArea: string;
  status: EmploymentStatus;
  hireDate: string;
  /** Bar admission number — required for Attorney/Partner titles. */
  barNumber: string;
  /**
   * Restricted internal information — firm cost rate.
   * Do not expose outside admin staffing views.
   */
  internalHourlyCostRate: number;
  standardBillableRate: number;
  /** Weekly capacity hours (must be > 0 for active staffing). */
  weeklyCapacityHours: number;
  targetBillableHours: number;
  /** Manager employee id; cannot equal this employee's id. */
  managerId: string | null;
  /** Scheduled / capacity hours for the period (denominator for utilization). */
  availableWorkHours: number;
  /** Hours currently assigned to matters (planned load). */
  assignedHours: number;
  /** Actual billable hours worked in the period. */
  actualHoursWorked: number;
  isAttorney: boolean;
  /** Optional link to an existing profiles.id when wired to Supabase */
  profileId?: string;
}

export type VacationStatusLabel =
  | "None scheduled"
  | "On approved leave"
  | "Leave upcoming"
  | "Leave pending approval";

export interface AdminAttorneyProfile {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  practiceFocus: string;
  barNumber: string;
  billableTargetHours: number;
  currentOpenMatters: number;
  status: EmploymentStatus;
}

/** Permission keys shown in the Admin Role Permissions matrix. */
export type AdminPermissionKey =
  | "canAccessAdminSection"
  | "canViewManagerDashboard"
  | "canViewEmployeeDirectory"
  | "canManageEmployees"
  | "canViewEmployeeProfiles"
  | "canViewInternalCostRates"
  | "canManageRoles"
  | "canAssignMatters"
  | "canReassignMatters"
  | "canViewWorkload"
  | "canApproveWork"
  | "canApproveTimeEntries"
  | "canApproveExpenses"
  | "canApproveVacation"
  | "canApproveWriteDowns"
  | "canAccessBilling"
  | "canAccessAccounting"
  | "canViewAuditLogs";

export interface AdminRolePermission {
  id: string;
  roleKey: string;
  roleLabel: string;
  description: string;
  canAccessAdminSection: boolean;
  canViewManagerDashboard: boolean;
  canViewEmployeeDirectory: boolean;
  canManageEmployees: boolean;
  canViewEmployeeProfiles: boolean;
  canViewInternalCostRates: boolean;
  canManageRoles: boolean;
  canAssignMatters: boolean;
  canReassignMatters: boolean;
  /** View all employee workloads (not only own). */
  canViewWorkload: boolean;
  canApproveWork: boolean;
  canApproveTimeEntries: boolean;
  canApproveExpenses: boolean;
  canApproveVacation: boolean;
  canApproveWriteDowns: boolean;
  canAccessBilling: boolean;
  canAccessAccounting: boolean;
  canViewAuditLogs: boolean;
}

export interface AdminMatter {
  id: string;
  matterLabel: string;
  matterReference: string;
  clientName: string;
  practiceArea: string;
  status: MatterLifecycleStatus;
  /** Optional staffing conflict note from the matter record. */
  conflictWarning?: string;
  /** When the engagement was opened. */
  openedDate: string;
  /** Engagement agreement status for staffing/admin review. */
  engagementStatus: "signed" | "pending" | "not_required" | "expired";
  engagementDate?: string;
  /** Short matter summary for Admin Matters board. */
  summary: string;
  /** Staffing urgency when the matter needs coverage. */
  staffingUrgency: "high" | "medium" | "low";
  /** Optional responsible attorney name when known. */
  responsibleAttorneyName?: string;
  responsibleEmployeeId?: string;
}

export interface AdminAssignment {
  id: string;
  matterId: string;
  matterLabel: string;
  matterReference: string;
  clientName: string;
  attorneyName: string;
  employeeId: string;
  roleOnMatter: string;
  practiceArea: string;
  priority: AssignmentPriority;
  status: AssignmentStatus;
  assignedDate: string;
  startDate: string;
  dueDate: string;
  estimatedHours: number;
  /** Actual hours worked on this assignment, when known. */
  actualHours?: number;
  managerInstructions?: string;
  /** Required when status is canceled. */
  cancelReason?: string;
  matterStatus: MatterLifecycleStatus;
  /** Present when status is completed — used for on-time completion rate. */
  completedDate?: string;
  profileId?: string;
}

/** Per-employee productivity snapshot for profile pages. */
export interface EmployeeProfileProductivity {
  utilizationRate: number;
  targetAttainment: number;
  assignmentCompletionRate: number;
  onTimeCompletionRate: number;
  billableHours: number;
  availableWorkHours: number;
  targetBillableHours: number;
  completedAssignments: number;
  assignmentsDue: number;
  completedOnTime: number;
}

export interface AdminUnassignedMatter {
  id: string;
  matterLabel: string;
  matterReference: string;
  practiceArea: string;
  openedDate: string;
  urgency: "high" | "medium" | "low";
}

export interface AdminApproval {
  id: string;
  title: string;
  type: ApprovalType;
  submittedBy: string;
  employeeId: string;
  /** Display helper kept in sync with title/summary for older call sites. */
  summary: string;
  status: ApprovalStatus;
  priority: ApprovalPriority;
  submittedAt: string;
  amountOrHours?: string;
  matterId?: string;
  matterLabel?: string;
  matterReference?: string;
  matterStatus?: MatterLifecycleStatus;
  assignedApproverId: string;
  assignedApproverName: string;
  /** Reviewer decision metadata — preserved after review. */
  reviewerId?: string;
  reviewerName?: string;
  reviewedAt?: string;
  decision?: "approved" | "rejected" | "returned";
  reviewNotes?: string;
  /** Original submitted payload — not mutated after review. */
  originalSnapshot: string;
  /** Time entry details */
  timeEntryDate?: string;
  timeEntryHours?: number;
  timeEntryBillable?: boolean;
  timeEntryDescription?: string;
  /** Expense details */
  expenseAmount?: number;
  expenseCategory?: string;
  expensePurpose?: string;
  receiptStatus?: "attached" | "missing" | "not_required";
  /** Vacation details */
  vacationStartDate?: string;
  vacationEndDate?: string;
  vacationWorkdays?: number;
  vacationComments?: string;
  backupEmployeeId?: string;
  backupEmployeeName?: string;
  /** Write-down / additional work / closure / reassignment notes */
  requestDetails?: string;
}

export interface AdminVacation {
  id: string;
  employeeId: string;
  employeeName: string;
  practiceArea: string;
  startDate: string;
  endDate: string;
  status: "approved" | "pending";
  days: number;
}

export interface AdminWorkloadItem {
  id: string;
  employeeId: string;
  attorneyName: string;
  practiceArea: string;
  openMatters: number;
  weeklyBillableHours: number;
  assignedHours: number;
  actualHoursWorked: number;
  availableWorkHours: number;
  pendingApprovals: number;
  level: WorkloadLevel;
  capacityStatus: WorkloadCapacityStatus;
  utilizationRate: number;
}

export type WorkloadBoardSortKey =
  | "name"
  | "workload_high"
  | "workload_low"
  | "overdue"
  | "due_soon"
  | "available_hours";

export interface AdminProductivityMetric {
  id: string;
  employeeId: string;
  attorneyName: string;
  practiceArea: string;
  /** Actual billable hours worked */
  billableHours: number;
  /** Alias clarity: same as billableHours (actual worked) */
  actualHoursWorked: number;
  assignedHours: number;
  availableWorkHours: number;
  targetHours: number;
  utilizationRate: number;
  mattersClosed: number;
  capacityStatus: WorkloadCapacityStatus;
}

export interface AdminDashboardSummary {
  activeEmployees: number;
  availableAttorneys: number;
  employeesOnApprovedLeave: number;
  pendingApprovals: number;
  urgentPendingApprovals: number;
  overloadedEmployees: number;
  assignmentsDueWithin7Days: number;
  overdueAssignments: number;
  unassignedMatters: number;
  averageAttorneyUtilization: number;
}

export type AttentionPriority = "urgent" | "high" | "normal";

export interface AdminAttentionItem {
  id: string;
  priority: AttentionPriority;
  issue: string;
  subjectLabel: string;
  subjectHref?: string;
  dateOrAge: string;
  actionLabel: string;
  actionHref: string;
  sortAgeDays: number;
}

export interface AdminActivityItem {
  id: string;
  action: string;
  performedBy: string;
  affected: string;
  at: string;
}

/** Job / career applications awaiting Firm Administrator review. */
export type JobApplicationStatus =
  | "pending"
  | "interview"
  | "rejected"
  | "hired";

export interface AdminJobApplication {
  id: string;
  applicantName: string;
  email: string;
  phone: string;
  appliedRole: string;
  practiceArea: string;
  submittedAt: string;
  status: JobApplicationStatus;
  yearsExperience: number;
  notes: string;
  resumeOnFile: boolean;
}

export type AdminSectionKey =
  | "dashboard"
  | "attorneys"
  | "employees"
  | "matters"
  | "assignments"
  | "approvals"
  | "workload"
  | "roles";

export interface AdminNavItem {
  key: AdminSectionKey;
  label: string;
  href: string;
  description: string;
}

export interface AdminDashboardFilters {
  practiceArea: string;
  workloadStatus: WorkloadCapacityStatus | "all";
}
