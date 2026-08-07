"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type KeyboardEvent } from "react";
import {
  AlertTriangle,
  CircleDollarSign,
  FilePlus2,
  FileText,
  Wallet,
} from "lucide-react";
import { BillingPeriodToolbar } from "@/components/billing/BillingPeriodToolbar";
import { MetricCard } from "@/components/billing/MetricCard";
import { RevenueByAttorney } from "@/components/billing/RevenueByAttorney";
import { RevenueByClient } from "@/components/billing/RevenueByClient";
import { InvoiceStatusBadge } from "@/components/billing/invoice-status";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { useBillingPeriodMetrics } from "@/lib/billing/use-billing-period-metrics";
import {
  BILLING_ROUTES,
  invoicesHref,
  receivablesHref,
} from "@/lib/billing/routes";
import type { BillingDashboardData } from "@/lib/billing/types";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";

type Props = {
  data: BillingDashboardData;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function BillingDashboard({ data }: Props) {
  const { source } = data;
  const router = useRouter();
  const { selectedRole } = useDemoRole();
  const isManagingPartner = selectedRole === "managing_partner";

  const {
    period,
    applyPreset,
    applyCustomRange,
    periodLabel,
    allInvoices,
    invoicesInPeriod,
    metrics,
    statusSummary,
    outsidePeriodCount,
    emptyPeriod,
  } = useBillingPeriodMetrics();

  const {
    summary: {
      totalInvoices,
      outstandingReceivable,
      collectionsThisMonth: collectionsInPeriod,
      overdueInvoices,
    },
    revenueByAttorney,
    revenueByClient,
  } = metrics;

  return (
    <div>
      <PageHeader
        title="Billing Dashboard"
        description={`Receivables, collections, and revenue for ${periodLabel}.`}
      >
        <Link
          href={BILLING_ROUTES.generateInvoice}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 text-sm font-medium text-white transition-colors hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-900 focus-visible:ring-offset-2"
        >
          <FilePlus2 className="h-4 w-4" />
          Create Invoice
        </Link>
      </PageHeader>

      <BillingPeriodToolbar
        className="mb-6"
        variant="hero"
        period={period}
        periodLabel={periodLabel}
        invoiceCountInPeriod={totalInvoices}
        invoiceCountAll={allInvoices.length}
        outsidePeriodCount={outsidePeriodCount}
        onApplyPreset={applyPreset}
        onApplyCustomRange={applyCustomRange}
        footnote={`Metrics use invoices issued in the selected period (Supabase${source === "supabase" ? "" : "; server handshake pending"}).`}
      />

      <section
        className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Key billing metrics"
      >
        <MetricCard
          eyebrow="Invoices"
          label="Total invoices"
          value={formatInteger(totalInvoices)}
          detail={
            outsidePeriodCount > 0
              ? `${formatInteger(allInvoices.length)} in full catalog`
              : undefined
          }
          icon={FileText}
          actionLabel={isManagingPartner ? undefined : "View Invoices"}
          actionHref={isManagingPartner ? undefined : BILLING_ROUTES.invoices}
        />
        <MetricCard
          eyebrow="Receivables"
          label="Total outstanding"
          value={formatCurrency(outstandingReceivable)}
          detail="Open A/R in period"
          tone="attention"
          icon={CircleDollarSign}
          actionLabel={isManagingPartner ? undefined : "View Accounts"}
          actionHref={isManagingPartner ? undefined : BILLING_ROUTES.receivables}
        />
        <MetricCard
          eyebrow="Collections"
          label="Collections in period"
          value={formatCurrency(collectionsInPeriod)}
          tone="positive"
          icon={Wallet}
          actionLabel={isManagingPartner ? undefined : "View completed"}
          actionHref={
            isManagingPartner ? undefined : invoicesHref({ view: "completed" })
          }
        />
        <MetricCard
          eyebrow="Overdue"
          label="Total overdue"
          value={formatInteger(overdueInvoices)}
          detail="Overdue among period invoices"
          tone={overdueInvoices > 0 ? "attention" : "default"}
          icon={AlertTriangle}
          actionLabel={isManagingPartner ? undefined : "View Overdue"}
          actionHref={
            isManagingPartner ? undefined : receivablesHref({ view: "overdue" })
          }
        />
      </section>

      {emptyPeriod ? (
        <EmptyState
          className="mb-6"
          title="No invoices found for the selected billing period."
          description="Try All Time or another range to see firm invoices from the catalog."
        />
      ) : (
        <>
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <RevenueByAttorney rows={revenueByAttorney} linkMode="report" />
            <RevenueByClient rows={revenueByClient} linkMode="report" />
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Invoices in period</CardTitle>
              <CardDescription>
                Issued {periodLabel} — {formatInteger(invoicesInPeriod.length)}{" "}
                invoice{invoicesInPeriod.length === 1 ? "" : "s"}
              </CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoicesInPeriod.map((inv) => (
                  <TableRow
                    key={inv.id}
                    className="cursor-pointer transition-colors hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy-900"
                    tabIndex={0}
                    role="link"
                    aria-label={`Open invoice ${inv.invoiceNumber}`}
                    onClick={() =>
                      router.push(
                        invoicesHref({ highlight: inv.invoiceNumber }),
                      )
                    }
                    onKeyDown={(e: KeyboardEvent<HTMLTableRowElement>) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(
                          invoicesHref({ highlight: inv.invoiceNumber }),
                        );
                      }
                    }}
                  >
                    <TableCell className="font-medium">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell>{inv.client}</TableCell>
                    <TableCell>{formatDate(inv.invoiceDate)}</TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={inv.status} />
                    </TableCell>
                    <TableCell>{formatCurrency(inv.totalAmount)}</TableCell>
                    <TableCell>
                      {formatCurrency(inv.remainingBalance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice Status Summary</CardTitle>
              <CardDescription>
                Counts and amounts from invoices issued in {periodLabel} — click
                a row to open that status in Invoice Management
              </CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statusSummary.map((row) => (
                  <TableRow
                    key={row.key}
                    className="cursor-pointer transition-colors hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy-900"
                    tabIndex={0}
                    role="link"
                    aria-label={`View ${row.label} invoices in Invoice Management`}
                    onClick={() => router.push(row.href)}
                    onKeyDown={(e: KeyboardEvent<HTMLTableRowElement>) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(row.href);
                      }
                    }}
                  >
                    <TableCell>
                      <InvoiceStatusBadge status={row.label} />
                    </TableCell>
                    <TableCell>{formatInteger(row.count)}</TableCell>
                    <TableCell>{formatCurrency(row.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
