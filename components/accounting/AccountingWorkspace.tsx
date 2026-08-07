"use client";

import Link from "next/link";
import {
  BookOpen,
  FileSearch,
  Landmark,
  LineChart,
  PiggyBank,
  Receipt,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import type { Permission } from "@/lib/roles/permissions";
import { formatCurrency } from "@/lib/utils/cn";

interface AccountingSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  permission: Permission;
  href: string;
  metric?: string;
}

const ACCOUNTING_SECTIONS: AccountingSection[] = [
  {
    id: "overview",
    title: "Accounting Overview",
    description:
      "Firm-wide accounting snapshot including open period status, pending approvals, and control exceptions.",
    icon: <BookOpen className="h-5 w-5" />,
    permission: "view_accounting_dashboard",
    href: "/dashboard",
    metric: "Open period: August 2026",
  },
  {
    id: "trust",
    title: "Trust and Retainers",
    description:
      "Client trust balances, retainer activity, and IOLTA compliance monitoring.",
    icon: <Landmark className="h-5 w-5" />,
    permission: "view_trust_balances",
    href: "/accounting/trust",
    metric: `${formatCurrency(892400)} held in trust`,
  },
  {
    id: "ar",
    title: "Accounts Receivable",
    description:
      "Outstanding receivables, aging buckets, and collection follow-up queues.",
    icon: <Receipt className="h-5 w-5" />,
    permission: "view_accounts_receivable",
    href: "/receivables",
    metric: `${formatCurrency(428750)} outstanding`,
  },
  {
    id: "revenue",
    title: "Revenue Recognition",
    description:
      "Earned vs. billed revenue, WIP conversion, and period-close recognition rules.",
    icon: <PiggyBank className="h-5 w-5" />,
    permission: "view_revenue_recognition",
    href: "/accounting/revenue-ledger",
  },
  {
    id: "write-downs",
    title: "Write-downs and Write-offs",
    description:
      "Fee adjustments, discount approvals, and uncollectible balance treatment.",
    icon: <Scale className="h-5 w-5" />,
    permission: "manage_write_downs",
    href: "/receivables?section=write-offs",
  },
  {
    id: "profitability",
    title: "Matter Profitability",
    description:
      "Matter-level margin analysis, cost allocation, and partner profitability reporting.",
    icon: <LineChart className="h-5 w-5" />,
    permission: "view_profitability",
    href: "/dashboard/analytics",
  },
  {
    id: "reconciliation",
    title: "Reconciliation",
    description:
      "Bank, trust, and payment application reconciliation workflows.",
    icon: <FileSearch className="h-5 w-5" />,
    permission: "reconcile_payments",
    href: "/accounting/banking",
  },
  {
    id: "audit",
    title: "Audit and Controls",
    description:
      "Accounting control checkpoints, segregation of duties, and immutable audit logs.",
    icon: <ShieldCheck className="h-5 w-5" />,
    permission: "view_audit_log",
    href: "/accounting/audit-log",
  },
];

export function AccountingWorkspace() {
  const { hasPermission, selectedRole } = useDemoRole();
  const isOversight =
    selectedRole === "managing_partner" && hasPermission("view_accounting");
  const isFullAccess = hasPermission("manage_accounting");

  const visibleSections = ACCOUNTING_SECTIONS.filter((section) =>
    hasPermission(section.permission),
  );

  return (
    <>
      <PageHeader
        title="Accounting"
        description={
          isFullAccess
            ? "Trust accounting, revenue recognition, reconciliation, and financial controls."
            : "Accounting summaries and links for firm management."
        }
      />

      <Card className="mb-6 border-gold-500/30 bg-gradient-to-r from-navy-900 to-navy-800 text-white">
        <div className="p-6">
          <p className="text-sm font-medium text-gold-500">
            {isFullAccess
              ? "Accounting Manager Workspace"
              : "Accounting Oversight"}
          </p>
          <p className="mt-2 text-sm text-gray-200">
            {isFullAccess
              ? "Manage trust activity, reconcile payments, and monitor firm financial controls from this workspace."
              : isOversight
                ? "Open a section below for trust balances, receivables, and profitability reporting."
                : "You have limited access to this accounting workspace."}
          </p>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {visibleSections.map((section) => (
          <Link key={section.id} href={section.href} className="block">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-gold-500">
                    {section.icon}
                  </div>
                  <Badge variant="gold">Open module</Badge>
                </div>
                <CardTitle className="mt-3">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
                {section.metric && (
                  <p className="mt-2 text-sm font-medium text-navy-900">
                    {section.metric}
                  </p>
                )}
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {visibleSections.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No accounting sections available</CardTitle>
            <CardDescription>
              Your role does not include accounting workspace permissions.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </>
  );
}
