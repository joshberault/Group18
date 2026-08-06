"use client";

import Link from "next/link";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { RevenueByClient } from "@/components/billing/RevenueByClient";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Card } from "@/components/ui/Card";
import { computeDashboardMetricsForPeriod } from "@/lib/billing/dashboard-metrics";
import { resolvePeriodRange } from "@/lib/billing/billing-period";
import {
  getManagedInvoicesSnapshot,
  getServerInvoicesSnapshot,
  refreshInvoiceCatalog,
  subscribeInvoiceCatalog,
} from "@/lib/billing/invoice-management-store";
import { invoicesHref } from "@/lib/billing/routes";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

type Props = {
  clientFilter?: string;
};

export function RevenueByClientReport({ clientFilter }: Props) {
  useEffect(() => {
    void refreshInvoiceCatalog();
  }, []);

  const allInvoices = useSyncExternalStore(
    subscribeInvoiceCatalog,
    getManagedInvoicesSnapshot,
    getServerInvoicesSnapshot,
  );

  const range = useMemo(() => resolvePeriodRange("ytd"), []);
  const metrics = useMemo(
    () => computeDashboardMetricsForPeriod(allInvoices, range),
    [allInvoices, range.start, range.end],
  );

  const rows = clientFilter
    ? metrics.revenueByClient.filter((r) => r.clientName === clientFilter)
    : metrics.revenueByClient;

  const detailInvoices = clientFilter
    ? metrics.invoicesInPeriod.filter((i) => i.client === clientFilter)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          clientFilter
            ? `Revenue by Client — ${clientFilter}`
            : "Revenue by Client"
        }
        description="YTD billed and open balances by client relationship."
      />

      <RevenueByClient rows={rows} linkMode="invoices" />

      {clientFilter && detailInvoices.length > 0 ? (
        <Card className="space-y-3">
          <h2 className="text-base font-semibold text-navy-900">
            Invoices for {clientFilter}
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Attorney</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detailInvoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <Link
                      href={invoicesHref({ highlight: inv.invoiceNumber })}
                      className="font-medium text-navy-900 underline-offset-2 hover:underline"
                    >
                      {inv.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{inv.attorney}</TableCell>
                  <TableCell>{inv.invoiceDate}</TableCell>
                  <TableCell>{formatCurrency(inv.totalAmount)}</TableCell>
                  <TableCell>{formatCurrency(inv.remainingBalance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : null}
    </div>
  );
}
