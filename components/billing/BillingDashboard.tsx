"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import {
  AlertTriangle,
  CircleDollarSign,
  FilePlus2,
  FileText,
  Wallet,
} from "lucide-react";
import { MetricCard } from "@/components/billing/MetricCard";
import { RevenueByAttorney } from "@/components/billing/RevenueByAttorney";
import { RevenueByClient } from "@/components/billing/RevenueByClient";
import { InvoiceStatusBadge } from "@/components/billing/invoice-status";
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
import {
  createDefaultBillingPeriod,
  formatPeriodLabel,
  PERIOD_PRESET_OPTIONS,
  resolvePeriodRange,
  type BillingPeriodPreset,
  type BillingPeriodState,
} from "@/lib/billing/billing-period";
import { computeDashboardMetricsForPeriod } from "@/lib/billing/dashboard-metrics";
import {
  getManagedInvoicesSnapshot,
  getServerInvoicesSnapshot,
  refreshInvoiceCatalog,
  subscribeInvoiceCatalog,
} from "@/lib/billing/invoice-management-store";
import { buildInvoiceStatusSummary } from "@/lib/billing/invoice-status-summary";
import {
  BILLING_ROUTES,
  invoicesHref,
  receivablesHref,
} from "@/lib/billing/routes";
import type { BillingDashboardData } from "@/lib/billing/types";

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

export function BillingDashboard({ data }: Props) {
  const { source } = data;
  const router = useRouter();

  const [period, setPeriod] = useState<BillingPeriodState>(() =>
    createDefaultBillingPeriod(),
  );

  // Subscribe re-fetches on mount/focus/poll; explicit refresh ensures first paint after DB load.
  useEffect(() => {
    void refreshInvoiceCatalog();
  }, []);

  const allInvoices = useSyncExternalStore(
    subscribeInvoiceCatalog,
    getManagedInvoicesSnapshot,
    getServerInvoicesSnapshot,
  );

  const statusSummary = useMemo(
    () => buildInvoiceStatusSummary(allInvoices),
    [allInvoices],
  );

  const activeRange = useMemo(() => {
    if (period.preset === "custom") return period.range;
    return resolvePeriodRange(period.preset);
  }, [period.preset, period.range.start, period.range.end, allInvoices]);

  const metrics = useMemo(
    () => computeDashboardMetricsForPeriod(allInvoices, activeRange),
    [allInvoices, activeRange.start, activeRange.end],
  );

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

  const periodLabel = useMemo(
    () => formatPeriodLabel(period.preset, activeRange),
    [period.preset, activeRange],
  );

  const outsidePeriodCount = Math.max(
    0,
    allInvoices.length - metrics.invoicesInPeriod.length,
  );

  function applyPreset(preset: BillingPeriodPreset) {
    if (preset === "custom") {
      setPeriod((prev) => ({
        ...prev,
        preset: "custom",
        range: resolvePeriodRange("custom", new Date(), {
          start: prev.customStart,
          end: prev.customEnd,
        }),
      }));
      return;
    }
    const range = resolvePeriodRange(preset);
    setPeriod({
      preset,
      range,
      customStart: range.start,
      customEnd: range.end,
    });
  }

  function applyCustomRange(start: string, end: string) {
    const range = resolvePeriodRange("custom", new Date(), { start, end });
    setPeriod({
      preset: "custom",
      range,
      customStart: start,
      customEnd: end,
    });
  }

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

      <Card className="mb-6 border-gold-500/30 bg-gradient-to-r from-navy-900 to-navy-800 text-white">
        <div className="p-6">
          <p className="text-sm font-medium text-gold-500">Billing period</p>
          <p className="mt-2 text-sm text-gray-200">
            Showing {formatInteger(totalInvoices)} of{" "}
            {formatInteger(allInvoices.length)} invoices for {periodLabel}
            {outsidePeriodCount > 0
              ? ` (${formatInteger(outsidePeriodCount)} outside this period)`
              : ""}
            . Metrics use the firm invoice catalog (Supabase
            {source === "supabase" ? "" : "; server handshake pending"}).
          </p>
          <div
            className="mt-4 flex flex-wrap gap-2"
            role="group"
            aria-label="Billing period quick filters"
          >
            {PERIOD_PRESET_OPTIONS.map((opt) => {
              const active = period.preset === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => applyPreset(opt.id)}
                  className={
                    active
                      ? "inline-flex h-9 items-center justify-center rounded-lg bg-gold-500 px-3 text-sm font-semibold text-navy-950 shadow-sm hover:bg-gold-400"
                      : "inline-flex h-9 items-center justify-center rounded-lg border border-white/40 bg-white px-3 text-sm font-semibold text-navy-900 shadow-sm hover:bg-gold-100"
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {period.preset === "custom" ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-200">
                Start date
                <input
                  type="date"
                  value={period.customStart}
                  onChange={(e) =>
                    applyCustomRange(e.target.value, period.customEnd)
                  }
                  className="h-10 rounded-lg border border-navy-700 bg-navy-950 px-3 text-sm text-white focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/30"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-200">
                End date
                <input
                  type="date"
                  value={period.customEnd}
                  onChange={(e) =>
                    applyCustomRange(period.customStart, e.target.value)
                  }
                  className="h-10 rounded-lg border border-navy-700 bg-navy-950 px-3 text-sm text-white focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/30"
                />
              </label>
            </div>
          ) : null}
        </div>
      </Card>

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
          actionLabel="View Invoices"
          actionHref={BILLING_ROUTES.invoices}
        />
        <MetricCard
          eyebrow="Receivables"
          label="Total outstanding"
          value={formatCurrency(outstandingReceivable)}
          tone="attention"
          icon={CircleDollarSign}
          actionLabel="View Accounts"
          actionHref={BILLING_ROUTES.receivables}
        />
        <MetricCard
          eyebrow="Collections"
          label="Collections in period"
          value={formatCurrency(collectionsInPeriod)}
          tone="positive"
          icon={Wallet}
          actionLabel="View completed"
          actionHref={invoicesHref({ view: "completed" })}
        />
        <MetricCard
          eyebrow="Overdue"
          label="Total overdue"
          value={formatInteger(overdueInvoices)}
          tone={overdueInvoices > 0 ? "attention" : "default"}
          icon={AlertTriangle}
          actionLabel="View Overdue"
          actionHref={receivablesHref({ view: "overdue" })}
        />
      </section>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <RevenueByAttorney rows={revenueByAttorney} linkMode="report" />
        <RevenueByClient rows={revenueByClient} linkMode="report" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Status Summary</CardTitle>
          <CardDescription>
            Counts and amounts from firm invoices in Supabase — click a row to
            open that status in Invoice Management
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
    </div>
  );
}
