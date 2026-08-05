"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { MetricCard } from "@/components/billing/MetricCard";
import { RevenueByAttorney } from "@/components/billing/RevenueByAttorney";
import { RevenueByClient } from "@/components/billing/RevenueByClient";
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
  subscribeInvoiceCatalog,
} from "@/lib/billing/invoice-management-store";
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

  const [period, setPeriod] = useState<BillingPeriodState>(() =>
    createDefaultBillingPeriod(),
  );

  // Live catalog (seed + browser-stored generated invoices).
  // Polls + events keep this in sync after Generate Invoice.
  const allInvoices = useSyncExternalStore(
    subscribeInvoiceCatalog,
    getManagedInvoicesSnapshot,
    getServerInvoicesSnapshot,
  );

  // Re-resolve non-custom presets each time catalog refreshes so ranges stay current
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
    <div className="dashboard">
      <header className="dashboard__hero">
        <div className="dashboard__brand-block">
          <p className="dashboard__firm">North & Vale LLP</p>
          <h1 className="dashboard__title">Billing Dashboard</h1>
          <p className="dashboard__lede">
            Firm-wide receivables, collections, and revenue attribution for{" "}
            {periodLabel}.
          </p>
        </div>
        <div className="dashboard__actions">
          <Link
            href={BILLING_ROUTES.generateInvoice}
            className="dashboard__create-btn"
          >
            Create Invoice
          </Link>
          <p className="dashboard__source" role="status">
            Data source:{" "}
            <span>
              {source === "supabase" ? "Supabase" : "Placeholder (demo)"}
            </span>
          </p>
        </div>
      </header>

      <section
        className="billing-period"
        aria-labelledby="billing-period-heading"
      >
        <div className="billing-period__intro">
          <h2 id="billing-period-heading" className="billing-period__title">
            Billing Period
          </h2>
          <p className="billing-period__status" role="status">
            Showing {formatInteger(totalInvoices)} of{" "}
            {formatInteger(allInvoices.length)} invoices for {periodLabel}
            {outsidePeriodCount > 0
              ? ` (${formatInteger(outsidePeriodCount)} outside this period)`
              : ""}
          </p>
        </div>
        <div
          className="billing-period__presets"
          role="group"
          aria-label="Billing period quick filters"
        >
          {PERIOD_PRESET_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={
                period.preset === opt.id
                  ? "billing-period__chip billing-period__chip--active"
                  : "billing-period__chip"
              }
              aria-pressed={period.preset === opt.id}
              onClick={() => applyPreset(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {period.preset === "custom" ? (
          <div className="billing-period__custom">
            <label className="billing-period__date-field">
              <span>Start date</span>
              <input
                type="date"
                value={period.customStart}
                onChange={(e) =>
                  applyCustomRange(e.target.value, period.customEnd)
                }
              />
            </label>
            <label className="billing-period__date-field">
              <span>End date</span>
              <input
                type="date"
                value={period.customEnd}
                onChange={(e) =>
                  applyCustomRange(period.customStart, e.target.value)
                }
              />
            </label>
          </div>
        ) : null}
      </section>

      <section
        className="metrics-grid"
        aria-label="Key billing metrics"
      >
        <MetricCard
          eyebrow="Invoice Management"
          label="Total invoices"
          value={formatInteger(totalInvoices)}
          detail={
            outsidePeriodCount > 0
              ? `${formatInteger(allInvoices.length)} in full catalog`
              : undefined
          }
          actionLabel="View invoices"
          actionHref={BILLING_ROUTES.invoices}
          actionStyle="button"
        />
        <MetricCard
          eyebrow="Accounts Receivable Management"
          label="Total outstanding"
          value={formatCurrency(outstandingReceivable)}
          tone="attention"
          actionLabel="View Accounts"
          actionHref={BILLING_ROUTES.receivables}
          actionStyle="button"
        />
        <MetricCard
          eyebrow="Collections Management"
          label="Collections in period"
          value={formatCurrency(collectionsInPeriod)}
          tone="positive"
          actionLabel="View completed"
          actionHref={invoicesHref({ view: "completed" })}
          actionStyle="button"
        />
        <MetricCard
          eyebrow="Overdue Invoice Management"
          label="Total overdue"
          value={formatInteger(overdueInvoices)}
          tone={overdueInvoices > 0 ? "attention" : "default"}
          actionLabel="View Overdue"
          actionHref={receivablesHref({ view: "overdue" })}
          actionStyle="button"
        />
      </section>

      <div className="dashboard__columns">
        <RevenueByAttorney rows={revenueByAttorney} />
        <RevenueByClient rows={revenueByClient} />
      </div>
    </div>
  );
}
