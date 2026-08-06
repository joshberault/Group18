"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileDown, Search } from "lucide-react";
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
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
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
  const [selected, setSelected] = useState<BillingSpecialistMatterRow | null>(
    null,
  );
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
        <div className="flex flex-wrap gap-3 px-4 pb-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input className="pl-9" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
              <TableRow key={row.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelected(row)}>
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
                <TableCell>
                  <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                    {row.hasInvoices ? (
                      <Link href={viewInvoicesPath(row)}>
                        <Button size="sm" variant="secondary" type="button">
                          View Invoice
                        </Button>
                      </Link>
                    ) : null}
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => goCreateInvoice(row)}
                    >
                      Create Invoice
                    </Button>
                    <Button size="sm" variant="ghost" type="button" onClick={() => setSelected(row)}>
                      Details
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Drawer isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.matterName ?? "Matter"}>
        {selected ? (
          <div className="space-y-4 text-sm">
            <p className="text-muted">{selected.matterNumber} · {selected.client}</p>
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-muted">Billing attorney</span><p className="font-medium">{selected.billingAttorney}</p></div>
              <div><span className="text-muted">Cycle</span><p className="font-medium">{selected.billingCycle}</p></div>
              <div><span className="text-muted">Rate status</span><p className="font-medium">{selected.rateStatus}</p></div>
              <div><span className="text-muted">Last invoice</span><p className="font-medium">{selected.lastInvoice}</p></div>
              <div><span className="text-muted">Invoices on file</span><p className="font-medium">{selected.invoiceCount}</p></div>
              {selected.hourlyRate != null ? (
                <div><span className="text-muted">Hourly rate</span><p className="font-medium">{formatCurrency(selected.hourlyRate)}</p></div>
              ) : null}
              {selected.retainerBalance != null ? (
                <div><span className="text-muted">Retainer balance</span><p className="font-medium">{formatCurrency(selected.retainerBalance)}</p></div>
              ) : null}
            </div>
            {selected.unbilledTime + selected.unbilledExpenses <= 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                No new approved unbilled time or expenses for this matter. You can still create a
                manual invoice; already-billed lines will not reappear as selectable WIP.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {selected.hasInvoices ? (
                <Link href={viewInvoicesPath(selected)}>
                  <Button size="sm" variant="secondary" type="button">
                    View Invoice
                  </Button>
                </Link>
              ) : null}
              <Button size="sm" type="button" onClick={() => goCreateInvoice(selected)}>
                Create Invoice
              </Button>
              <Button size="sm" variant="secondary" type="button" onClick={() => router.push(`/billing?matter=${encodeURIComponent(selected.matterNumber)}`)}>
                Open Billing
              </Button>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
