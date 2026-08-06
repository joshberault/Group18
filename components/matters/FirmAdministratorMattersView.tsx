"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileDown, Search } from "lucide-react";
import { exportToCsv } from "@/lib/accounting-manager/export-csv";
import { fetchFirmAdminMatterRows } from "@/lib/matters/shared-matters";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
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

export function FirmAdministratorMattersView() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchFirmAdminMatterRows>>["rows"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void (async () => {
      const result = await fetchFirmAdminMatterRows();
      setRows(result.rows);
      setError(result.error);
      setLoading(false);
    })();
  }, []);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<(typeof rows)[0] | null>(null);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.adminStatus !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        row.matterName.toLowerCase().includes(q) ||
        row.client.toLowerCase().includes(q) ||
        row.attorney.toLowerCase().includes(q) ||
        row.matterNumber.toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  const kpis = useMemo(() => ({
    open: rows.filter((r) => r.matterStatus !== "Closed").length,
    exceptions: rows.filter((r) => r.setupGap).length,
    offices: new Set(rows.map((r) => r.office)).size,
  }), [rows]);

  function exportCsv() {
    exportToCsv(
      "admin-matters.csv",
      ["Matter", "Name", "Client", "Attorney", "Office", "Status", "AdminStatus", "SetupGap"],
      filtered.map((r) => [
        r.matterNumber,
        r.matterName,
        r.client,
        r.attorney,
        r.office,
        r.matterStatus,
        r.adminStatus,
        r.setupGap ?? "",
      ]),
    );
  }

  if (loading) {
    return <LoadingState message="Loading matters..." />;
  }

  if (error) {
    return (
      <EmptyState
        title="Matters unavailable"
        description={error}
        moduleLabel="Firm Administrator"
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matters"
        description="Operational matter administration — staffing, engagement status, and setup exceptions."
      >
        <div className="flex gap-2">
          <Link href="/admin/matters"><Button variant="secondary">Admin Matters Panel</Button></Link>
          <Button variant="secondary" onClick={exportCsv}>
            <FileDown className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard title="Open Matters" value={String(kpis.open)} subtitle="Across all offices" />
        <KPICard title="Setup Exceptions" value={String(kpis.exceptions)} subtitle="Requires admin action" />
        <KPICard title="Offices" value={String(kpis.offices)} subtitle="Active locations" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Matter Administration</CardTitle>
          <CardDescription>Staffing, engagement dates, and administrative status</CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-3 px-4 pb-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input className="pl-9" placeholder="Search matters…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select
            label="Admin status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "all", label: "All admin status" },
              { value: "Active", label: "Active" },
              { value: "Exception", label: "Exception" },
              { value: "Closed", label: "Closed" },
            ]}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Matter</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Attorney</TableHead>
              <TableHead>Office</TableHead>
              <TableHead>Engagement</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Exception</TableHead>
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
                <TableCell>{row.attorney}</TableCell>
                <TableCell>{row.office}</TableCell>
                <TableCell>{row.engagementDate}</TableCell>
                <TableCell>
                  <Badge variant={row.adminStatus === "Exception" ? "warning" : "success"}>{row.adminStatus}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted">{row.setupGap ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Drawer isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.matterName ?? "Matter"}>
        {selected ? (
          <div className="space-y-3 text-sm">
            <p className="text-muted">{selected.matterNumber} · {selected.practiceArea}</p>
            <p><span className="text-muted">Staffing:</span> {selected.staffing}</p>
            <p><span className="text-muted">Matter status:</span> {selected.matterStatus}</p>
            {selected.setupGap ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">{selected.setupGap}</p>
            ) : null}
            <Link href="/admin/assignments"><Button size="sm">View Assignments</Button></Link>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
