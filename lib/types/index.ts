export const USER_ROLES = [
  "managing_partner",
  "attorney",
  "paralegal",
  "billing_specialist",
  "accounting_manager",
  "firm_administrator",
  "client",
  "prospective_client",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  managing_partner: "Managing Partner",
  attorney: "Attorney",
  paralegal: "Paralegal",
  billing_specialist: "Billing Specialist",
  accounting_manager: "Accounting Manager",
  firm_administrator: "Firm Administrator",
  client: "Client",
  prospective_client: "Prospective Client",
};

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  title?: string;
  department?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  clientNumber: string;
  status: "active" | "inactive" | "prospect";
  primaryContactName?: string;
  primaryContactEmail?: string;
  billingAddress?: string;
  trustBalance?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Matter {
  id: string;
  clientId: string;
  matterNumber: string;
  title: string;
  status: "open" | "closed" | "pending" | "on_hold";
  billingType: "hourly" | "fixed_fee" | "contingency" | "hybrid";
  leadAttorneyId?: string;
  openDate: string;
  closeDate?: string;
  description?: string;
  budgetHours?: number;
  budgetAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  id: string;
  matterId: string;
  userId: string;
  entryDate: string;
  hours: number;
  description: string;
  billable: boolean;
  rate?: number;
  status: "draft" | "submitted" | "approved" | "billed";
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  matterId: string;
  userId: string;
  expenseDate: string;
  amount: number;
  category: string;
  description: string;
  billable: boolean;
  status: "draft" | "submitted" | "approved" | "billed";
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  clientId: string;
  matterId?: string;
  invoiceNumber: string;
  status: "draft" | "sent" | "partial" | "paid" | "void" | "written_off";
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  clientId: string;
  invoiceId?: string;
  paymentDate: string;
  amount: number;
  method: "check" | "ach" | "wire" | "credit_card" | "trust_transfer";
  reference?: string;
  status: "pending" | "completed" | "failed" | "reversed";
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  matterId: string;
  assignedToId?: string;
  title: string;
  description?: string;
  status: "open" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  entityType: string;
  entityId: string;
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
