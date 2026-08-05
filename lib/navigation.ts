import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Briefcase,
  Calculator,
  Calendar,
  CircleDollarSign,
  Clock,
  FileText,
  LayoutDashboard,
  ListTodo,
  Receipt,
  StickyNote,
  UserCog,
  Users,
  UserCircle,
} from "lucide-react";
import type { UserRole } from "@/lib/types";
import { canAccessNavItem } from "@/lib/auth/demo-access";
import {
  ATTORNEY_HUB_ACCESS_ROLES,
  usesAttorneyHubAsHome,
} from "@/lib/auth/role-routes";

export type RouteKey =
  | "dashboard"
  | "clients"
  | "matters"
  | "attorney_hub"
  | "admin"
  | "time"
  | "tasks"
  | "calendar"
  | "notes"
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
    routeKey: "attorney_hub",
    label: "Attorney Hub",
    href: "/attorney/dashboard",
    icon: Briefcase,
    description: "Assigned matters, time entries, and tasks",
    roles: ATTORNEY_HUB_ACCESS_ROLES,
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
    routeKey: "calendar",
    label: "Calendar",
    href: "/attorney/calendar",
    icon: Calendar,
    description: "Tasks and filing deadlines calendar",
    roles: ATTORNEY_TEAM,
  },
  {
    routeKey: "notes",
    label: "Case Notes",
    href: "/attorney/notes",
    icon: StickyNote,
    description: "Internal attorney case notes",
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
  {
    routeKey: "client_portal",
    label: "Client Portal",
    href: "/client-portal",
    icon: UserCircle,
    description: "Client-facing matter and invoice access",
    roles: ["client", "managing_partner", "firm_administrator"],
  },
];

export function getNavRoles(href: string): UserRole[] {
  const item = NAV_ITEMS.find((nav) => nav.href === href);
  return item?.roles ?? [];
}

/**
 * Role-aware nav: attorneys get "My Dashboard" instead of firm dashboard;
 * duplicate Attorney Hub link is hidden for attorney/paralegal.
 */
export function getNavItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles && canAccessNavItem(role, item.roles))
    .map((item) => {
      if (item.href === "/dashboard" && usesAttorneyHubAsHome(role)) {
        return {
          ...item,
          routeKey: "attorney_hub" as RouteKey,
          label: "My Dashboard",
          href: "/attorney/dashboard",
          description: "Your matters, time, tasks, and deadlines",
        };
      }
      if (
        item.href === "/attorney/dashboard" &&
        usesAttorneyHubAsHome(role)
      ) {
        return null;
      }
      if (item.href === "/dashboard" && role === "client") {
        return {
          ...item,
          routeKey: "client_portal" as RouteKey,
          label: "My Portal",
          href: "/client-portal",
          description: "Your matters and invoices",
        };
      }
      return item;
    })
    .filter((item): item is NavItem => item !== null);
}
