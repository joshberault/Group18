"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  createDefaultBillingPeriod,
  formatPeriodLabel,
  resolvePeriodRange,
  type BillingPeriodPreset,
  type BillingPeriodState,
  type DateRange,
} from "@/lib/billing/billing-period";
import {
  buildPeriodInvoiceStatusSummary,
  computeDashboardMetricsForPeriod,
  type DashboardPeriodMetrics,
} from "@/lib/billing/dashboard-metrics";
import type { InvoiceStatusSummaryRow } from "@/lib/billing/invoice-status-summary";
import type { Invoice } from "@/lib/billing/invoice-types";
import {
  getManagedInvoicesSnapshot,
  getServerInvoicesSnapshot,
  isInvoiceCatalogFromDatabase,
  refreshInvoiceCatalog,
  subscribeInvoiceCatalog,
} from "@/lib/billing/invoice-management-store";

export type UseBillingPeriodMetricsResult = {
  period: BillingPeriodState;
  applyPreset: (preset: BillingPeriodPreset) => void;
  applyCustomRange: (start: string, end: string) => void;
  activeRange: DateRange;
  periodLabel: string;
  allInvoices: Invoice[];
  invoicesInPeriod: Invoice[];
  metrics: DashboardPeriodMetrics;
  statusSummary: InvoiceStatusSummaryRow[];
  outsidePeriodCount: number;
  catalogLoading: boolean;
  catalogLoaded: boolean;
  /** True when catalog has finished loading and no invoices fall in the period */
  emptyPeriod: boolean;
};

/**
 * Shared billing-period state + metrics from the Supabase invoice catalog.
 * Single place for period presets, invoiceDate filtering, and KPI math.
 */
export function useBillingPeriodMetrics(): UseBillingPeriodMetricsResult {
  const [period, setPeriod] = useState<BillingPeriodState>(() =>
    createDefaultBillingPeriod(),
  );
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    void refreshInvoiceCatalog().finally(() => {
      if (!cancelled) setCatalogLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const allInvoices = useSyncExternalStore(
    subscribeInvoiceCatalog,
    getManagedInvoicesSnapshot,
    getServerInvoicesSnapshot,
  );

  // After first refresh settles, treat catalog as loaded even if empty/errored.
  const catalogLoaded = !catalogLoading || isInvoiceCatalogFromDatabase();

  const activeRange = useMemo(() => {
    if (period.preset === "custom") return period.range;
    return resolvePeriodRange(period.preset);
  }, [period]);

  const metrics = useMemo(
    () => computeDashboardMetricsForPeriod(allInvoices, activeRange),
    [allInvoices, activeRange],
  );

  const statusSummary = useMemo(
    () => buildPeriodInvoiceStatusSummary(metrics.invoicesInPeriod),
    [metrics.invoicesInPeriod],
  );

  const periodLabel = useMemo(
    () => formatPeriodLabel(period.preset, activeRange),
    [period.preset, activeRange],
  );

  const outsidePeriodCount = Math.max(
    0,
    allInvoices.length - metrics.invoicesInPeriod.length,
  );

  const emptyPeriod =
    catalogLoaded &&
    !catalogLoading &&
    metrics.invoicesInPeriod.length === 0;

  const applyPreset = useCallback((preset: BillingPeriodPreset) => {
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
  }, []);

  const applyCustomRange = useCallback((start: string, end: string) => {
    const range = resolvePeriodRange("custom", new Date(), { start, end });
    setPeriod({
      preset: "custom",
      range,
      customStart: start,
      customEnd: end,
    });
  }, []);

  return {
    period,
    applyPreset,
    applyCustomRange,
    activeRange,
    periodLabel,
    allInvoices,
    invoicesInPeriod: metrics.invoicesInPeriod,
    metrics,
    statusSummary,
    outsidePeriodCount,
    catalogLoading,
    catalogLoaded,
    emptyPeriod,
  };
}
