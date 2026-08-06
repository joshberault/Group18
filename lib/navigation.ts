import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  Briefcase,
  Calculator,
  CircleDollarSign,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  GitBranch,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Receipt,
  Upload,
  UserCog,
  Users,
  UserCircle,
} from "lucide-react";
import type { UserRole } from "@/lib/types";

export type RouteKey =
  | "dashboard"
  | "clients"
  | "matters"
  | "admin"
  | "time"
  | "tasks"
  | "billing"
  | "invoices"
  | "receivables"
  | "accounting"
  | "reports"
  | "client_portal"
  | "trust_accounting"
  | "revenue_ledger"
  | "banking"
  | "accounts_payable"
  | "audit_log"
  | "administration";

export interface NavItem {
  routeKey: RouteKey;
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  /** Demo roles that can see this nav item (not used for Accounting Manager — see accounting-manager-nav.ts) */
  roles?: UserRole[];
}

const ALL_ROLES: UserRole[] = [
  "managing_partner",
  "attorney",
  "paralegal",
  "billing_specialist",
  "accounting_manager",
  "firm_administrator",
  "client",
];

const STAFF: UserRole[] = ALL_ROLES.filter((r) => r !== "client");
const ATTORNEY_TEAM: UserRole[] = ["managing_partner", "attorney", "paralegal"];
const BILLING_TEAM: UserRole[] = [
  "managing_partner",
  "billing_specialist",
  "accounting_manager",
  "firm_administrator",
];

/**
 * Sidebar navigation with demo-role visibility for all roles except Accounting Manager.
 * Accounting Manager uses lib/navigation/accounting-manager-nav.ts.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    routeKey: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Firm overview and key metrics",
    roles: ALL_ROLES,
  },
  {
    routeKey: "clients",
    label: "Clients",
    href: "/clients",
    icon: Users,
    description: "Client records and relationships",
    roles: STAFF,
  },
  {
    routeKey: "matters",
    label: "Matters",
    href: "/matters",
    icon: Briefcase,
    description: "Legal matters and engagements",
    roles: STAFF,
  },
  {
    routeKey: "admin",
    label: "Admin/Staff Information",
    href: "/admin",
    icon: UserCog,
    description:
      "Employees, matters, assignments, approvals, workload, and roles",
    roles: ["firm_administrator"],
  },
  {
    routeKey: "matters",
    label: "Attorney Hub",
    href: "/attorney/dashboard",
    icon: Briefcase,
    description: "Assigned matters, time entries, and expenses",
    roles: ATTORNEY_TEAM,
  },
  {
    routeKey: "time",
    label: "Time & Expenses",
    href: "/attorney/time",
    icon: Clock,
    description: "Attorney time and billable expenses",
    roles: [...ATTORNEY_TEAM, "billing_specialist"],
  },
  {
    routeKey: "tasks",
    label: "Tasks & Deadlines",
    href: "/attorney/tasks",
    icon: ListTodo,
    description: "Matter tasks and deadline tracking",
    roles: ATTORNEY_TEAM,
  },
  {
    routeKey: "billing",
    label: "Billing",
    href: "/billing",
    icon: Receipt,
    description: "Billing workflows and rate management",
    roles: BILLING_TEAM,
  },
  {
    routeKey: "invoices",
    label: "Invoices & Collections",
    href: "/invoices",
    icon: FileText,
    description: "Invoice generation and collections",
    roles: BILLING_TEAM,
  },
  {
    routeKey: "receivables",
    label: "Accounts Receivable",
    href: "/receivables",
    icon: CircleDollarSign,
    description: "Outstanding AR, payments, and reminders",
    roles: BILLING_TEAM,
  },
  {
    routeKey: "accounting",
    label: "Accounting",
    href: "/accounting",
    icon: Calculator,
    description: "Accounting controls and trust accounting",
    roles: [...BILLING_TEAM, "managing_partner"],
  },
  {
    routeKey: "reports",
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    description: "Profitability and operational reports",
    roles: BILLING_TEAM,
  },
  // Client role: each portal feature is its own sidebar tab (listed before the hub
  // so /client-portal/* access checks match these routes, not the hub entry).
  {
    routeKey: "client_portal",
    label: "Account Summary",
    href: "/client-portal/account-summary",
    icon: LayoutDashboard,
    description: "Balances, invoices, and account overview",
    roles: ["client"],
  },
  {
    routeKey: "client_portal",
    label: "Pay Balance",
    href: "/client-portal/pay-balance",
    icon: CreditCard,
    description: "Review invoices and make a payment",
    roles: ["client"],
  },
  {
    routeKey: "client_portal",
    label: "Upload Documents",
    href: "/client-portal/upload-documents",
    icon: Upload,
    description: "Drop and submit case files securely",
    roles: ["client"],
  },
  {
    routeKey: "client_portal",
    label: "Requests",
    href: "/client-portal/requests",
    icon: ClipboardList,
    description: "Ask the firm for help or updates",
    roles: ["client"],
  },
  {
    routeKey: "client_portal",
    label: "Case Information",
    href: "/client-portal/case-information",
    icon: Briefcase,
    description: "Matter details and team contacts",
    roles: ["client"],
  },
  {
    routeKey: "client_portal",
    label: "Messaging",
    href: "/client-portal/messaging",
    icon: MessageSquare,
    description: "Secure messages with your legal team",
    roles: ["client"],
  },
  {
    routeKey: "client_portal",
    label: "Case Status",
    href: "/client-portal/case-status",
    icon: GitBranch,
    description: "Track milestones and progress",
    roles: ["client"],
  },
  {
    routeKey: "client_portal",
    label: "Notifications",
    href: "/client-portal/notifications",
    icon: Bell,
    description: "Billing, document, and case alerts",
    roles: ["client"],
  },
  {
    routeKey: "client_portal",
    label: "Client Portal",
    href: "/client-portal",
    icon: UserCircle,
    description: "Client-facing matter and invoice access",
    roles: ["managing_partner", "firm_administrator"],
  },
];

export function getNavRoles(href: string): UserRole[] {
  const item = NAV_ITEMS.find((nav) => nav.href === href);
  return item?.roles ?? [];
}
