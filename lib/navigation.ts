import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Briefcase,
  Calculator,
  FileText,
  LayoutDashboard,
  Receipt,
  UserCog,
  Users,
  UserCircle,
} from "lucide-react";
import type { UserRole } from "@/lib/types";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  /** When set, item only appears for these demo roles. */
  roles?: UserRole[];
}

/**
 * Sidebar for feature/admin (Person 5).
 * Admin/Staff Information is demo-gated to Firm Administrator.
 * Matter tracking lives under Admin → Matters.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Firm overview and key metrics",
  },
  {
    label: "Clients",
    href: "/clients",
    icon: Users,
    description: "Client records and relationships",
  },
  {
    label: "Admin/Staff Information",
    href: "/admin",
    icon: UserCog,
    description:
      "Employees, matters, assignments, approvals, workload, and roles",
    roles: ["firm_administrator"],
  },
  {
    label: "Attorney Hub",
    href: "/attorney/dashboard",
    icon: Briefcase,
    description: "Attorney workspace for assigned matters",
  },
  {
    label: "Billing",
    href: "/billing",
    icon: Receipt,
    description: "Billing workflows and rate management",
  },
  {
    label: "Invoices & Collections",
    href: "/invoices",
    icon: FileText,
    description: "Invoice generation and collections",
  },
  {
    label: "Accounting",
    href: "/accounting",
    icon: Calculator,
    description: "Accounting controls and trust accounting",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    description: "Profitability and operational reports",
  },
  {
    label: "Client Portal",
    href: "/client-portal",
    icon: UserCircle,
    description: "Client-facing matter and invoice access",
  },
];
