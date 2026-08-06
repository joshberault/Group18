import {
  ACCOUNTING_MANAGER_NAV_ITEMS,
  isAccountingManagerExclusivePath,
  isAccountingManagerRoute,
} from "@/lib/navigation/accounting-manager-nav";
import {
  CLIENT_NAV_ITEMS,
  isClientPortalRoute,
} from "@/lib/navigation/client-nav";
import { NAV_ITEMS, getNavItemsForRole, type NavItem, type RouteKey } from "@/lib/navigation";
import type { UserRole } from "@/lib/types";
import { USER_ROLE_LABELS } from "@/lib/types";
import type { Permission } from "./permissions";

/** Default demo role on main — use header dropdown to switch to Accounting Manager */
export const DEFAULT_DEMO_ROLE: UserRole = "managing_partner";

export const DEMO_ROLE_STORAGE_KEY = "counselflow-demo-role-v2";

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
      "attorney_hub",
      "time",
      "tasks",
      "calendar",
      "notes",
      "billing",
      "invoices",
      "receivables",
      "reports",
      "client_portal",
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
    defaultRoute: "/attorney/dashboard",
    allowedRoutes: [
      "attorney_hub",
      "clients",
      "matters",
      "time",
      "tasks",
      "calendar",
      "notes",
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
    allowedRoutes: [
      "dashboard",
      "attorney_hub",
      "clients",
      "matters",
      "time",
      "tasks",
      "calendar",
      "notes",
    ],
    dashboardTitle: "Paralegal Dashboard",
    dashboardDescription:
      "Manage assigned tasks, upcoming deadlines, attorney reviews, and time-entry responsibilities.",
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
      "receivables",
      "reports",
      "trust_accounting",
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
    defaultRoute: "/dashboard",
    allowedRoutes: [
      "dashboard",
      "clients",
      "matters",
      "billing",
      "invoices",
      "receivables",
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
      "admin",
      "billing",
      "invoices",
      "receivables",
      "accounting",
      "reports",
      "client_portal",
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
    defaultRoute: "/client-portal/account-summary",
    allowedRoutes: ["dashboard", "client_portal"],
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
  const match = NAV_ITEMS.filter(
    (item) =>
      pathname === item.href || pathname.startsWith(`${item.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0];
  return match?.routeKey ?? null;
}

function canAccessStandardRoute(role: UserRole, pathname: string): boolean {
  // Portal hub + feature pages: clients use sidebar tabs; staff still open
  // features from the Client Portal hub card grid.
  if (pathname === "/client-portal" || pathname.startsWith("/client-portal/")) {
    return (
      role === "client" ||
      role === "managing_partner" ||
      role === "firm_administrator"
    );
  }

  // Prefer the longest matching href when several NAV_ITEMS could match.
  const matchingItem = NAV_ITEMS.filter(
    (item) =>
      pathname === item.href || pathname.startsWith(`${item.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0];

  if (matchingItem) {
    return matchingItem.roles?.includes(role) ?? false;
  }

  if (pathname.startsWith("/admin")) {
    return role === "firm_administrator";
  }

  if (pathname.startsWith("/attorney")) {
    return ["managing_partner", "attorney", "paralegal", "billing_specialist"].includes(role);
  }

  if (pathname === "/accounting" || pathname.startsWith("/accounting/")) {
    const accountingItem = NAV_ITEMS.find((item) => item.routeKey === "accounting");
    return accountingItem?.roles?.includes(role) ?? false;
  }

  return true;
}

export function canAccessRoute(role: UserRole, pathname: string): boolean {
  if (role === "accounting_manager") {
    return isAccountingManagerRoute(pathname);
  }

  if (role === "client") {
    return (
      pathname === "/dashboard" ||
      isClientPortalRoute(pathname)
    );
  }

  // Billing Specialist may open Client Trust Accounts from the firm Dashboard KPI.
  if (
    role === "billing_specialist" &&
    (pathname === "/accounting/trust" ||
      pathname.startsWith("/accounting/trust/"))
  ) {
    return true;
  }

  if (isAccountingManagerExclusivePath(pathname)) {
    return false;
  }

  // Firm administrator accounting summary only — not AM-exclusive sub-routes.
  if (role === "firm_administrator" && pathname.startsWith("/accounting/")) {
    return pathname === "/accounting/trust";
  }

  return canAccessStandardRoute(role, pathname);
}

export function getNavigationForRole(role: UserRole): NavItem[] {
  if (role === "accounting_manager") {
    return ACCOUNTING_MANAGER_NAV_ITEMS;
  }

  if (role === "client") {
    return CLIENT_NAV_ITEMS;
  }

  return getNavItemsForRole(role);
}

export function isValidDemoRole(value: string): value is UserRole {
  return value in ROLE_DEFINITIONS;
}
