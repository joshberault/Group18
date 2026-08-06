"use client";

import Link from "next/link";
import { BillingPeriodToolbar } from "@/components/billing/BillingPeriodToolbar";
import { RevenueByClient } from "@/components/billing/RevenueByClient";
import { EmptyState } from "@/components/ui/EmptyState";
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
import { useBillingPeriodMetrics } from "@/lib/billing/use-billing-period-metrics";
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
  const {
    period,
    applyPreset,
    applyCustomRange,
    periodLabel,
    allInvoices,
    invoicesInPeriod,
    metrics,
    outsidePeriodCount,
    emptyPeriod,
  } = useBillingPeriodMetrics();

  const rows = clientFilter
    ? metrics.revenueByClient.filter((r) => r.clientName === clientFilter)
    : metrics.revenueByClient;

  const detailInvoices = clientFilter
    ? invoicesInPeriod.filter((i) => i.client === clientFilter)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          clientFilter
            ? `Revenue by Client — ${clientFilter}`
            : "Revenue by Client"
        }
        description={`Billed and open balances by client for ${periodLabel}.`}
      />

      <BillingPeriodToolbar
        variant="panel"
        period={period}
        periodLabel={periodLabel}
        invoiceCountInPeriod={invoicesInPeriod.length}
        invoiceCountAll={allInvoices.length}
        outsidePeriodCount={outsidePeriodCount}
        onApplyPreset={applyPreset}
        onApplyCustomRange={applyCustomRange}
        footnote="Revenue is rolled up from invoices issued in the selected period."
      />

      {emptyPeriod ? (
        <EmptyState
          title="No invoices found for the selected billing period."
          description="Adjust the billing period filters to see client revenue."
        />
      ) : (
        <RevenueByClient rows={rows} linkMode="invoices" />
      )}

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
