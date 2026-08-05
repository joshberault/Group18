/** Audit log mock data for Accounting Manager workspace */

export type AuditModule =
  | "Billing"
  | "Accounts Receivable"
  | "Trust"
  | "General Ledger"
  | "Banking"
  | "Accounts Payable"
  | "Administration"
  | "Login"
  | "Exports";

export type AuditAction =
  | "Created"
  | "Updated"
  | "Approved"
  | "Rejected"
  | "Deleted"
  | "Exported"
  | "Login"
  | "Login Failed"
  | "Reconciled"
  | "Posted"
  | "Voided";

export type AuditRiskLevel = "Low" | "Medium" | "High" | "Critical";

export type AuditReviewStatus = "Unreviewed" | "Reviewed" | "Flagged";

export interface AuditEventDetail {
  beforeValue?: string;
  afterValue?: string;
  reason?: string;
  relatedRecord?: string;
  sourceModule?: string;
  sessionReference: string;
  userAgent?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  module: AuditModule;
  action: AuditAction;
  recordType: string;
  recordId: string;
  description: string;
  riskLevel: AuditRiskLevel;
  ipOrSession: string;
  reviewStatus: AuditReviewStatus;
  flagged: boolean;
  reviewNote?: string;
  detail: AuditEventDetail;
}

export const auditModuleOptions: AuditModule[] = [
  "Billing",
  "Accounts Receivable",
  "Trust",
  "General Ledger",
  "Banking",
  "Accounts Payable",
  "Administration",
  "Login",
  "Exports",
];

export const auditActionOptions: AuditAction[] = [
  "Created",
  "Updated",
  "Approved",
  "Rejected",
  "Deleted",
  "Exported",
  "Login",
  "Login Failed",
  "Reconciled",
  "Posted",
  "Voided",
];

export const auditRiskOptions: AuditRiskLevel[] = [
  "Low",
  "Medium",
  "High",
  "Critical",
];

export const auditReviewStatusOptions: AuditReviewStatus[] = [
  "Unreviewed",
  "Reviewed",
  "Flagged",
];

export const auditRoleOptions = [
  "Accounting Manager",
  "Billing Specialist",
  "Managing Partner",
  "Attorney",
  "Firm Administrator",
  "System",
] as const;

export const auditUserOptions = [
  "Alex Morgan",
  "Jordan Lee",
  "Sarah Chen",
  "Michael Torres",
  "Jennifer Walsh",
  "David Kim",
  "Rachel Foster",
  "Robert Morgan",
  "System",
] as const;

export const amAuditEvents: AuditEvent[] = [
  {
    id: "aud-001",
    timestamp: "2026-08-05T14:22:18Z",
    user: "Alex Morgan",
    role: "Accounting Manager",
    module: "Billing",
    action: "Approved",
    recordType: "Prebill",
    recordId: "PB-2026-0842",
    description:
      "Approved prebill for Northwind Holdings LLC — Commercial Lease Dispute ($18,420.00)",
    riskLevel: "Medium",
    ipOrSession: "192.168.10.42 · sess-am-4821",
    reviewStatus: "Unreviewed",
    flagged: false,
    detail: {
      beforeValue: "Status: Pending Accounting Review",
      afterValue: "Status: Ready to Finalize",
      relatedRecord: "INV-2026-1042 · Matter 2025-CL-0412",
      sourceModule: "Billing",
      sessionReference: "sess-am-4821",
      userAgent: "Chrome 128 / Windows",
    },
  },
  {
    id: "aud-002",
    timestamp: "2026-08-05T13:58:04Z",
    user: "Jordan Lee",
    role: "Billing Specialist",
    module: "Billing",
    action: "Created",
    recordType: "Invoice",
    recordId: "INV-2026-1098",
    description:
      "Generated invoice for Beacon Medical Partners — Healthcare Compliance Audit ($12,400.00)",
    riskLevel: "Low",
    ipOrSession: "10.0.4.18 · sess-bl-7712",
    reviewStatus: "Reviewed",
    flagged: false,
    reviewNote: "Routine monthly billing cycle.",
    detail: {
      afterValue: "Invoice INV-2026-1098 created · Net 30 · Due 2026-09-04",
      relatedRecord: "Matter 2026-HC-0012",
      sourceModule: "Billing",
      sessionReference: "sess-bl-7712",
    },
  },
  {
    id: "aud-003",
    timestamp: "2026-08-05T13:41:27Z",
    user: "Alex Morgan",
    role: "Accounting Manager",
    module: "Accounts Receivable",
    action: "Approved",
    recordType: "Write-Off",
    recordId: "WO-2026-0034",
    description:
      "Approved write-off of $2,150.00 for Summit Retail Group — Employment Litigation",
    riskLevel: "High",
    ipOrSession: "192.168.10.42 · sess-am-4821",
    reviewStatus: "Unreviewed",
    flagged: true,
    detail: {
      beforeValue: "Outstanding: $2,150.00 · Status: Write-Off Requested",
      afterValue: "Outstanding: $0.00 · Status: Written Off",
      reason: "Uncollectible after 120+ days and client bankruptcy filing",
      relatedRecord: "INV-2025-0884",
      sourceModule: "Accounts Receivable",
      sessionReference: "sess-am-4821",
    },
  },
  {
    id: "aud-004",
    timestamp: "2026-08-05T12:15:09Z",
    user: "Alex Morgan",
    role: "Accounting Manager",
    module: "Trust",
    action: "Reconciled",
    recordType: "Trust Reconciliation",
    recordId: "TR-REC-2026-07",
    description:
      "Completed three-way trust reconciliation for IOLTA Operating Trust — July 2026",
    riskLevel: "Medium",
    ipOrSession: "192.168.10.42 · sess-am-4821",
    reviewStatus: "Reviewed",
    flagged: false,
    reviewNote: "Reconciliation difference resolved to $0.00.",
    detail: {
      beforeValue: "Reconciliation Difference: $125.00",
      afterValue: "Reconciliation Difference: $0.00 · Status: Complete",
      relatedRecord: "Trust Account IOLTA-CHI-001",
      sourceModule: "Trust",
      sessionReference: "sess-am-4821",
    },
  },
  {
    id: "aud-005",
    timestamp: "2026-08-05T11:48:33Z",
    user: "Alex Morgan",
    role: "Accounting Manager",
    module: "General Ledger",
    action: "Posted",
    recordType: "Journal Entry",
    recordId: "JE-2026-0418",
    description:
      "Posted revenue recognition entry for July 2026 — $284,500.00",
    riskLevel: "High",
    ipOrSession: "192.168.10.42 · sess-am-4821",
    reviewStatus: "Unreviewed",
    flagged: false,
    detail: {
      beforeValue: "Status: Approved · Debits: $284,500.00 · Credits: $284,500.00",
      afterValue: "Status: Posted · Period: July 2026",
      relatedRecord: "Account 4100 — Legal Services Revenue",
      sourceModule: "General Ledger",
      sessionReference: "sess-am-4821",
    },
  },
  {
    id: "aud-006",
    timestamp: "2026-08-05T11:22:51Z",
    user: "Alex Morgan",
    role: "Accounting Manager",
    module: "Banking",
    action: "Reconciled",
    recordType: "Bank Reconciliation",
    recordId: "BR-2026-07-OP",
    description:
      "Reconciled operating account Chase Business Checking — statement ending 2026-07-31",
    riskLevel: "Medium",
    ipOrSession: "192.168.10.42 · sess-am-4821",
    reviewStatus: "Reviewed",
    flagged: false,
    detail: {
      beforeValue: "Unreconciled items: 14 · Difference: $3,420.00",
      afterValue: "Unreconciled items: 0 · Difference: $0.00",
      relatedRecord: "Account CHASE-OP-4401",
      sourceModule: "Banking",
      sessionReference: "sess-am-4821",
    },
  },
  {
    id: "aud-007",
    timestamp: "2026-08-05T10:55:17Z",
    user: "Alex Morgan",
    role: "Accounting Manager",
    module: "Accounts Payable",
    action: "Approved",
    recordType: "Vendor Bill",
    recordId: "VB-2026-0291",
    description:
      "Approved vendor bill from Westlake Court Reporting — $1,840.00",
    riskLevel: "Low",
    ipOrSession: "192.168.10.42 · sess-am-4821",
    reviewStatus: "Reviewed",
    flagged: false,
    detail: {
      beforeValue: "Approval Status: Pending",
      afterValue: "Approval Status: Approved · Payment scheduled 2026-08-12",
      relatedRecord: "Matter 2025-EL-0298",
      sourceModule: "Accounts Payable",
      sessionReference: "sess-am-4821",
    },
  },
  {
    id: "aud-008",
    timestamp: "2026-08-05T10:30:44Z",
    user: "Unknown",
    role: "System",
    module: "Login",
    action: "Login Failed",
    recordType: "Authentication",
    recordId: "AUTH-FAIL-8821",
    description: "Failed login attempt for user account jsmith@counselflow.demo",
    riskLevel: "Critical",
    ipOrSession: "203.45.112.88 · sess-fail-8821",
    reviewStatus: "Unreviewed",
    flagged: true,
    detail: {
      reason: "Invalid credentials — 3rd consecutive failure",
      sessionReference: "sess-fail-8821",
      userAgent: "Firefox 127 / macOS",
    },
  },
  {
    id: "aud-009",
    timestamp: "2026-08-05T09:18:02Z",
    user: "Alex Morgan",
    role: "Accounting Manager",
    module: "Exports",
    action: "Exported",
    recordType: "A/R Aging Report",
    recordId: "EXP-AR-2026-0805",
    description: "Exported A/R Aging report — all offices, as of 2026-08-05",
    riskLevel: "Medium",
    ipOrSession: "192.168.10.42 · sess-am-4821",
    reviewStatus: "Unreviewed",
    flagged: false,
    detail: {
      afterValue: "CSV export · 142 records · 248 KB",
      sourceModule: "Reports",
      sessionReference: "sess-am-4821",
    },
  },
  {
    id: "aud-010",
    timestamp: "2026-08-05T08:42:11Z",
    user: "Alex Morgan",
    role: "Accounting Manager",
    module: "Login",
    action: "Login",
    recordType: "Authentication",
    recordId: "AUTH-OK-4821",
    description: "Successful login — Accounting Manager workspace",
    riskLevel: "Low",
    ipOrSession: "192.168.10.42 · sess-am-4821",
    reviewStatus: "Reviewed",
    flagged: false,
    detail: {
      afterValue: "Session started · MFA verified",
      sessionReference: "sess-am-4821",
      userAgent: "Chrome 128 / Windows",
    },
  },
  {
    id: "aud-011",
    timestamp: "2026-08-04T17:33:55Z",
    user: "Jordan Lee",
    role: "Billing Specialist",
    module: "Billing",
    action: "Updated",
    recordType: "Time Entry",
    recordId: "TE-2026-18442",
    description:
      "Adjusted time entry for Pinnacle Software Ltd. — reduced from 2.5 to 2.0 hours",
    riskLevel: "Medium",
    ipOrSession: "10.0.4.18 · sess-bl-7712",
    reviewStatus: "Unreviewed",
    flagged: false,
    detail: {
      beforeValue: "Hours: 2.5 · Amount: $875.00",
      afterValue: "Hours: 2.0 · Amount: $700.00",
      reason: "Attorney correction per billing review",
      relatedRecord: "Matter 2026-IP-0008",
      sourceModule: "Billing",
      sessionReference: "sess-bl-7712",
    },
  },
  {
    id: "aud-012",
    timestamp: "2026-08-04T16:20:08Z",
    user: "Alex Morgan",
    role: "Accounting Manager",
    module: "Trust",
    action: "Approved",
    recordType: "Trust Withdrawal",
    recordId: "TW-2026-0156",
    description:
      "Approved trust withdrawal of $8,200.00 for Harbor Logistics Inc. — applied to invoice",
    riskLevel: "High",
    ipOrSession: "192.168.10.42 · sess-am-4802",
    reviewStatus: "Reviewed",
    flagged: false,
    reviewNote: "Retainer replenishment verified before withdrawal.",
    detail: {
      beforeValue: "Trust Balance: $13,200.00 · Status: Pending Approval",
      afterValue: "Trust Balance: $5,000.00 · Status: Posted",
      relatedRecord: "INV-2026-0976",
      sourceModule: "Trust",
      sessionReference: "sess-am-4802",
    },
  },
  {
    id: "aud-013",
    timestamp: "2026-08-04T15:08:41Z",
    user: "Sarah Chen",
    role: "Managing Partner",
    module: "Accounts Receivable",
    action: "Updated",
    recordType: "Collection Note",
    recordId: "CN-2026-0442",
    description:
      "Added collection note for Northwind Holdings LLC — client requested 30-day extension",
    riskLevel: "Low",
    ipOrSession: "192.168.10.15 · sess-mp-3310",
    reviewStatus: "Reviewed",
    flagged: false,
    detail: {
      afterValue: "Note: Client CFO requested extension through 2026-09-15",
      relatedRecord: "INV-2026-1042",
      sourceModule: "Accounts Receivable",
      sessionReference: "sess-mp-3310",
    },
  },
  {
    id: "aud-014",
    timestamp: "2026-08-04T14:52:19Z",
    user: "Alex Morgan",
    role: "Accounting Manager",
    module: "General Ledger",
    action: "Approved",
    recordType: "Journal Entry",
    recordId: "JE-2026-0415",
    description:
      "Approved accrual entry for employee bonuses — $45,000.00",
    riskLevel: "High",
    ipOrSession: "192.168.10.42 · sess-am-4802",
    reviewStatus: "Unreviewed",
    flagged: false,
    detail: {
      beforeValue: "Status: Pending Approval",
      afterValue: "Status: Approved",
      relatedRecord: "Account 5200 — Salaries & Wages",
      sourceModule: "General Ledger",
      sessionReference: "sess-am-4802",
    },
  },
  {
    id: "aud-015",
    timestamp: "2026-08-04T13:37:02Z",
    user: "Alex Morgan",
    role: "Accounting Manager",
    module: "Administration",
    action: "Updated",
    recordType: "Approval Rule",
    recordId: "AR-WO-THRESHOLD",
    description:
      "Updated write-off approval threshold from $2,500 to $5,000",
    riskLevel: "Critical",
    ipOrSession: "192.168.10.42 · sess-am-4802",
    reviewStatus: "Unreviewed",
    flagged: true,
    detail: {
      beforeValue: "Threshold: $2,500.00 · Required: Managing Partner",
      afterValue: "Threshold: $5,000.00 · Required: Managing Partner + Accounting Manager",
      reason: "Annual policy review — align with firm risk tolerance",
      sourceModule: "Administration",
      sessionReference: "sess-am-4802",
    },
  },
  {
    id: "aud-016",
    timestamp: "2026-08-04T12:11:44Z",
    user: "Alex Morgan",
    role: "Accounting Manager",
    module: "Banking",
    action: "Updated",
    recordType: "Bank Transaction",
    recordId: "BT-2026-88234",
    description:
      "Matched bank deposit to GL account — client payment $24,800.00",
    riskLevel: "Low",
    ipOrSession: "192.168.10.42 · sess-am-4802",
    reviewStatus: "Reviewed",
    flagged: false,
    detail: {
      beforeValue: "Match Status: Unmatched",
      afterValue: "Match Status: Matched · GL 1100 Accounts Receivable",
      relatedRecord: "PAY-2026-0442",
      sourceModule: "Banking",
      sessionReference: "sess-am-4802",
    },
  },
  {
    id: "aud-017",
    timestamp: "2026-08-04T11:05:28Z",
    user: "Jordan Lee",
    role: "Billing Specialist",
    module: "Billing",
    action: "Voided",
    recordType: "Invoice",
    recordId: "INV-2026-0992",
    description:
      "Voided duplicate invoice for Greenfield Energy Corp. — $4,200.00",
    riskLevel: "High",
    ipOrSession: "10.0.4.18 · sess-bl-7701",
    reviewStatus: "Unreviewed",
    flagged: false,
    detail: {
      beforeValue: "Status: Sent · Amount: $4,200.00",
      afterValue: "Status: Void · Reason: Duplicate billing",
      reason: "Duplicate of INV-2026-0988",
      relatedRecord: "Matter 2025-EP-0189",
      sourceModule: "Billing",
      sessionReference: "sess-bl-7701",
    },
  },
  {
    id: "aud-018",
    timestamp: "2026-08-04T10:22:15Z",
    user: "Alex Morgan",
    role: "Accounting Manager",
    module: "Accounts Payable",
    action: "Rejected",
    recordType: "Reimbursement",
    recordId: "REIM-2026-0088",
    description:
      "Rejected employee reimbursement — missing receipt for $340.00 travel expense",
    riskLevel: "Medium",
    ipOrSession: "192.168.10.42 · sess-am-4802",
    reviewStatus: "Reviewed",
    flagged: false,
    detail: {
      beforeValue: "Approval Status: Pending",
      afterValue: "Approval Status: Rejected",
      reason: "Receipt not attached — policy requires documentation over $50",
      relatedRecord: "Employee: David Kim",
      sourceModule: "Accounts Payable",
      sessionReference: "sess-am-4802",
    },
  },
  {
    id: "aud-019",
    timestamp: "2026-08-03T16:48:33Z",
    user: "Alex Morgan",
    role: "Accounting Manager",
    module: "Exports",
    action: "Exported",
    recordType: "Trust Ledger",
    recordId: "EXP-TR-2026-0803",
    description: "Exported trust ledger for IOLTA Operating Trust — July 2026",
    riskLevel: "Medium",
    ipOrSession: "192.168.10.42 · sess-am-4790",
    reviewStatus: "Reviewed",
    flagged: false,
    detail: {
      afterValue: "CSV export · 89 transactions · 156 KB",
      sourceModule: "Trust",
      sessionReference: "sess-am-4790",
    },
  },
  {
    id: "aud-020",
    timestamp: "2026-08-03T15:12:07Z",
    user: "Unknown",
    role: "System",
    module: "Login",
    action: "Login Failed",
    recordType: "Authentication",
    recordId: "AUTH-FAIL-8799",
    description: "Failed login attempt — account locked after 5 failures",
    riskLevel: "Critical",
    ipOrSession: "45.33.18.201 · sess-fail-8799",
    reviewStatus: "Flagged",
    flagged: true,
    reviewNote: "Escalated to IT — suspicious IP range.",
    detail: {
      reason: "Account lockout triggered · User: billing.demo@counselflow.demo",
      sessionReference: "sess-fail-8799",
      userAgent: "Unknown",
    },
  },
  {
    id: "aud-021",
    timestamp: "2026-08-03T14:05:52Z",
    user: "Alex Morgan",
    role: "Accounting Manager",
    module: "Administration",
    action: "Updated",
    recordType: "Accounting Period",
    recordId: "PER-2026-07",
    description: "Closed accounting period July 2026",
    riskLevel: "Critical",
    ipOrSession: "192.168.10.42 · sess-am-4790",
    reviewStatus: "Reviewed",
    flagged: false,
    reviewNote: "All close tasks completed before period close.",
    detail: {
      beforeValue: "Status: Open · Close tasks: 0 remaining",
      afterValue: "Status: Closed · Closed by: Alex Morgan · 2026-08-03",
      reason: "Month-end close completed",
      sourceModule: "Administration",
      sessionReference: "sess-am-4790",
    },
  },
  {
    id: "aud-022",
    timestamp: "2026-08-03T11:28:19Z",
    user: "Michael Torres",
    role: "Attorney",
    module: "Billing",
    action: "Approved",
    recordType: "Prebill",
    recordId: "PB-2026-0835",
    description:
      "Attorney approved prebill for Summit Retail Group — Employment Litigation ($9,850.00)",
    riskLevel: "Low",
    ipOrSession: "192.168.10.28 · sess-at-2291",
    reviewStatus: "Reviewed",
    flagged: false,
    detail: {
      beforeValue: "Attorney Review: Pending",
      afterValue: "Attorney Review: Approved",
      relatedRecord: "Matter 2025-EL-0298",
      sourceModule: "Billing",
      sessionReference: "sess-at-2291",
    },
  },
  {
    id: "aud-023",
    timestamp: "2026-08-02T17:44:06Z",
    user: "Alex Morgan",
    role: "Accounting Manager",
    module: "Accounts Receivable",
    action: "Created",
    recordType: "Payment Plan",
    recordId: "PP-2026-0012",
    description:
      "Created payment plan for Harbor Logistics Inc. — $8,900.00 over 3 months",
    riskLevel: "Medium",
    ipOrSession: "192.168.10.42 · sess-am-4785",
    reviewStatus: "Unreviewed",
    flagged: false,
    detail: {
      afterValue: "Plan: 3 installments · $2,966.67/month · Start 2026-08-15",
      relatedRecord: "Client C-0976",
      sourceModule: "Accounts Receivable",
      sessionReference: "sess-am-4785",
    },
  },
  {
    id: "aud-024",
    timestamp: "2026-08-02T15:19:38Z",
    user: "Alex Morgan",
    role: "Accounting Manager",
    module: "General Ledger",
    action: "Created",
    recordType: "Journal Entry",
    recordId: "JE-2026-0408",
    description:
      "Created draft journal entry — prepaid insurance amortization $3,200.00",
    riskLevel: "Low",
    ipOrSession: "192.168.10.42 · sess-am-4785",
    reviewStatus: "Reviewed",
    flagged: false,
    detail: {
      afterValue: "Status: Draft · Debits: $3,200.00 · Credits: $3,200.00",
      relatedRecord: "Account 1300 — Prepaid Expenses",
      sourceModule: "General Ledger",
      sessionReference: "sess-am-4785",
    },
  },
];

export function getAuditKpis(events: AuditEvent[]) {
  const today = "2026-08-05";
  const todayEvents = events.filter((e) => e.timestamp.startsWith(today));

  return {
    eventsToday: todayEvents.length,
    highRiskChanges: events.filter(
      (e) => e.riskLevel === "High" || e.riskLevel === "Critical",
    ).length,
    approvalActions: events.filter((e) => e.action === "Approved").length,
    failedAccessAttempts: events.filter((e) => e.action === "Login Failed")
      .length,
    dataExports: events.filter((e) => e.action === "Exported").length,
    unreviewedExceptions: events.filter(
      (e) =>
        e.reviewStatus === "Unreviewed" &&
        (e.riskLevel === "High" ||
          e.riskLevel === "Critical" ||
          e.flagged),
    ).length,
  };
}
