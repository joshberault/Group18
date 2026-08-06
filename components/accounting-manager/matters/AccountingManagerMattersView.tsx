"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  FileDown,
  PauseCircle,
  Search,
  TrendingUp,
} from "lucide-react";
import {
  AM_ATTORNEYS,
  amMatters,
  type AmMatterEntity,
} from "@/lib/mock-data/accounting-manager/entities";
import { exportToCsv } from "@/lib/accounting-manager/export-csv";
import { invoicesHref } from "@/lib/billing/routes";
import { formatCurrency } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { KPICard } from "@/components/ui/KPICard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Toast } from "@/components/ui/Toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

type SortKey =
  | "matterName"
  | "matterNumber"
  | "unbilledWip"
  | "billedToDate"
  | "collectedToDate"
  | "trustBalance"
  | "marginPercent"
  | "budget";

interface MatterFilters {
  search: string;
  attorney: string;
  practiceArea: string;
  matterStatus: string;
  financialStatus: string;
  billingHoldOnly: boolean;
  kpiFilter: string;
}

const defaultFilters: MatterFilters = {
  search: "",
  attorney: "all",
  practiceArea: "all",
  matterStatus: "all",
  financialStatus: "all",
  billingHoldOnly: false,
  kpiFilter: "",
};

const PRACTICE_AREAS = [
  "Real Estate",
  "Employment",
  "Healthcare",
  "Corporate",
  "Construction",
  "Intellectual Property",
  "Environmental",
  "Regulatory",
] as const;

function financialStatusKey(status: AmMatterEntity["financialStatus"]) {
  return status.toLowerCase().replace(/\s+/g, "_");
}

function matterStatusKey(status: AmMatterEntity["matterStatus"]) {
  return status.toLowerCase().replace(/\s+/g, "_");
}

export function AccountingManagerMattersView() {
  const router = useRouter();
  const [matters, setMatters] = useState(amMatters);
  const [filters, setFilters] = useState<MatterFilters>(defaultFilters);
  const [sortKey, setSortKey] = useState<SortKey>("unbilledWip");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedMatter, setSelectedMatter] = useState<AmMatterEntity | null>(
    null,
  );
  const [toast, setToast] = useState<string | null>(null);

  const kpis = useMemo(() => {
    const openMatters = matters.filter((m) => m.matterStatus === "Open");
    const unbilledWip = matters.reduce((s, m) => s + m.unbilledWip, 0);
    const unbilledExpenses = matters.reduce(
      (s, m) => s + m.unbilledExpenses,
      0,
    );
    const billingHolds = matters.filter((m) => m.billingHold).length;
    const overBudget = matters.filter(
      (m) => m.financialStatus === "Over Budget",
    ).length;
    const trustTotal = matters.reduce((s, m) => s + m.trustBalance, 0);

    return [
      {
        id: "open",
        title: "Open Matters",
        value: String(openMatters.length),
        subtitle: `${matters.length} total matters`,
        kpiFilter: "open",
      },
      {
        id: "wip",
        title: "Unbilled WIP",
        value: formatCurrency(unbilledWip),
        subtitle: "Across all matters",
        kpiFilter: "has_wip",
      },
      {
        id: "expenses",
        title: "Unbilled Expenses",
        value: formatCurrency(unbilledExpenses),
        subtitle: "Pending invoice inclusion",
        kpiFilter: "has_expenses",
      },
      {
        id: "holds",
        title: "Billing Holds",
        value: String(billingHolds),
        subtitle: "Matters blocked from billing",
        kpiFilter: "billing_hold",
        warning: billingHolds > 0,
      },
      {
        id: "over-budget",
        title: "Over Budget",
        value: String(overBudget),
        subtitle: "Matters exceeding budget",
        kpiFilter: "over_budget",
        warning: overBudget > 0,
      },
      {
        id: "trust",
        title: "Matter Trust",
        value: formatCurrency(trustTotal),
        subtitle: "Trust allocated to matters",
        kpiFilter: "has_trust",
      },
    ];
  }, [matters]);

  const filteredMatters = useMemo(() => {
    let list = [...matters];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (m) =>
          m.matterName.toLowerCase().includes(q) ||
          m.matterNumber.toLowerCase().includes(q) ||
          m.client.toLowerCase().includes(q),
      );
    }
    if (filters.attorney !== "all") {
      list = list.filter((m) => m.attorney === filters.attorney);
    }
    if (filters.practiceArea !== "all") {
      list = list.filter((m) => m.practiceArea === filters.practiceArea);
    }
    if (filters.matterStatus !== "all") {
      list = list.filter((m) => m.matterStatus === filters.matterStatus);
    }
    if (filters.financialStatus !== "all") {
      list = list.filter((m) => m.financialStatus === filters.financialStatus);
    }
    if (filters.billingHoldOnly) {
      list = list.filter((m) => m.billingHold);
    }
    if (filters.kpiFilter === "open") {
      list = list.filter((m) => m.matterStatus === "Open");
    } else if (filters.kpiFilter === "has_wip") {
      list = list.filter((m) => m.unbilledWip > 0);
    } else if (filters.kpiFilter === "has_expenses") {
      list = list.filter((m) => m.unbilledExpenses > 0);
    } else if (filters.kpiFilter === "billing_hold") {
      list = list.filter((m) => m.billingHold);
    } else if (filters.kpiFilter === "over_budget") {
      list = list.filter((m) => m.financialStatus === "Over Budget");
    } else if (filters.kpiFilter === "has_trust") {
      list = list.filter((m) => m.trustBalance > 0);
    } else if (filters.kpiFilter === "low_retainer") {
      list = list.filter((m) => m.financialStatus === "Low Retainer");
    }

    list.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "matterName" || sortKey === "matterNumber") {
        return a[sortKey].localeCompare(b[sortKey]) * dir;
      }
      return (a[sortKey] - b[sortKey]) * dir;
    });

    return list;
  }, [filters, sortKey, sortDir, matters]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const handleExport = () => {
    exportToCsv(
      "matter-financial-overview.csv",
      [
        "Matter Number",
        "Matter Name",
        "Client",
        "Attorney",
        "Practice Area",
        "Status",
        "Billing Method",
        "Budget",
        "Unbilled WIP",
        "Unbilled Expenses",
        "Billed to Date",
        "Collected",
        "Trust Balance",
        "Margin %",
        "Financial Status",
        "Billing Hold",
      ],
      filteredMatters.map((m) => [
        m.matterNumber,
        m.matterName,
        m.client,
        m.attorney,
        m.practiceArea,
        m.matterStatus,
        m.billingMethod,
        String(m.budget),
        String(m.unbilledWip),
        String(m.unbilledExpenses),
        String(m.billedToDate),
        String(m.collectedToDate),
        String(m.trustBalance),
        String(m.marginPercent),
        m.financialStatus,
        m.billingHold ? "Yes" : "No",
      ]),
    );
    setToast("Matter financial data exported to CSV.");
  };

  const prototypeAction = (action: string) => {
    setToast(`${action} — prototype action recorded.`);
  };

  const outstandingAr = (m: AmMatterEntity) =>
    m.billedToDate - m.collectedToDate;

  return (
    <>
      <PageHeader
        title="Matter Financial Management"
        description="Track matter WIP, expenses, trust balances, budgets, and billing holds across the firm."
      >
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                billingHoldOnly: true,
                kpiFilter: "billing_hold",
              }))
            }
          >
            <PauseCircle className="h-4 w-4" />
            Review Holds
          </Button>
          <Button
            variant="secondary"
            onClick={() => prototypeAction("Budget variance report")}
          >
            <TrendingUp className="h-4 w-4" />
            Budget Report
          </Button>
          <Button variant="secondary" onClick={handleExport}>
            <FileDown className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <button
            key={kpi.id}
            type="button"
            onClick={() =>
              setFilters((prev) => ({ ...prev, kpiFilter: kpi.kpiFilter }))
            }
            className="text-left"
          >
            <KPICard
              title={kpi.title}
              value={kpi.value}
              subtitle={kpi.subtitle}
              className={
                kpi.warning
                  ? "cursor-pointer border-amber-300 bg-amber-50/60 transition-shadow hover:shadow-md"
                  : "cursor-pointer transition-shadow hover:shadow-md"
              }
            />
          </button>
        ))}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            {filteredMatters.length} of {matters.length} matters shown
          </CardDescription>
        </CardHeader>
        <div className="grid gap-4 px-6 pb-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              placeholder="Search matters, clients..."
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              className="pl-9"
            />
          </div>
          <Select
            label="Attorney"
            value={filters.attorney}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, attorney: e.target.value }))
            }
            options={[
              { value: "all", label: "All attorneys" },
              ...AM_ATTORNEYS.map((a) => ({ value: a, label: a })),
            ]}
          />
          <Select
            label="Practice Area"
            value={filters.practiceArea}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                practiceArea: e.target.value,
              }))
            }
            options={[
              { value: "all", label: "All practice areas" },
              ...PRACTICE_AREAS.map((p) => ({ value: p, label: p })),
            ]}
          />
          <Select
            label="Matter Status"
            value={filters.matterStatus}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                matterStatus: e.target.value,
              }))
            }
            options={[
              { value: "all", label: "All statuses" },
              { value: "Open", label: "Open" },
              { value: "Pending Close", label: "Pending Close" },
              { value: "Closed", label: "Closed" },
            ]}
          />
          <Select
            label="Financial Status"
            value={filters.financialStatus}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                financialStatus: e.target.value,
              }))
            }
            options={[
              { value: "all", label: "All financial statuses" },
              { value: "On Track", label: "On Track" },
              { value: "Over Budget", label: "Over Budget" },
              { value: "Low Retainer", label: "Low Retainer" },
              { value: "Billing Hold", label: "Billing Hold" },
            ]}
          />
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-navy-900">
              <input
                type="checkbox"
                checked={filters.billingHoldOnly}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    billingHoldOnly: e.target.checked,
                  }))
                }
                className="rounded border-gray-300"
              />
              Billing hold only
            </label>
          </div>
        </div>
        {(filters.kpiFilter ||
          filters.search ||
          filters.billingHoldOnly) && (
          <div className="px-6 pb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters(defaultFilters)}
            >
              Clear filters
            </Button>
          </div>
        )}
      </Card>

      <Card padding="none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  type="button"
                  className="font-semibold uppercase hover:text-navy-700"
                  onClick={() => toggleSort("matterNumber")}
                >
                  Number
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="font-semibold uppercase hover:text-navy-700"
                  onClick={() => toggleSort("matterName")}
                >
                  Matter
                </button>
              </TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Attorney</TableHead>
              <TableHead>Practice</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>
                <button
                  type="button"
                  className="font-semibold uppercase hover:text-navy-700"
                  onClick={() => toggleSort("budget")}
                >
                  Budget
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="font-semibold uppercase hover:text-navy-700"
                  onClick={() => toggleSort("unbilledWip")}
                >
                  WIP
                </button>
              </TableHead>
              <TableHead>Expenses</TableHead>
              <TableHead>
                <button
                  type="button"
                  className="font-semibold uppercase hover:text-navy-700"
                  onClick={() => toggleSort("billedToDate")}
                >
                  Billed
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="font-semibold uppercase hover:text-navy-700"
                  onClick={() => toggleSort("collectedToDate")}
                >
                  Collected
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="font-semibold uppercase hover:text-navy-700"
                  onClick={() => toggleSort("trustBalance")}
                >
                  Trust
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="font-semibold uppercase hover:text-navy-700"
                  onClick={() => toggleSort("marginPercent")}
                >
                  Margin
                </button>
              </TableHead>
              <TableHead>Financial</TableHead>
              <TableHead>Hold</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMatters.map((matter) => (
              <TableRow
                key={matter.id}
                onClick={() => setSelectedMatter(matter)}
                className={
                  matter.billingHold ? "bg-amber-50/40" : undefined
                }
              >
                <TableCell>{matter.matterNumber}</TableCell>
                <TableCell className="font-medium">{matter.matterName}</TableCell>
                <TableCell>{matter.client}</TableCell>
                <TableCell>{matter.attorney}</TableCell>
                <TableCell>{matter.practiceArea}</TableCell>
                <TableCell>
                  <StatusBadge status={matterStatusKey(matter.matterStatus)} />
                </TableCell>
                <TableCell>
                  <Badge variant="neutral">{matter.billingMethod}</Badge>
                </TableCell>
                <TableCell>{formatCurrency(matter.budget)}</TableCell>
                <TableCell>{formatCurrency(matter.unbilledWip)}</TableCell>
                <TableCell>{formatCurrency(matter.unbilledExpenses)}</TableCell>
                <TableCell>{formatCurrency(matter.billedToDate)}</TableCell>
                <TableCell>{formatCurrency(matter.collectedToDate)}</TableCell>
                <TableCell>{formatCurrency(matter.trustBalance)}</TableCell>
                <TableCell>{matter.marginPercent}%</TableCell>
                <TableCell>
                  <StatusBadge
                    status={financialStatusKey(matter.financialStatus)}
                  />
                </TableCell>
                <TableCell>
                  {matter.billingHold ? (
                    <Ban className="h-4 w-4 text-amber-600" />
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filteredMatters.length === 0 && (
              <TableRow>
                <TableCell colSpan={16} className="text-center text-muted">
                  No matters match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Drawer
        isOpen={Boolean(selectedMatter)}
        onClose={() => setSelectedMatter(null)}
        title={selectedMatter?.matterName ?? ""}
        description={
          selectedMatter
            ? `${selectedMatter.matterNumber} · ${selectedMatter.client}`
            : undefined
        }
      >
        {selectedMatter && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {selectedMatter.billingHold && (
                <Button
                  size="sm"
                  onClick={() => {
                    setMatters((prev) =>
                      prev.map((matter) =>
                        matter.id === selectedMatter.id
                          ? {
                              ...matter,
                              billingHold: false,
                              financialStatus: "On Track",
                            }
                          : matter,
                      ),
                    );
                    setSelectedMatter((prev) =>
                      prev
                        ? {
                            ...prev,
                            billingHold: false,
                            financialStatus: "On Track",
                          }
                        : prev,
                    );
                    setToast(`Billing hold released for ${selectedMatter.matterName}.`);
                  }}
                >
                  Release Hold
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  router.push(
                    invoicesHref({
                      client: selectedMatter.client,
                      matter: selectedMatter.matterName,
                    }),
                  )
                }
              >
                View Invoices
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => router.push("/accounting/trust")}
              >
                View Trust Ledger
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setToast("Prebill draft queued for billing review (session only).")}
              >
                Generate Prebill
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setToast("Budget adjustment form opened (session only).")}
              >
                Adjust Budget
              </Button>
            </div>

            <section>
              <h3 className="mb-3 text-sm font-semibold text-navy-900">
                Matter Details
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Attorney</dt>
                  <dd className="font-medium">{selectedMatter.attorney}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Practice area</dt>
                  <dd className="font-medium">{selectedMatter.practiceArea}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Billing method</dt>
                  <dd className="font-medium">{selectedMatter.billingMethod}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Matter status</dt>
                  <dd>
                    <StatusBadge
                      status={matterStatusKey(selectedMatter.matterStatus)}
                    />
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Financial status</dt>
                  <dd>
                    <StatusBadge
                      status={financialStatusKey(selectedMatter.financialStatus)}
                    />
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Minimum retainer</dt>
                  <dd className="font-medium">
                    {formatCurrency(selectedMatter.minimumRetainer)}
                  </dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold text-navy-900">
                Financial Position
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-muted">Budget</p>
                  <p className="text-lg font-semibold text-navy-900">
                    {formatCurrency(selectedMatter.budget)}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-muted">Billed to date</p>
                  <p className="text-lg font-semibold text-navy-900">
                    {formatCurrency(selectedMatter.billedToDate)}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-muted">Collected</p>
                  <p className="text-lg font-semibold text-navy-900">
                    {formatCurrency(selectedMatter.collectedToDate)}
                  </p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                  <p className="text-xs text-muted">Outstanding A/R</p>
                  <p className="text-lg font-semibold text-amber-800">
                    {formatCurrency(outstandingAr(selectedMatter))}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-muted">Unbilled WIP</p>
                  <p className="text-lg font-semibold text-navy-900">
                    {formatCurrency(selectedMatter.unbilledWip)}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-muted">Unbilled expenses</p>
                  <p className="text-lg font-semibold text-navy-900">
                    {formatCurrency(selectedMatter.unbilledExpenses)}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-muted">Trust balance</p>
                  <p className="text-lg font-semibold text-navy-900">
                    {formatCurrency(selectedMatter.trustBalance)}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-muted">Margin</p>
                  <p className="text-lg font-semibold text-navy-900">
                    {selectedMatter.marginPercent}%
                  </p>
                </div>
              </div>
            </section>

            {selectedMatter.billingHold && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  Billing hold active — invoices cannot be generated until hold
                  is released by accounting management.
                </p>
              </div>
            )}

            {selectedMatter.financialStatus === "Over Budget" && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  Matter has exceeded budget threshold. Review scope and notify
                  responsible attorney.
                </p>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
