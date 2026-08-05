import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Briefcase,
  Calculator,
  Calendar,
  Clock,
  FileText,
  LayoutDashboard,
  ListTodo,
  Receipt,
  StickyNote,
  Users,
  UserCircle,
} from "lucide-react";
import type { UserRole } from "@/lib/types";
import { canAccessNavItem } from "@/lib/auth/demo-access";
import {
  ATTORNEY_HUB_ACCESS_ROLES,
  usesAttorneyHubAsHome,
} from "@/lib/auth/role-routes";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  /** Demo roles that can see this nav item */
  roles: UserRole[];
}

const ALL_ROLES: UserRole[] = [
  "managing_partner",
  "attorney",
  "paralegal",
  "billing_specialist",
  "firm_administrator",
  "client",
];

const STAFF: UserRole[] = ALL_ROLES.filter((r) => r !== "client");
const ATTORNEY_TEAM: UserRole[] = ["managing_partner", "attorney", "paralegal"];
const BILLING_TEAM: UserRole[] = [
  "managing_partner",
  "billing_specialist",
  "firm_administrator",
];

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Firm overview and key metrics",
    roles: ALL_ROLES,
  },
  {
    label: "Clients",
    href: "/clients",
    icon: Users,
    description: "Client records and relationships",
    roles: STAFF,
  },
  {
    label: "Matters",
    href: "/matters",
    icon: Briefcase,
    description: "Legal matters and engagements",
    roles: STAFF,
  },
  {
    label: "Attorney Hub",
    href: "/attorney/dashboard",
    icon: Briefcase,
    description: "Assigned matters, time entries, and tasks",
    roles: ATTORNEY_HUB_ACCESS_ROLES,
  },
  {
    label: "Time & Expenses",
    href: "/attorney/time",
    icon: Clock,
    description: "Attorney time and billable expenses",
    roles: [...ATTORNEY_TEAM, "billing_specialist"],
  },
  {
    label: "Tasks & Deadlines",
    href: "/attorney/tasks",
    icon: ListTodo,
    description: "Matter tasks and deadline tracking",
    roles: ATTORNEY_TEAM,
  },
  {
    label: "Calendar",
    href: "/attorney/calendar",
    icon: Calendar,
    description: "Tasks and filing deadlines calendar",
    roles: ATTORNEY_TEAM,
  },
  {
    label: "Case Notes",
    href: "/attorney/notes",
    icon: StickyNote,
    description: "Internal attorney case notes",
    roles: ATTORNEY_TEAM,
  },
  {
    label: "Billing",
    href: "/billing",
    icon: Receipt,
    description: "Billing workflows and rate management",
    roles: BILLING_TEAM,
  },
  {
    label: "Invoices & Collections",
    href: "/invoices",
    icon: FileText,
    description: "Invoice generation and collections",
    roles: BILLING_TEAM,
  },
  {
    label: "Accounting",
    href: "/accounting",
    icon: Calculator,
    description: "Accounting controls and trust accounting",
    roles: BILLING_TEAM,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    description: "Profitability and operational reports",
    roles: BILLING_TEAM,
  },
  {
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
  return NAV_ITEMS.filter((item) => canAccessNavItem(role, item.roles))
    .map((item) => {
      if (item.href === "/dashboard" && usesAttorneyHubAsHome(role)) {
        return {
          ...item,
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
          label: "My Portal",
          href: "/client-portal",
          description: "Your matters and invoices",
        };
      }
      return item;
    })
    .filter((item): item is NavItem => item !== null);
}
