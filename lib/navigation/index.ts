import {
  BarChart3,
  Briefcase,
  Calculator,
  Calendar,
  CircleDollarSign,
  Clock,
  FileText,
  FolderKanban,
  Gauge,
  Gavel,
  IdCard,
  LayoutDashboard,
  ListTodo,
  Receipt,
  Scale,
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
    icon: Gavel,
    description: "Assigned matters, time entries, and expenses",
    roles: ATTORNEY_HUB_ACCESS_ROLES,
  },
  {
    routeKey: "time",
    label: "Time & Expenses",
    href: "/attorney/time",
    icon: Clock,
    description: "Attorney time and billable expenses",
    // Managing Partner excluded — hardened on main.
    roles: ["attorney", "paralegal", "billing_specialist"],
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
    roles: ["managing_partner"],
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
    // Staff demos (Managing Partner, Firm Administrator) excluded.
    roles: ["client"],
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
      icon: Scale,
      description: "Attorney profiles and practice focus",
    },
    {
      label: "Employee Profiles",
      href: "/admin/employees",
      icon: IdCard,
      description: "Internal employee directory",
    },
    {
      label: "Assignments",
      href: "/admin/assignments",
      icon: FolderKanban,
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
 * Billing Specialist: Dashboard → Billing Dashboard at /billing; hide separate Billing.
 * Managing Partner: hide Time, Client Portal, Attorney Hub, Calendar, Notes, Reports, Risk.
 * Paralegal: hide Calendar (merged into Tasks & Deadlines).
 * (Final role filters also live in getNavigationForRole.)
 * Firm Administrator: never show Client Portal.
 */
export function getNavItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => canAccessNavItem(role, item.roles ?? []))
    .map((item) => {
      if (
        role === "managing_partner" &&
        (item.routeKey === "time" ||
          item.routeKey === "client_portal" ||
          item.routeKey === "attorney_hub" ||
          item.routeKey === "calendar" ||
          item.routeKey === "notes" ||
          item.routeKey === "reports" ||
          item.routeKey === "risk_center" ||
          item.href === "/attorney/time" ||
          item.href === "/attorney/dashboard" ||
          item.href === "/attorney/calendar" ||
          item.href === "/attorney/notes" ||
          item.href === "/reports" ||
          item.href === "/risk-center" ||
          item.href.startsWith("/client-portal"))
      ) {
        return null;
      }
      if (
        role === "paralegal" &&
        (item.routeKey === "calendar" || item.href === "/attorney/calendar")
      ) {
        return null;
      }
      if (
        role === "firm_administrator" &&
        (item.routeKey === "client_portal" ||
          item.href.startsWith("/client-portal"))
      ) {
        return null;
      }
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
      // Billing Specialist operational home is the Billing module (not firm Dashboard).
      if (role === "billing_specialist" && item.href === "/dashboard") {
        return {
          ...item,
          routeKey: "billing" as RouteKey,
          label: "Billing Dashboard",
          href: "/billing",
          description: "Billing workflows and rate management",
        };
      }
      // Remove duplicate "Billing" once Dashboard is the billing entry point.
      if (role === "billing_specialist" && item.href === "/billing") {
        return null;
      }
      return item;
    })
    .filter((item): item is NavItem => item !== null);
}
