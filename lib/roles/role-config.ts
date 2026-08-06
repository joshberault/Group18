import {
  ACCOUNTING_MANAGER_NAV_ITEMS,
  isAccountingManagerExclusivePath,
  isAccountingManagerRoute,
} from "@/lib/navigation/accounting-manager-nav";
import { CLIENT_NAV_ITEMS, isClientPortalRoute } from "@/lib/navigation/client-nav";
import { PROSPECTIVE_CLIENT_NAV_ITEMS } from "@/lib/navigation/prospective-client-nav";
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
  prospective_client: { fullName: "Casey Prospect", initials: "CP" },
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
      "approvals",
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
      "accounting",
      "reports",
      "analytics",
      "risk_center",
    ],
    dashboardTitle: "Managing Partner Dashboard",
    dashboardDescription:
      "Firm-wide revenue, collections, profitability, and approval queue.",
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
      "manage_clients",
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
    defaultRoute: "/admin",
    allowedRoutes: [
      "dashboard",
      "administration",
      "clients",
      "matters",
      "tasks",
      "reports",
    ],
    dashboardTitle: "Manager Dashboard",
    dashboardDescription:
      "Staff, matters, assignments, workload, and roles.",
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
    allowedRoutes: ["client_portal"],
    dashboardTitle: "Client Portal",
    dashboardDescription:
      "Your matters, invoices, and trust balance summary.",
    permissions: ["access_client_portal", "view_own_matters"],
  },
  prospective_client: {
    displayName: USER_ROLE_LABELS.prospective_client,
    defaultRoute: "/dashboard",
    allowedRoutes: ["dashboard"],
    dashboardTitle: "Consultation Request",
    dashboardDescription:
      "Tell us about your legal needs and request a consultation.",
    permissions: [],
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

function canAccessStandardRoute(role: UserRole, pathname: string): boolean {
  const matchingItem = NAV_ITEMS.find(
    (item) =>
      pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

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
  if (isClientPortalRoute(pathname)) {
    return role === "client" || role === "firm_administrator";
  }

  // Client demo uses portal tabs only — not the firm Dashboard.
  if (
    role === "client" &&
    (pathname === "/dashboard" || pathname.startsWith("/dashboard/"))
  ) {
    return false;
  }

  if (role === "accounting_manager") {
    return isAccountingManagerRoute(pathname);
  }

  // Prospective Client demo is Dashboard-only (consultation request form).
  if (role === "prospective_client") {
    return pathname === "/dashboard" || pathname === "/dashboard/";
  }

  // Approval Queue lives on the Managing Partner dashboard.
  if (
    pathname === "/dashboard/approvals" ||
    pathname.startsWith("/dashboard/approvals/")
  ) {
    return role === "managing_partner";
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

  return canAccessStandardRoute(role, pathname);
}

export function getNavigationForRole(role: UserRole): NavItem[] {
  if (role === "accounting_manager") {
    return ACCOUNTING_MANAGER_NAV_ITEMS;
  }

  if (role === "client") {
    return CLIENT_NAV_ITEMS;
  }

  if (role === "prospective_client") {
    return PROSPECTIVE_CLIENT_NAV_ITEMS;
  }

  return getNavItemsForRole(role);
}

export function isValidDemoRole(value: string): value is UserRole {
  return value in ROLE_DEFINITIONS;
}
