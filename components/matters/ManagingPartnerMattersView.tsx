"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, FileDown, Search, TrendingUp } from "lucide-react";
import { exportToCsv } from "@/lib/accounting-manager/export-csv";
import { getManagingPartnerMatterRows } from "@/lib/matters/shared-matters";
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

export function ManagingPartnerMattersView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get("filter") ?? "all";
  const rows = useMemo(() => getManagingPartnerMatterRows(), []);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState(
    initialFilter === "over-budget" ? "Over budget" : "all",
  );
  const [selected, setSelected] = useState<(typeof rows)[0] | null>(null);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (riskFilter !== "all" && row.risk !== riskFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        row.matterName.toLowerCase().includes(q) ||
        row.client.toLowerCase().includes(q) ||
        row.matterNumber.toLowerCase().includes(q) ||
        row.partner.toLowerCase().includes(q)
      );
    });
  }, [rows, search, riskFilter]);

  const kpis = useMemo(() => {
    const highValue = rows.filter((r) => r.billed > 100000).length;
    const atRisk = rows.filter((r) => r.risk !== "Normal").length;
    const totalWip = rows.reduce((s, r) => s + r.wip, 0);
    return { highValue, atRisk, totalWip, open: rows.length };
  }, [rows]);

  function exportCsv() {
    exportToCsv(
      "partner-matters.csv",
      ["Matter", "Name", "Client", "Partner", "Budget", "Billed", "Collected", "WIP", "Profitability", "Risk"],
      filtered.map((r) => [
        r.matterNumber,
        r.matterName,
        r.client,
        r.partner,
        String(r.budget),
        String(r.billed),
        String(r.collected),
        String(r.wip),
        `${r.profitability}%`,
        r.risk,
      ]),
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matters"
        description="High-value matters, profitability, collections exposure, and partner accountability."
      >
        <Button variant="secondary" onClick={exportCsv}>
          <FileDown className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Open Matters" value={String(kpis.open)} subtitle="Firm-wide" icon={TrendingUp} />
        <KPICard title="High-Value" value={String(kpis.highValue)} subtitle="Billed &gt; $100K" icon={TrendingUp} />
        <KPICard title="At Risk" value={String(kpis.atRisk)} subtitle="Budget, retainer, or hold" icon={AlertTriangle} />
        <KPICard title="Total WIP" value={formatCurrency(kpis.totalWip)} subtitle="Unbilled across portfolio" icon={TrendingUp} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Matter Portfolio</CardTitle>
          <CardDescription>Executive view — drill down for financial and staffing summary</CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-3 px-4 pb-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input className="pl-9" placeholder="Search matters…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select
            label="Risk level"
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            options={[
              { value: "all", label: "All risk levels" },
              { value: "Over budget", label: "Over budget" },
              { value: "Low retainer", label: "Low retainer" },
              { value: "Billing hold", label: "Billing hold" },
              { value: "Normal", label: "Normal" },
            ]}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Matter</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Partner</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>WIP</TableHead>
              <TableHead>Margin</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelected(row)}>
                <TableCell>
                  <p className="font-medium text-navy-900">{row.matterName}</p>
                  <p className="text-xs text-muted">{row.matterNumber}</p>
                </TableCell>
                <TableCell>{row.client}</TableCell>
                <TableCell>{row.partner}</TableCell>
                <TableCell>{formatCurrency(row.budget)}</TableCell>
                <TableCell>{formatCurrency(row.wip)}</TableCell>
                <TableCell>{row.profitability}%</TableCell>
                <TableCell>
                  <Badge variant={row.risk === "Normal" ? "success" : "warning"}>{row.risk}</Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelected(row); }}>
                    Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Drawer isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.matterName ?? "Matter"}>
        {selected ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">{selected.matterNumber} · {selected.client}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted">Partner</span><p className="font-medium">{selected.partner}</p></div>
              <div><span className="text-muted">Status</span><p className="font-medium">{selected.status}</p></div>
              <div><span className="text-muted">Budget</span><p className="font-medium">{formatCurrency(selected.budget)}</p></div>
              <div><span className="text-muted">Billed</span><p className="font-medium">{formatCurrency(selected.billed)}</p></div>
              <div><span className="text-muted">Collected</span><p className="font-medium">{formatCurrency(selected.collected)}</p></div>
              <div><span className="text-muted">WIP</span><p className="font-medium">{formatCurrency(selected.wip)}</p></div>
            </div>
            {selected.actionRequired ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Action required: {selected.actionRequired}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Link href={`/billing?matter=${encodeURIComponent(selected.matterNumber)}`}>
                <Button size="sm">View Billing</Button>
              </Link>
              <Link href={`/reports?matter=${encodeURIComponent(selected.matterNumber)}`}>
                <Button size="sm" variant="secondary">Profitability Report</Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={() => router.push(`/receivables?client=${encodeURIComponent(selected.client)}`)}>
                Collections
              </Button>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
