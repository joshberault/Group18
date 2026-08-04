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

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

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
    label: "Matters",
    href: "/matters",
    icon: Briefcase,
    description: "Legal matters and engagements",
  },
  {
    label: "Attorney Hub",
    href: "/attorney/dashboard",
    icon: Briefcase,
    description: "Assigned matters, time entries, and expenses",
  },
  {
    label: "Time & Expenses",
    href: "/attorney/time",
    icon: Clock,
    description: "Attorney time and billable expenses",
  },
  {
    label: "Tasks & Deadlines",
    href: "/attorney/tasks",
    icon: ListTodo,
    description: "Matter tasks and deadline tracking",
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
