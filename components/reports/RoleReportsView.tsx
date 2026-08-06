"use client";

import Link from "next/link";
import { BarChart3, FileDown, TrendingUp } from "lucide-react";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { RevenueByAttorneyReport } from "@/components/billing/RevenueByAttorneyReport";
import { RevenueByClientReport } from "@/components/billing/RevenueByClientReport";
import type { UserRole } from "@/lib/types";

const REPORT_LINKS: Record<
  Exclude<
    UserRole,
    | "accounting_manager"
    | "client"
    | "prospective_client"
    | "attorney"
    | "paralegal"
  >,
  { title: string; description: string; links: { label: string; href: string }[] }
> = {
  managing_partner: {
    title: "Firm Reports",
    description: "Executive profitability, collections, and attorney performance.",
    links: [
      { label: "Revenue by Attorney", href: "/billing/revenue/attorney" },
      { label: "Revenue by Client", href: "/billing/revenue/client" },
      { label: "Accounts Receivable", href: "/receivables" },
      { label: "Billing Dashboard", href: "/billing" },
    ],
  },
  billing_specialist: {
    title: "Billing & Collections Reports",
    description: "Operational billing, invoice status, and collection analytics.",
    links: [
      { label: "Invoice Management", href: "/invoices" },
      { label: "A/R Aging", href: "/receivables" },
      { label: "Revenue by Client", href: "/billing/revenue/client" },
      { label: "Generate Invoice", href: "/invoices/generate" },
    ],
  },
  firm_administrator: {
    title: "Operational Reports",
    description: "Firm-wide summaries for administration and oversight.",
    links: [
      { label: "Billing Overview", href: "/billing" },
      { label: "Invoice Status", href: "/invoices" },
      { label: "A/R Summary", href: "/receivables" },
      { label: "Admin Dashboard", href: "/admin" },
    ],
  },
};

export function RoleReportsView() {
  const { selectedRole } = useDemoRole();

  if (
    selectedRole === "accounting_manager" ||
    selectedRole === "client" ||
    selectedRole === "prospective_client" ||
    selectedRole === "attorney" ||
    selectedRole === "paralegal"
  ) {
    return null;
  }

  const config = REPORT_LINKS[selectedRole];

  return (
    <div className="space-y-6">
      <PageHeader title={config.title} description={config.description}>
        <Button variant="secondary" onClick={() => window.print()}>
          <FileDown className="mr-2 h-4 w-4" />
          Print Report
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {config.links.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <BarChart3 className="mb-2 h-5 w-5 text-navy-700" />
                <CardTitle className="text-base">{link.label}</CardTitle>
                <CardDescription>Open detailed report →</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {(selectedRole === "managing_partner" || selectedRole === "billing_specialist") && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Revenue by Attorney
              </CardTitle>
            </CardHeader>
            <RevenueByAttorneyReport />
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Client</CardTitle>
            </CardHeader>
            <RevenueByClientReport />
          </Card>
        </div>
      )}
    </div>
  );
}
