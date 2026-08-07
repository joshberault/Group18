"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FileDown, Search } from "lucide-react";
import { exportToCsv } from "@/lib/accounting-manager/export-csv";
import {
  fetchSharedFirmMatters,
  toFirmAdminMatterRow,
} from "@/lib/matters/firm-matters-supabase";
import type { FirmAdminMatterRow } from "@/lib/matters/shared-matters";
import { MatterCreationApprovalsPanel } from "@/components/matters/MatterCreationApprovalsPanel";
import { EngagementApprovalsPanel } from "@/components/matters/EngagementApprovalsPanel";
import {
  PipelineHandoffBanner,
  PipelineHandoffLink,
} from "@/components/pipeline/PipelineHandoffBanner";
import { buildEngagementApprovalsUrl } from "@/lib/pipeline/contract-to-cash";
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
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<FirmAdminMatterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<FirmAdminMatterRow | null>(null);
  const [approvedMatterId, setApprovedMatterId] = useState<string | null>(
    searchParams.get("approvedMatterId"),
  );
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchSharedFirmMatters({ includeWip: false });
    setRows(result.matters.map(toFirmAdminMatterRow));
    setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matters"
        description="Operational matter administration — staffing, engagement status, and setup exceptions."
      >
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportCsv} disabled={loading || rows.length === 0}>
            <FileDown className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard title="Open Matters" value={loading ? "…" : String(kpis.open)} subtitle="Across all offices" />
        <KPICard title="Setup Exceptions" value={loading ? "…" : String(kpis.exceptions)} subtitle="Requires admin action" />
        <KPICard title="Offices" value={loading ? "…" : String(kpis.offices)} subtitle="Active locations" />
      </div>

      <MatterCreationApprovalsPanel
        onReviewed={(matterId) => {
          void load();
          if (matterId) {
            setApprovedMatterId(matterId);
            setApprovalMessage(
              "Matter approved and opened. Continue to engagement agreement approval below.",
            );
          }
        }}
      />

      <EngagementApprovalsPanel
        onReviewed={(matterId) => {
          if (matterId) setApprovedMatterId(matterId);
        }}
      />

      {approvalMessage ? (
        <PipelineHandoffBanner stage="matter_created" title={approvalMessage}>
          <PipelineHandoffLink href={buildEngagementApprovalsUrl(approvedMatterId ?? undefined)}>
            Open engagement approvals
          </PipelineHandoffLink>
        </PipelineHandoffBanner>
      ) : null}

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
        {error ? (
          <p className="px-4 pb-4 text-sm text-red-700">{error}</p>
        ) : null}
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
              <TableRow
                key={row.id}
                className={`cursor-pointer hover:bg-gray-50 ${
                  row.id === approvedMatterId ? "bg-green-50 ring-1 ring-inset ring-green-200" : ""
                }`}
                onClick={() => setSelected(row)}
              >
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
