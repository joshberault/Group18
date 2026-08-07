"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileDown } from "lucide-react";
import { exportToCsv } from "@/lib/accounting-manager/export-csv";
import {
  fetchBillingSpecialistMatterRows,
  type BillingSpecialistMatterRow,
} from "@/lib/billing/billing-specialist-matters";
import { INVOICES_UPDATED_EVENT } from "@/lib/billing/invoice-management-store";
import {
  generateInvoiceHref,
  invoicesHref,
} from "@/lib/billing/routes";
import { formatCurrency } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { FilterSearchInput } from "@/components/ui/FilterSearchInput";
import { KPICard } from "@/components/ui/KPICard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

function createInvoicePath(row: BillingSpecialistMatterRow): string {
  return generateInvoiceHref({
    clientId: row.clientId || undefined,
    matterId: row.id,
    attorney:
      row.billingAttorney && row.billingAttorney !== "—"
        ? row.billingAttorney
        : undefined,
    matterName: row.matterName,
  });
}

function viewInvoicesPath(row: BillingSpecialistMatterRow): string {
  // Only matter UUID + display name — do not pass client (was wiping the filter).
  return invoicesHref({
    matterId: row.id,
    matterName: row.matterName,
  });
}

export function BillingSpecialistMattersView() {
  const router = useRouter();
  const [rows, setRows] = useState<BillingSpecialistMatterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [prebillFilter, setPrebillFilter] = useState("all");
  const [actionNote, setActionNote] = useState<string | null>(null);

  const loadRows = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    const result = await fetchBillingSpecialistMatterRows();
    setRows(result.rows);
    setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadRows();
    const onInvoicesUpdated = () => {
      void loadRows({ silent: true });
    };
    window.addEventListener(INVOICES_UPDATED_EVENT, onInvoicesUpdated);
    return () => {
      window.removeEventListener(INVOICES_UPDATED_EVENT, onInvoicesUpdated);
    };
  }, [loadRows]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (prebillFilter !== "all" && row.prebillStatus !== prebillFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        row.matterName.toLowerCase().includes(q) ||
        row.client.toLowerCase().includes(q) ||
        row.matterNumber.toLowerCase().includes(q)
      );
    });
  }, [rows, search, prebillFilter]);

  const kpis = useMemo(() => ({
    ready: rows.filter((r) => r.prebillStatus === "Ready for prebill").length,
    hold: rows.filter((r) => r.billingHold).length,
    unbilled: rows.reduce((s, r) => s + r.unbilledTime + r.unbilledExpenses, 0),
  }), [rows]);

  function exportCsv() {
    exportToCsv(
      "billing-matters.csv",
      ["Matter", "Client", "Method", "Attorney", "UnbilledTime", "UnbilledExpenses", "PrebillStatus", "NextBilling", "InvoiceCount"],
      filtered.map((r) => [
        r.matterNumber,
        r.client,
        r.billingMethod,
        r.billingAttorney,
        String(r.unbilledTime),
        String(r.unbilledExpenses),
        r.prebillStatus,
        r.nextBillingDate,
        String(r.invoiceCount),
      ]),
    );
  }

  function goCreateInvoice(row: BillingSpecialistMatterRow) {
    const unbilled = row.unbilledTime + row.unbilledExpenses;
    if (unbilled <= 0) {
      setActionNote(
        "No new approved unbilled time or expenses for this matter. You can still open Create Invoice for a manual or fixed-fee invoice — only already-billed lines stay locked.",
      );
    } else {
      setActionNote(null);
    }
    router.push(createInvoicePath(row));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matters"
        description="Billing-focused matter list — prebill status, rates, unbilled WIP, and billing cycle."
      >
        <div className="flex gap-2">
          <Link href="/invoices/generate"><Button>Create Invoice</Button></Link>
          <Button variant="secondary" onClick={exportCsv} disabled={loading || rows.length === 0}>
            <FileDown className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </PageHeader>

      {actionNote ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
          {actionNote}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard title="Ready for Prebill" value={loading ? "…" : String(kpis.ready)} subtitle="Awaiting invoice generation" />
        <KPICard title="Billing Holds" value={loading ? "…" : String(kpis.hold)} subtitle="Blocked from billing" />
        <KPICard title="Total Unbilled" value={loading ? "…" : formatCurrency(kpis.unbilled)} subtitle="Time + expenses" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Billing Matter Queue</CardTitle>
          <CardDescription>Search, filter, and open billing or invoice workflows</CardDescription>
        </CardHeader>
        <div className="flex flex-wrap items-end gap-3 px-4 pb-4">
          <div className="min-w-[200px] flex-1">
            <FilterSearchInput placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select
            label="Prebill status"
            value={prebillFilter}
            onChange={(e) => setPrebillFilter(e.target.value)}
            options={[
              { value: "all", label: "All prebill status" },
              { value: "Ready for prebill", label: "Ready for prebill" },
              { value: "In progress", label: "In progress" },
              { value: "On hold", label: "On hold" },
            ]}
          />
        </div>
        {error ? (
          <p className="px-4 pb-4 text-sm text-red-700">{error}</p>
        ) : null}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Matter</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Unbilled</TableHead>
              <TableHead>Prebill</TableHead>
              <TableHead>Next Bill</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted">
                  Loading matters from CounselFlow…
                </TableCell>
              </TableRow>
            ) : null}
            {!loading && !error && filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted">
                  {rows.length === 0
                    ? "No matters found. Add matters in CounselFlow, then return here."
                    : "No matters match the current filters."}
                </TableCell>
              </TableRow>
            ) : null}
            {!loading &&
              filtered.map((row) => (
              <TableRow key={row.id} className="cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/matters/${row.id}`)}>
                <TableCell>
                  <p className="font-medium">{row.matterName}</p>
                  <p className="text-xs text-muted">{row.matterNumber}</p>
                </TableCell>
                <TableCell>{row.client}</TableCell>
                <TableCell>{row.billingMethod}</TableCell>
                <TableCell>{formatCurrency(row.unbilledTime + row.unbilledExpenses)}</TableCell>
                <TableCell>
                  <Badge variant={row.billingHold ? "danger" : row.prebillStatus === "Ready for prebill" ? "warning" : "default"}>
                    {row.prebillStatus}
                  </Badge>
                </TableCell>
                <TableCell>{row.nextBillingDate}</TableCell>
                <TableCell className="align-middle">
                  <div
                    className={
                      row.hasInvoices
                        ? "grid w-[14.5rem] grid-cols-2 gap-1.5"
                        : "flex w-[14.5rem] flex-col items-center gap-1.5"
                    }
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      size="sm"
                      type="button"
                      className={
                        row.hasInvoices
                          ? "w-full justify-center whitespace-nowrap"
                          : "min-w-[7.5rem] justify-center whitespace-nowrap"
                      }
                      onClick={() => goCreateInvoice(row)}
                    >
                      Create Invoice
                    </Button>
                    {row.hasInvoices ? (
                      <Link
                        href={viewInvoicesPath(row)}
                        className="block min-w-0"
                      >
                        <Button
                          size="sm"
                          variant="secondary"
                          type="button"
                          className="w-full justify-center whitespace-nowrap"
                        >
                          View Invoice
                        </Button>
                      </Link>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      type="button"
                      className={
                        row.hasInvoices
                          ? "col-span-2 w-full justify-center"
                          : "w-full max-w-[14.5rem] justify-center"
                      }
                      onClick={() => router.push(`/matters/${row.id}`)}
                    >
                      Details
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

    </div>
  );
}
