import { NAV_ITEMS, type NavItem, type RouteKey } from "@/lib/navigation";
import type { UserRole } from "@/lib/types";
import { USER_ROLE_LABELS } from "@/lib/types";
import type { Permission } from "./permissions";

export const DEFAULT_DEMO_ROLE: UserRole = "managing_partner";

export const DEMO_IDENTITIES: Record<
  UserRole,
  { fullName: string; initials: string }
> = {
  managing_partner: { fullName: "Morgan Counsel", initials: "MC" },
  attorney: { fullName: "Avery Counsel", initials: "AC" },
  paralegal: { fullName: "Parker Legal", initials: "PL" },
  billing_specialist: { fullName: "Bailey Ledger", initials: "BL" },
  accounting_manager: { fullName: "Alex Morgan", initials: "AM" },
  firm_administrator: { fullName: "Jordan Admin", initials: "JA" },
  client: { fullName: "Cameron Client", initials: "CC" },
};

export interface RoleDefinition {
  displayName: string;
  defaultRoute: string;
  allowedRoutes: RouteKey[];
  dashboardTitle: string;
  dashboardDescription: string;
  permissions: Permission[];
}

const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  managing_partner: {
    displayName: USER_ROLE_LABELS.managing_partner,
    defaultRoute: "/dashboard",
    allowedRoutes: [
      "dashboard",
      "clients",
      "matters",
      "time",
      "tasks",
      "billing",
      "invoices",
      "accounting",
      "reports",
    ],
    dashboardTitle: "Managing Partner Dashboard",
    dashboardDescription:
      "Firm-wide revenue, collections, and profitability at a glance.",
    permissions: [
      "view_firm_dashboard",
      "manage_clients",
      "manage_matters",
      "approve_time",
      "manage_tasks",
      "create_invoices",
      "manage_collections",
      "view_accounting",
      "view_firm_reports",
      "view_profitability",
      "view_accounts_receivable",
    ],
  },
  attorney: {
    displayName: USER_ROLE_LABELS.attorney,
    defaultRoute: "/dashboard",
    allowedRoutes: [
      "dashboard",
      "clients",
      "matters",
      "time",
      "tasks",
      "invoices",
    ],
    dashboardTitle: "Attorney Dashboard",
    dashboardDescription:
      "Your assigned matters, deadlines, and unbilled time for the week.",
    permissions: [
      "view_assigned_matters",
      "view_own_matters",
      "enter_time",
      "manage_tasks",
      "create_invoices",
    ],
  },
  paralegal: {
    displayName: USER_ROLE_LABELS.paralegal,
    defaultRoute: "/dashboard",
    allowedRoutes: ["dashboard", "matters", "time", "tasks"],
    dashboardTitle: "Paralegal Dashboard",
    dashboardDescription:
      "Assigned tasks, matter deadlines, and document workflows.",
    permissions: [
      "view_assigned_matters",
      "enter_time",
      "manage_tasks",
    ],
  },
  billing_specialist: {
    displayName: USER_ROLE_LABELS.billing_specialist,
    defaultRoute: "/dashboard",
    allowedRoutes: [
      "dashboard",
      "clients",
      "matters",
      "time",
      "billing",
      "invoices",
      "reports",
    ],
    dashboardTitle: "Billing Operations Dashboard",
    dashboardDescription:
      "Billing queues, invoice status, and accounts receivable aging.",
    permissions: [
      "manage_clients",
      "manage_matters",
      "approve_time",
      "create_invoices",
      "manage_collections",
      "view_accounts_receivable",
      "view_firm_reports",
    ],
  },
  accounting_manager: {
    displayName: USER_ROLE_LABELS.accounting_manager,
    defaultRoute: "/accounting",
    allowedRoutes: [
      "dashboard",
      "clients",
      "matters",
      "billing",
      "invoices",
      "accounting",
      "reports",
    ],
    dashboardTitle: "Accounting Manager Workspace",
    dashboardDescription:
      "Trust accounting, revenue recognition, reconciliation, and financial controls.",
    permissions: [
      "view_accounting_dashboard",
      "view_accounting",
      "manage_accounting",
      "view_trust_balances",
      "manage_trust_activity",
      "view_revenue_recognition",
      "manage_write_downs",
      "manage_write_offs",
      "view_accounts_receivable",
      "reconcile_payments",
      "view_profitability",
      "view_audit_log",
      "view_firm_reports",
      "manage_collections",
    ],
  },
  firm_administrator: {
    displayName: USER_ROLE_LABELS.firm_administrator,
    defaultRoute: "/dashboard",
    allowedRoutes: [
      "dashboard",
      "clients",
      "matters",
      "tasks",
      "reports",
    ],
    dashboardTitle: "Firm Administration Dashboard",
    dashboardDescription:
      "Operational oversight across clients, staff, and firm settings.",
    permissions: [
      "manage_clients",
      "manage_matters",
      "manage_tasks",
      "manage_staff",
      "view_firm_reports",
    ],
  },
  client: {
    displayName: USER_ROLE_LABELS.client,
    defaultRoute: "/client-portal",
    allowedRoutes: ["client_portal"],
    dashboardTitle: "Client Portal",
    dashboardDescription:
      "Your matters, invoices, and trust balance summary.",
    permissions: ["access_client_portal", "view_own_matters"],
  },
};

export function getRoleDefinition(role: UserRole): RoleDefinition {
  return ROLE_DEFINITIONS[role];
}

export function getDefaultRouteForRole(role: UserRole): string {
  return ROLE_DEFINITIONS[role].defaultRoute;
}

export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_DEFINITIONS[role].permissions;
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_DEFINITIONS[role].permissions.includes(permission);
}

export function pathnameToRouteKey(pathname: string): RouteKey | null {
  const match = NAV_ITEMS.find(
    (item) =>
      pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return match?.routeKey ?? null;
}

export function canAccessRoute(role: UserRole, pathname: string): boolean {
  const routeKey = pathnameToRouteKey(pathname);
  if (!routeKey) {
    return true;
  }
  return ROLE_DEFINITIONS[role].allowedRoutes.includes(routeKey);
}

export function getNavigationForRole(role: UserRole): NavItem[] {
  const allowed = new Set(ROLE_DEFINITIONS[role].allowedRoutes);
  return NAV_ITEMS.filter((item) => allowed.has(item.routeKey));
}

export function isValidDemoRole(value: string): value is UserRole {
  return value in ROLE_DEFINITIONS;
}
