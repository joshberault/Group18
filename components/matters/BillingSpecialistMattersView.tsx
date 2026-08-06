"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileDown, Search } from "lucide-react";
import { exportToCsv } from "@/lib/accounting-manager/export-csv";
import { getBillingSpecialistMatterRows } from "@/lib/matters/shared-matters";
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

export function BillingSpecialistMattersView() {
  const router = useRouter();
  const rows = useMemo(() => getBillingSpecialistMatterRows(), []);
  const [search, setSearch] = useState("");
  const [prebillFilter, setPrebillFilter] = useState("all");
  const [selected, setSelected] = useState<(typeof rows)[0] | null>(null);

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
      ["Matter", "Client", "Method", "Attorney", "UnbilledTime", "UnbilledExpenses", "PrebillStatus", "NextBilling"],
      filtered.map((r) => [
        r.matterNumber,
        r.client,
        r.billingMethod,
        r.billingAttorney,
        String(r.unbilledTime),
        String(r.unbilledExpenses),
        r.prebillStatus,
        r.nextBillingDate,
      ]),
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matters"
        description="Billing-focused matter list — prebill status, rates, unbilled WIP, and billing cycle."
      >
        <div className="flex gap-2">
          <Link href="/invoices/generate"><Button>Create Invoice</Button></Link>
          <Button variant="secondary" onClick={exportCsv}>
            <FileDown className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard title="Ready for Prebill" value={String(kpis.ready)} subtitle="Awaiting invoice generation" />
        <KPICard title="Billing Holds" value={String(kpis.hold)} subtitle="Blocked from billing" />
        <KPICard title="Total Unbilled" value={formatCurrency(kpis.unbilled)} subtitle="Time + expenses" />
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
            {filtered.map((row) => (
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
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelected(row); }}>Details</Button>
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
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => router.push(`/billing?matter=${encodeURIComponent(selected.matterNumber)}`)}>Open Billing</Button>
              <Button size="sm" variant="secondary" onClick={() => router.push(`/invoices/generate?matter=${encodeURIComponent(selected.matterNumber)}`)}>Generate Invoice</Button>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
