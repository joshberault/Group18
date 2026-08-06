import {
  BarChart3,
  Briefcase,
  Calculator,
  Calendar,
  CheckSquare,
  CircleDollarSign,
  Clock,
  FileText,
  Gauge,
  LayoutDashboard,
  ListTodo,
  Receipt,
  Shield,
  ShieldAlert,
  StickyNote,
  TrendingUp,
  UserCog,
  Users,
  UserCircle,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/lib/types";
import { canAccessNavItem } from "@/lib/auth/demo-access";
import {
  ATTORNEY_HUB_ACCESS_ROLES,
  usesAttorneyHubAsHome,
} from "@/lib/auth/role-routes";
import type { NavItem, RouteKey } from "@/lib/navigation/types";

export type { NavItem, RouteKey } from "@/lib/navigation/types";

const ALL_ROLES: UserRole[] = [
  "managing_partner",
  "attorney",
  "paralegal",
  "billing_specialist",
  "firm_administrator",
  "client",
  "prospective_client",
];

const STAFF: UserRole[] = ALL_ROLES.filter(
  (r) => r !== "client" && r !== "prospective_client",
);
const ATTORNEY_TEAM: UserRole[] = ["managing_partner", "attorney", "paralegal"];
const BILLING_TEAM: UserRole[] = [
  "managing_partner",
  "billing_specialist",
  "firm_administrator",
];

/**
 * Sidebar navigation with demo-role visibility.
 * Admin/Staff Information is Firm Administrator only (Person 5).
 * Accounting Manager uses lib/navigation/accounting-manager-nav.ts.
 * Prospective Client and Client use dedicated nav files via getNavigationForRole.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    routeKey: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Firm overview and key metrics",
    roles: [...STAFF, "prospective_client"],
  },
  {
    routeKey: "analytics",
    label: "Executive Analytics",
    href: "/dashboard/analytics",
    icon: TrendingUp,
    description: "Revenue, profitability, and collections KPIs",
    roles: ["managing_partner"],
  },
  {
    routeKey: "approvals",
    label: "Approval Queue",
    href: "/dashboard/approvals",
    icon: CheckSquare,
    description: "Pending time, expense, vacation, and staffing approvals",
    roles: ["managing_partner"],
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
    routeKey: "administration",
    label: "Admin/Staff Information",
    href: "/admin",
    icon: UserCog,
    description: "Employees, matters, assignments, workload, and roles",
    roles: ["firm_administrator"],
  },
  {
    routeKey: "attorney_hub",
    label: "Attorney Hub",
    href: "/attorney/dashboard",
    icon: Briefcase,
    description: "Assigned matters, time entries, and expenses",
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
    roles: ["managing_partner", "billing_specialist"],
  },
  {
    routeKey: "reports",
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    description: "Profitability and operational reports",
    roles: ["managing_partner"],
  },
  {
    routeKey: "risk_center",
    label: "Risk Center",
    href: "/risk-center",
    icon: ShieldAlert,
    description: "Financial risk alerts and exceptions",
    roles: ["managing_partner"],
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

/** Section links nested under Manager Dashboard in the Firm Admin sidebar. */
function getFirmAdminSectionChildren(): NavItem[] {
  const sections: Array<{
    label: string;
    href: string;
    icon: LucideIcon;
    description: string;
  }> = [
    {
      label: "Attorney Management",
      href: "/admin/attorneys",
      icon: Briefcase,
      description: "Attorney profiles and practice focus",
    },
    {
      label: "Employee Profiles",
      href: "/admin/employees",
      icon: Users,
      description: "Internal employee directory",
    },
    {
      label: "Assignments",
      href: "/admin/assignments",
      icon: Briefcase,
      description: "Matter and case staffing assignments",
    },
    {
      label: "Workload Board",
      href: "/admin/workload",
      icon: Gauge,
      description: "Capacity and internal workload",
    },
    {
      label: "Role Permissions",
      href: "/admin/roles",
      icon: Shield,
      description: "Admin role capability matrix",
    },
  ];

  return sections.map((item) => ({
    routeKey: "administration" as RouteKey,
    label: item.label,
    href: item.href,
    icon: item.icon,
    description: item.description,
    roles: ["firm_administrator" as UserRole],
  }));
}

/**
 * Role-aware nav: attorneys get "My Dashboard" instead of firm dashboard;
 * firm administrators get "Manager Dashboard" (/admin) with nested section links;
 * duplicate Attorney Hub / Admin links are hidden when remapped to the home tab.
 */
export function getNavItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => canAccessNavItem(role, item.roles ?? []))
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
      if (item.href === "/attorney/dashboard" && usesAttorneyHubAsHome(role)) {
        return null;
      }
      if (item.href === "/dashboard" && role === "firm_administrator") {
        return {
          ...item,
          routeKey: "administration" as RouteKey,
          label: "Manager Dashboard",
          href: "/admin",
          icon: UserCog,
          description:
            "Staffing overview with section links for day-to-day admin work",
          children: getFirmAdminSectionChildren(),
        };
      }
      if (item.href === "/admin" && role === "firm_administrator") {
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
