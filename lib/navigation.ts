import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Briefcase,
  Calculator,
  Clock,
  FileText,
  LayoutDashboard,
  ListTodo,
  Receipt,
  Users,
  UserCircle,
} from "lucide-react";

export type RouteKey =
  | "dashboard"
  | "clients"
  | "matters"
  | "time"
  | "tasks"
  | "billing"
  | "invoices"
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
}

/**
 * Single source of truth for sidebar navigation items.
 * Teammates: add new modules here, then register the routeKey in lib/roles/role-config.ts.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    routeKey: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Firm overview and key metrics",
  },
  {
    routeKey: "clients",
    label: "Clients",
    href: "/clients",
    icon: Users,
    description: "Client records and relationships",
  },
  {
    routeKey: "matters",
    label: "Matters",
    href: "/matters",
    icon: Briefcase,
    description: "Legal matters and engagements",
  },
  {
    routeKey: "time",
    label: "Time & Expenses",
    href: "/time",
    icon: Clock,
    description: "Attorney time and billable expenses",
  },
  {
    routeKey: "tasks",
    label: "Tasks & Deadlines",
    href: "/tasks",
    icon: ListTodo,
    description: "Matter tasks and deadline tracking",
  },
  {
    routeKey: "billing",
    label: "Billing",
    href: "/billing",
    icon: Receipt,
    description: "Billing workflows and rate management",
  },
  {
    routeKey: "invoices",
    label: "Invoices & Collections",
    href: "/invoices",
    icon: FileText,
    description: "Invoice generation and collections",
  },
  {
    routeKey: "accounting",
    label: "Accounting",
    href: "/accounting",
    icon: Calculator,
    description: "Accounting controls and trust accounting",
  },
  {
    routeKey: "reports",
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    description: "Profitability and operational reports",
  },
  {
    routeKey: "client_portal",
    label: "Client Portal",
    href: "/client-portal",
    icon: UserCircle,
    description: "Client-facing matter and invoice access",
  },
];
