import {
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  CircleDollarSign,
  ClipboardList,
  Landmark,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import type { NavItem } from "@/lib/navigation";

/**
 * Sidebar navigation used ONLY when the demo role is Accounting Manager.
 * Other roles use NAV_ITEMS from lib/navigation.ts — do not merge these arrays.
 */
export const ACCOUNTING_MANAGER_NAV_ITEMS: NavItem[] = [
  {
    routeKey: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description:
      "Accounting KPIs, alerts, action items, deadlines, and reconciliation status",
  },
  {
    routeKey: "clients",
    label: "Clients",
    href: "/clients",
    icon: Users,
    description:
      "Client financial information, receivables, trust balances, and billing preferences",
  },
  {
    routeKey: "matters",
    label: "Matters",
    href: "/matters",
    icon: Briefcase,
    description:
      "Matter financial view including WIP, expenses, trust balance, and profitability",
  },
  {
    routeKey: "billing",
    label: "Billing",
    href: "/billing",
    icon: Receipt,
    description:
      "Draft bills, prebills, attorney approval, and batch billing workflows",
  },
  {
    routeKey: "invoices",
    label: "Invoices & Collections",
    href: "/invoices",
    icon: Receipt,
    description:
      "Invoice management, generation, status filters, and invoice detail",
  },
  {
    routeKey: "receivables",
    label: "Accounts Receivable",
    href: "/receivables",
    icon: CircleDollarSign,
    description:
      "Outstanding invoices, aging, collections, payments, and write-offs",
  },
  {
    routeKey: "trust_accounting",
    label: "Trust Accounting",
    href: "/accounting/trust",
    icon: Landmark,
    description:
      "Client trust balances, IOLTA accounts, trust ledgers, and reconciliation",
  },
  {
    routeKey: "revenue_ledger",
    label: "Revenue & General Ledger",
    href: "/accounting/revenue-ledger",
    icon: BookOpen,
    description:
      "Journal entries, revenue recognition, chart of accounts, and month-end close",
  },
  {
    routeKey: "banking",
    label: "Banking",
    href: "/accounting/banking",
    icon: Building2,
    description:
      "Bank accounts, feeds, reconciliations, ACH, wires, and check register",
  },
  {
    routeKey: "accounts_payable",
    label: "Expenses & Accounts Payable",
    href: "/accounting/accounts-payable",
    icon: Wallet,
    description:
      "Vendor bills, reimbursements, matter expenses, and payment approvals",
  },
  {
    routeKey: "reports",
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    description:
      "Financial and operational reports including P&L, balance sheet, and WIP",
  },
  {
    routeKey: "audit_log",
    label: "Audit Log",
    href: "/accounting/audit-log",
    icon: ClipboardList,
    description:
      "Financial record changes with timestamps and before-and-after values",
  },
  {
    routeKey: "administration",
    label: "Administration",
    href: "/accounting/administration",
    icon: Settings,
    description:
      "Roles, billing rates, tax settings, accounting periods, and integrations",
  },
];

export const ACCOUNTING_MANAGER_EXCLUSIVE_PATHS = [
  "/accounting/trust",
  "/accounting/revenue-ledger",
  "/accounting/banking",
  "/accounting/accounts-payable",
  "/accounting/audit-log",
  "/accounting/administration",
] as const;

export function isAccountingManagerExclusivePath(pathname: string): boolean {
  return ACCOUNTING_MANAGER_EXCLUSIVE_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function isAccountingManagerRoute(pathname: string): boolean {
  return (
    ACCOUNTING_MANAGER_NAV_ITEMS.some(
      (item) =>
        pathname === item.href || pathname.startsWith(`${item.href}/`),
    ) || pathname === "/accounting"
  );
}
