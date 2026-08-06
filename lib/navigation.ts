import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Briefcase,
  Calculator,
  CircleDollarSign,
  Clock,
  FileText,
  LayoutDashboard,
  ListTodo,
  Receipt,
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
  /** Demo roles that can see this nav item (not used for Accounting Manager or Client — see dedicated nav files) */
  roles?: UserRole[];
}

const STAFF: UserRole[] = [
  "managing_partner",
  "attorney",
  "paralegal",
  "billing_specialist",
  "firm_administrator",
];

const ATTORNEY_TEAM: UserRole[] = ["managing_partner", "attorney", "paralegal"];

const BILLING_OPS: UserRole[] = [
  "managing_partner",
  "billing_specialist",
  "firm_administrator",
];

const FINANCIAL_OVERSIGHT: UserRole[] = [
  "managing_partner",
  "billing_specialist",
  "firm_administrator",
];

/**
 * Sidebar navigation with demo-role visibility for all roles except Accounting Manager and Client.
 * Accounting Manager uses lib/navigation/accounting-manager-nav.ts.
 * Client uses lib/navigation/client-nav.ts.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    routeKey: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Firm overview and key metrics",
    roles: STAFF,
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
    roles: BILLING_OPS,
  },
  {
    routeKey: "invoices",
    label: "Invoices & Collections",
    href: "/invoices",
    icon: FileText,
    description: "Invoice generation and collections",
    roles: [...FINANCIAL_OVERSIGHT, "attorney"],
  },
  {
    routeKey: "receivables",
    label: "Accounts Receivable",
    href: "/receivables",
    icon: CircleDollarSign,
    description: "Outstanding AR, payments, and reminders",
    roles: FINANCIAL_OVERSIGHT,
  },
  {
    routeKey: "accounting",
    label: "Accounting",
    href: "/accounting",
    icon: Calculator,
    description: "Accounting summary and trust overview",
    roles: ["firm_administrator"],
  },
  {
    routeKey: "reports",
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    description: "Profitability and operational reports",
    roles: FINANCIAL_OVERSIGHT,
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
