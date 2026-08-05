"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  DollarSign,
  FileDown,
  Mail,
  Search,
  Wallet,
} from "lucide-react";
import {
  AM_OFFICES,
  AM_PARTNERS,
  amClients,
  getMattersByClientId,
  type AmClientEntity,
} from "@/lib/mock-data/accounting-manager/entities";
import { exportToCsv } from "@/lib/accounting-manager/export-csv";
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
  | "name"
  | "clientNumber"
  | "totalAr"
  | "pastDue"
  | "balance90Plus"
  | "trustBalance"
  | "unbilledWip"
  | "openMatters";

interface ClientFilters {
  search: string;
  office: string;
  partner: string;
  paymentStatus: string;
  riskLevel: string;
  kpiFilter: string;
}

const defaultFilters: ClientFilters = {
  search: "",
  office: "all",
  partner: "all",
  paymentStatus: "all",
  riskLevel: "all",
  kpiFilter: "",
};

function riskVariant(risk: AmClientEntity["riskLevel"]) {
  if (risk === "Green") return "success" as const;
  if (risk === "Yellow") return "warning" as const;
  return "danger" as const;
}

function paymentStatusKey(status: AmClientEntity["paymentStatus"]) {
  return status.toLowerCase().replace(/\s+/g, "_");
}

export function AccountingManagerClientsView() {
  const [filters, setFilters] = useState<ClientFilters>(defaultFilters);
  const [sortKey, setSortKey] = useState<SortKey>("totalAr");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedClient, setSelectedClient] = useState<AmClientEntity | null>(
    null,
  );
  const [toast, setToast] = useState<string | null>(null);

  const kpis = useMemo(() => {
    const totalAr = amClients.reduce((s, c) => s + c.totalAr, 0);
    const pastDue = amClients.reduce((s, c) => s + c.pastDue, 0);
    const balance90Plus = amClients.reduce((s, c) => s + c.balance90Plus, 0);
    const trustBalance = amClients.reduce((s, c) => s + c.trustBalance, 0);
    const unbilledWip = amClients.reduce((s, c) => s + c.unbilledWip, 0);

    return [
      {
        id: "total-clients",
        title: "Active Clients",
        value: String(amClients.length),
        subtitle: "With open financial activity",
        kpiFilter: "",
      },
      {
        id: "total-ar",
        title: "Total A/R",
        value: formatCurrency(totalAr),
        subtitle: "Outstanding receivables",
        kpiFilter: "has_ar",
        warning: false,
      },
      {
        id: "past-due",
        title: "Past Due A/R",
        value: formatCurrency(pastDue),
        subtitle: `${amClients.filter((c) => c.pastDue > 0).length} clients`,
        kpiFilter: "past_due",
        warning: pastDue > 0,
      },
      {
        id: "90-plus",
        title: "90+ Day Balance",
        value: formatCurrency(balance90Plus),
        subtitle: "Severely aged receivables",
        kpiFilter: "90_plus",
        warning: balance90Plus > 0,
      },
      {
        id: "trust",
        title: "Trust Balances",
        value: formatCurrency(trustBalance),
        subtitle: "Client trust funds held",
        kpiFilter: "has_trust",
      },
      {
        id: "unbilled-wip",
        title: "Unbilled WIP",
        value: formatCurrency(unbilledWip),
        subtitle: "Work not yet invoiced",
        kpiFilter: "has_wip",
      },
    ];
  }, []);

  const filteredClients = useMemo(() => {
    let list = [...amClients];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.clientNumber.toLowerCase().includes(q) ||
          c.primaryContact.toLowerCase().includes(q),
      );
    }
    if (filters.office !== "all") {
      list = list.filter((c) => c.office === filters.office);
    }
    if (filters.partner !== "all") {
      list = list.filter((c) => c.responsiblePartner === filters.partner);
    }
    if (filters.paymentStatus !== "all") {
      list = list.filter((c) => c.paymentStatus === filters.paymentStatus);
    }
    if (filters.riskLevel !== "all") {
      list = list.filter((c) => c.riskLevel === filters.riskLevel);
    }
    if (filters.kpiFilter === "past_due") {
      list = list.filter((c) => c.pastDue > 0);
    } else if (filters.kpiFilter === "90_plus") {
      list = list.filter((c) => c.balance90Plus > 0);
    } else if (filters.kpiFilter === "has_trust") {
      list = list.filter((c) => c.trustBalance > 0);
    } else if (filters.kpiFilter === "has_wip") {
      list = list.filter((c) => c.unbilledWip > 0);
    } else if (filters.kpiFilter === "has_ar") {
      list = list.filter((c) => c.totalAr > 0);
    } else if (filters.kpiFilter === "high_risk") {
      list = list.filter((c) => c.riskLevel === "Red");
    }

    list.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name" || sortKey === "clientNumber") {
        return a[sortKey].localeCompare(b[sortKey]) * dir;
      }
      return (a[sortKey] - b[sortKey]) * dir;
    });

    return list;
  }, [filters, sortKey, sortDir]);

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
      "client-financial-overview.csv",
      [
        "Client",
        "Client Number",
        "Primary Contact",
        "Partner",
        "Office",
        "Open Matters",
        "Total A/R",
        "Past Due",
        "90+ Balance",
        "Trust Balance",
        "Unbilled WIP",
        "Payment Status",
        "Risk Level",
      ],
      filteredClients.map((c) => [
        c.name,
        c.clientNumber,
        c.primaryContact,
        c.responsiblePartner,
        c.office,
        String(c.openMatters),
        String(c.totalAr),
        String(c.pastDue),
        String(c.balance90Plus),
        String(c.trustBalance),
        String(c.unbilledWip),
        c.paymentStatus,
        c.riskLevel,
      ]),
    );
    setToast("Client financial data exported to CSV.");
  };

  const prototypeAction = (action: string) => {
    setToast(`${action} — prototype action recorded.`);
  };

  const relatedMatters = selectedClient
    ? getMattersByClientId(selectedClient.id)
    : [];

  return (
    <>
      <PageHeader
        title="Client Financial Overview"
        description="Monitor client receivables, trust balances, unbilled work, and collection risk across the firm."
      >
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => prototypeAction("Send Payment Reminders")}>
            <Mail className="h-4 w-4" />
            Send Reminders
          </Button>
          <Button
            variant="secondary"
            onClick={() => prototypeAction("Record Payment")}
          >
            <DollarSign className="h-4 w-4" />
            Record Payment
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
              setFilters((prev) => ({
                ...prev,
                kpiFilter: kpi.kpiFilter,
              }))
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
            {filteredClients.length} of {amClients.length} clients shown
          </CardDescription>
        </CardHeader>
        <div className="grid gap-4 px-6 pb-6 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              placeholder="Search clients..."
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              className="pl-9"
            />
          </div>
          <Select
            label="Office"
            value={filters.office}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, office: e.target.value }))
            }
            options={[
              { value: "all", label: "All offices" },
              ...AM_OFFICES.map((o) => ({ value: o, label: o })),
            ]}
          />
          <Select
            label="Responsible Partner"
            value={filters.partner}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, partner: e.target.value }))
            }
            options={[
              { value: "all", label: "All partners" },
              ...AM_PARTNERS.map((p) => ({ value: p, label: p })),
            ]}
          />
          <Select
            label="Payment Status"
            value={filters.paymentStatus}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                paymentStatus: e.target.value,
              }))
            }
            options={[
              { value: "all", label: "All statuses" },
              { value: "Current", label: "Current" },
              { value: "Past Due", label: "Past Due" },
              { value: "Payment Plan", label: "Payment Plan" },
              { value: "On Hold", label: "On Hold" },
            ]}
          />
          <Select
            label="Risk Level"
            value={filters.riskLevel}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, riskLevel: e.target.value }))
            }
            options={[
              { value: "all", label: "All risk levels" },
              { value: "Green", label: "Green" },
              { value: "Yellow", label: "Yellow" },
              { value: "Red", label: "Red" },
            ]}
          />
        </div>
        {(filters.kpiFilter || filters.search !== defaultFilters.search) && (
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
                  onClick={() => toggleSort("name")}
                >
                  Client {sortKey === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="font-semibold uppercase hover:text-navy-700"
                  onClick={() => toggleSort("clientNumber")}
                >
                  Number
                </button>
              </TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Partner</TableHead>
              <TableHead>Office</TableHead>
              <TableHead>
                <button
                  type="button"
                  className="font-semibold uppercase hover:text-navy-700"
                  onClick={() => toggleSort("openMatters")}
                >
                  Matters
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="font-semibold uppercase hover:text-navy-700"
                  onClick={() => toggleSort("totalAr")}
                >
                  Total A/R
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="font-semibold uppercase hover:text-navy-700"
                  onClick={() => toggleSort("pastDue")}
                >
                  Past Due
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="font-semibold uppercase hover:text-navy-700"
                  onClick={() => toggleSort("balance90Plus")}
                >
                  90+
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
                  onClick={() => toggleSort("unbilledWip")}
                >
                  WIP
                </button>
              </TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Risk</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.map((client) => (
              <TableRow
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className={
                  client.riskLevel === "Red" ? "bg-red-50/30" : undefined
                }
              >
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell>{client.clientNumber}</TableCell>
                <TableCell>{client.primaryContact}</TableCell>
                <TableCell>{client.responsiblePartner}</TableCell>
                <TableCell>{client.office}</TableCell>
                <TableCell>{client.openMatters}</TableCell>
                <TableCell>{formatCurrency(client.totalAr)}</TableCell>
                <TableCell
                  className={
                    client.pastDue > 0 ? "font-medium text-amber-700" : undefined
                  }
                >
                  {formatCurrency(client.pastDue)}
                </TableCell>
                <TableCell
                  className={
                    client.balance90Plus > 0
                      ? "font-medium text-red-700"
                      : undefined
                  }
                >
                  {formatCurrency(client.balance90Plus)}
                </TableCell>
                <TableCell>{formatCurrency(client.trustBalance)}</TableCell>
                <TableCell>{formatCurrency(client.unbilledWip)}</TableCell>
                <TableCell>
                  <StatusBadge status={paymentStatusKey(client.paymentStatus)} />
                </TableCell>
                <TableCell>
                  <Badge variant={riskVariant(client.riskLevel)}>
                    {client.riskLevel}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {filteredClients.length === 0 && (
              <TableRow>
                <TableCell colSpan={13} className="text-center text-muted">
                  No clients match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Drawer
        isOpen={Boolean(selectedClient)}
        onClose={() => setSelectedClient(null)}
        title={selectedClient?.name ?? ""}
        description={
          selectedClient
            ? `${selectedClient.clientNumber} · ${selectedClient.office}`
            : undefined
        }
      >
        {selectedClient && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() =>
                  prototypeAction(`Payment reminder sent to ${selectedClient.name}`)
                }
              >
                <Mail className="h-4 w-4" />
                Send Reminder
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => prototypeAction("Record Payment")}
              >
                <DollarSign className="h-4 w-4" />
                Record Payment
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => prototypeAction("Client Statement generated")}
              >
                <FileDown className="h-4 w-4" />
                Export Statement
              </Button>
            </div>

            <section>
              <h3 className="mb-3 text-sm font-semibold text-navy-900">
                Contact & Billing
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Primary contact</dt>
                  <dd className="font-medium">{selectedClient.primaryContact}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Email</dt>
                  <dd className="font-medium">{selectedClient.email}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Phone</dt>
                  <dd className="font-medium">{selectedClient.phone}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Responsible partner</dt>
                  <dd className="font-medium">
                    {selectedClient.responsiblePartner}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Billing preferences</dt>
                  <dd className="font-medium">
                    {selectedClient.billingPreferences}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Payment status</dt>
                  <dd>
                    <StatusBadge
                      status={paymentStatusKey(selectedClient.paymentStatus)}
                    />
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Risk level</dt>
                  <dd>
                    <Badge variant={riskVariant(selectedClient.riskLevel)}>
                      {selectedClient.riskLevel}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy-900">
                <Wallet className="h-4 w-4" />
                Financial Summary
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-muted">Total A/R</p>
                  <p className="text-lg font-semibold text-navy-900">
                    {formatCurrency(selectedClient.totalAr)}
                  </p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                  <p className="text-xs text-muted">Past due</p>
                  <p className="text-lg font-semibold text-amber-800">
                    {formatCurrency(selectedClient.pastDue)}
                  </p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50/50 p-3">
                  <p className="text-xs text-muted">90+ day balance</p>
                  <p className="text-lg font-semibold text-red-800">
                    {formatCurrency(selectedClient.balance90Plus)}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-muted">Trust balance</p>
                  <p className="text-lg font-semibold text-navy-900">
                    {formatCurrency(selectedClient.trustBalance)}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 sm:col-span-2">
                  <p className="text-xs text-muted">Unbilled WIP</p>
                  <p className="text-lg font-semibold text-navy-900">
                    {formatCurrency(selectedClient.unbilledWip)}
                  </p>
                </div>
              </div>
            </section>

            {relatedMatters.length > 0 && (
              <section>
                <h3 className="mb-3 text-sm font-semibold text-navy-900">
                  Related Matters ({relatedMatters.length})
                </h3>
                <ul className="space-y-2">
                  {relatedMatters.map((m) => (
                    <li
                      key={m.id}
                      className="rounded-lg border border-gray-200 p-3 text-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-navy-900">
                            {m.matterName}
                          </p>
                          <p className="text-xs text-muted">
                            {m.matterNumber} · {m.attorney}
                          </p>
                        </div>
                        <Badge variant="neutral">{m.matterStatus}</Badge>
                      </div>
                      <div className="mt-2 flex gap-4 text-xs text-muted">
                        <span>A/R: {formatCurrency(m.billedToDate - m.collectedToDate)}</span>
                        <span>WIP: {formatCurrency(m.unbilledWip)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {selectedClient.riskLevel === "Red" && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  High collection risk — past due balance exceeds firm threshold.
                  Review payment plan or escalate to responsible partner.
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
