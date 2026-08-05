"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  FileDown,
  FileText,
  Landmark,
  Star,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  amClients,
  amMatters,
} from "@/lib/mock-data/accounting-manager/entities";
import { exportToCsv } from "@/lib/accounting-manager/export-csv";
import { formatCurrency } from "@/lib/utils/cn";
import { AccountingTabs } from "@/components/accounting-manager/shared/AccountingTabs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Toast } from "@/components/ui/Toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

interface ReportDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: typeof FileText;
}

const REPORT_CATALOG: ReportDefinition[] = [
  {
    id: "income_statement",
    name: "Income Statement",
    category: "Financial Statements",
    description: "Revenue, expenses, and net income for the period",
    icon: TrendingUp,
  },
  {
    id: "balance_sheet",
    name: "Balance Sheet",
    category: "Financial Statements",
    description: "Assets, liabilities, and equity snapshot",
    icon: BarChart3,
  },
  {
    id: "ar_aging",
    name: "A/R Aging",
    category: "Receivables",
    description: "Outstanding receivables by aging bucket",
    icon: Wallet,
  },
  {
    id: "trust_balances",
    name: "Trust Balances",
    category: "Trust",
    description: "Client trust fund balances by client",
    icon: Landmark,
  },
  {
    id: "matter_profitability",
    name: "Matter Profitability",
    category: "Profitability",
    description: "Margin and collection analysis by matter",
    icon: TrendingUp,
  },
  {
    id: "ap_aging",
    name: "AP Aging",
    category: "Payables",
    description: "Outstanding vendor invoices by aging bucket",
    icon: FileText,
  },
];

const CATEGORIES = [
  "All",
  "Financial Statements",
  "Receivables",
  "Trust",
  "Profitability",
  "Payables",
] as const;

const INCOME_STATEMENT = [
  { line: "Legal Services Revenue", amount: 2845000, type: "revenue" },
  { line: "Flat Fee Revenue", amount: 412000, type: "revenue" },
  { line: "Other Revenue", amount: 48500, type: "revenue" },
  { line: "Total Revenue", amount: 3605500, type: "subtotal" },
  { line: "Attorney Compensation", amount: 1420000, type: "expense" },
  { line: "Staff Compensation", amount: 385000, type: "expense" },
  { line: "Office & Facilities", amount: 198000, type: "expense" },
  { line: "Technology", amount: 124000, type: "expense" },
  { line: "Professional Services", amount: 67000, type: "expense" },
  { line: "Total Expenses", amount: 2164000, type: "subtotal" },
  { line: "Net Income", amount: 1441500, type: "total" },
];

const BALANCE_SHEET = [
  { line: "Cash & Operating Accounts", amount: 892400, section: "Assets" },
  { line: "Accounts Receivable", amount: 428750, section: "Assets" },
  { line: "Client Trust (IOLTA)", amount: 892400, section: "Assets" },
  { line: "Prepaid Expenses", amount: 42000, section: "Assets" },
  { line: "Total Assets", amount: 2370650, section: "Assets" },
  { line: "Accounts Payable", amount: 186200, section: "Liabilities" },
  { line: "Accrued Expenses", amount: 94500, section: "Liabilities" },
  { line: "Client Trust Liability", amount: 892400, section: "Liabilities" },
  { line: "Total Liabilities", amount: 1193100, section: "Liabilities" },
  { line: "Partner Equity", amount: 1178250, section: "Equity" },
  { line: "Total Liabilities & Equity", amount: 2370650, section: "Equity" },
];

const AP_AGING = [
  {
    vendor: "Westlake Office Supplies",
    invoice: "INV-8842",
    amount: 4250,
    bucket: "0–30",
    dueDate: "2026-03-15",
  },
  {
    vendor: "Legal Tech Solutions",
    invoice: "LTS-2026-041",
    amount: 12800,
    bucket: "31–60",
    dueDate: "2026-02-28",
  },
  {
    vendor: "Metro Court Reporting",
    invoice: "MCR-1189",
    amount: 3600,
    bucket: "0–30",
    dueDate: "2026-03-20",
  },
  {
    vendor: "Summit IT Services",
    invoice: "SIT-3344",
    amount: 8900,
    bucket: "61–90",
    dueDate: "2026-01-15",
  },
  {
    vendor: "Downtown Parking LLC",
    invoice: "DP-2026-02",
    amount: 2100,
    bucket: "90+",
    dueDate: "2025-11-30",
  },
  {
    vendor: "Expert Witness — Dr. Patel",
    invoice: "EW-0891",
    amount: 6500,
    bucket: "31–60",
    dueDate: "2026-03-01",
  },
];

function computeArAging() {
  const buckets = [
    { bucket: "0–30 Days", amount: 0, clients: 0 },
    { bucket: "31–60 Days", amount: 0, clients: 0 },
    { bucket: "61–90 Days", amount: 0, clients: 0 },
    { bucket: "90+ Days", amount: 0, clients: 0 },
  ];

  amClients.forEach((c) => {
    if (c.totalAr <= 0) return;
    const current = c.totalAr - c.pastDue;
    if (current > 0) {
      buckets[0].amount += current;
      buckets[0].clients += 1;
    }
    const pastDueNot90 = c.pastDue - c.balance90Plus;
    if (pastDueNot90 > 0) {
      buckets[1].amount += Math.min(pastDueNot90, c.pastDue * 0.4);
      buckets[1].clients += 1;
    }
    if (c.balance90Plus > 0) {
      const mid = c.balance90Plus * 0.3;
      buckets[2].amount += mid;
      buckets[2].clients += 1;
      buckets[3].amount += c.balance90Plus - mid;
      buckets[3].clients += 1;
    }
  });

  return buckets;
}

export function AccountingManagerReportsView() {
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [activeReport, setActiveReport] = useState<string>("income_statement");
  const [favorites, setFavorites] = useState<string[]>([
    "income_statement",
    "ar_aging",
  ]);
  const [reportSearch, setReportSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [arOfficeFilter, setArOfficeFilter] = useState("all");
  const [profitabilitySort, setProfitabilitySort] = useState<
    "margin" | "collected" | "name"
  >("margin");

  const arAging = useMemo(() => computeArAging(), []);

  const filteredCatalog = useMemo(() => {
    let list = REPORT_CATALOG;
    if (categoryFilter !== "All") {
      list = list.filter((r) => r.category === categoryFilter);
    }
    if (reportSearch) {
      const q = reportSearch.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q),
      );
    }
    return list;
  }, [categoryFilter, reportSearch]);

  const favoriteReports = REPORT_CATALOG.filter((r) =>
    favorites.includes(r.id),
  );

  const toggleFavorite = (reportId: string) => {
    setFavorites((prev) =>
      prev.includes(reportId)
        ? prev.filter((id) => id !== reportId)
        : [...prev, reportId],
    );
    setToast(
      favorites.includes(reportId)
        ? "Removed from favorites."
        : "Added to favorites.",
    );
  };

  const exportReport = () => {
    const report = REPORT_CATALOG.find((r) => r.id === activeReport);
    if (!report) return;

    switch (activeReport) {
      case "income_statement":
        exportToCsv(
          "income-statement.csv",
          ["Line Item", "Amount"],
          INCOME_STATEMENT.map((r) => [r.line, String(r.amount)]),
        );
        break;
      case "balance_sheet":
        exportToCsv(
          "balance-sheet.csv",
          ["Section", "Line Item", "Amount"],
          BALANCE_SHEET.map((r) => [r.section, r.line, String(r.amount)]),
        );
        break;
      case "ar_aging":
        exportToCsv(
          "ar-aging.csv",
          ["Aging Bucket", "Amount", "Client Count"],
          arAging.map((r) => [
            r.bucket,
            String(Math.round(r.amount)),
            String(r.clients),
          ]),
        );
        break;
      case "trust_balances":
        exportToCsv(
          "trust-balances.csv",
          ["Client", "Client Number", "Trust Balance", "Office"],
          amClients
            .filter((c) => c.trustBalance > 0)
            .map((c) => [
              c.name,
              c.clientNumber,
              String(c.trustBalance),
              c.office,
            ]),
        );
        break;
      case "matter_profitability":
        exportToCsv(
          "matter-profitability.csv",
          [
            "Matter",
            "Client",
            "Billed",
            "Collected",
            "Margin %",
            "Outstanding",
          ],
          amMatters.map((m) => [
            m.matterName,
            m.client,
            String(m.billedToDate),
            String(m.collectedToDate),
            String(m.marginPercent),
            String(m.billedToDate - m.collectedToDate),
          ]),
        );
        break;
      case "ap_aging":
        exportToCsv(
          "ap-aging.csv",
          ["Vendor", "Invoice", "Amount", "Bucket", "Due Date"],
          AP_AGING.map((r) => [
            r.vendor,
            r.invoice,
            String(r.amount),
            r.bucket,
            r.dueDate,
          ]),
        );
        break;
    }
    setToast(`${report.name} exported to CSV.`);
  };

  const profitabilityRows = useMemo(() => {
    const rows = [...amMatters];
    if (profitabilitySort === "margin") {
      rows.sort((a, b) => b.marginPercent - a.marginPercent);
    } else if (profitabilitySort === "collected") {
      rows.sort((a, b) => b.collectedToDate - a.collectedToDate);
    } else {
      rows.sort((a, b) => a.matterName.localeCompare(b.matterName));
    }
    return rows;
  }, [profitabilitySort]);

  const trustClients = useMemo(() => {
    return amClients
      .filter((c) => c.trustBalance > 0)
      .sort((a, b) => b.trustBalance - a.trustBalance);
  }, []);

  const filteredArClients = useMemo(() => {
    if (arOfficeFilter === "all") return amClients.filter((c) => c.totalAr > 0);
    return amClients.filter(
      (c) => c.totalAr > 0 && c.office === arOfficeFilter,
    );
  }, [arOfficeFilter]);

  const renderReportWorkspace = () => {
    switch (activeReport) {
      case "income_statement":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Income Statement</CardTitle>
              <CardDescription>
                Year-to-date · All offices · Generated Mar 5, 2026
              </CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Line Item</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {INCOME_STATEMENT.map((row) => (
                  <TableRow
                    key={row.line}
                    className={
                      row.type === "subtotal" || row.type === "total"
                        ? "bg-gray-50 font-semibold"
                        : undefined
                    }
                  >
                    <TableCell>{row.line}</TableCell>
                    <TableCell className="text-right">
                      {row.type === "expense" ? "(" : ""}
                      {formatCurrency(row.amount)}
                      {row.type === "expense" ? ")" : ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        );

      case "balance_sheet":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Balance Sheet</CardTitle>
              <CardDescription>
                As of Mar 5, 2026 · Consolidated firm view
              </CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Line Item</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {BALANCE_SHEET.map((row) => (
                  <TableRow
                    key={row.line}
                    className={
                      row.line.startsWith("Total")
                        ? "bg-gray-50 font-semibold"
                        : undefined
                    }
                  >
                    <TableCell>
                      <Badge variant="neutral">{row.section}</Badge>
                    </TableCell>
                    <TableCell>{row.line}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        );

      case "ar_aging":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>A/R Aging Summary</CardTitle>
                <CardDescription>
                  Outstanding receivables by aging bucket
                </CardDescription>
              </CardHeader>
              <div className="px-6 pb-6">
                <Select
                  label="Office filter"
                  value={arOfficeFilter}
                  onChange={(e) => setArOfficeFilter(e.target.value)}
                  options={[
                    { value: "all", label: "All offices" },
                    { value: "Chicago", label: "Chicago" },
                    { value: "New York", label: "New York" },
                    { value: "Los Angeles", label: "Los Angeles" },
                    { value: "Dallas", label: "Dallas" },
                  ]}
                />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aging Bucket</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Clients</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arAging.map((row) => (
                    <TableRow key={row.bucket}>
                      <TableCell className="font-medium">
                        {row.bucket}
                      </TableCell>
                      <TableCell>{formatCurrency(Math.round(row.amount))}</TableCell>
                      <TableCell>{row.clients}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Client Detail</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Total A/R</TableHead>
                    <TableHead>Past Due</TableHead>
                    <TableHead>90+</TableHead>
                    <TableHead>Office</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArClients.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{formatCurrency(c.totalAr)}</TableCell>
                      <TableCell>{formatCurrency(c.pastDue)}</TableCell>
                      <TableCell>{formatCurrency(c.balance90Plus)}</TableCell>
                      <TableCell>{c.office}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        );

      case "trust_balances":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Trust Balances by Client</CardTitle>
              <CardDescription>
                Total held:{" "}
                {formatCurrency(
                  trustClients.reduce((s, c) => s + c.trustBalance, 0),
                )}
              </CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Trust Balance</TableHead>
                  <TableHead>Office</TableHead>
                  <TableHead>Partner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trustClients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.clientNumber}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(c.trustBalance)}
                    </TableCell>
                    <TableCell>{c.office}</TableCell>
                    <TableCell>{c.responsiblePartner}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        );

      case "matter_profitability":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Matter Profitability</CardTitle>
              <CardDescription>
                Margin and collection performance by matter
              </CardDescription>
            </CardHeader>
            <div className="px-6 pb-4">
              <Select
                label="Sort by"
                value={profitabilitySort}
                onChange={(e) =>
                  setProfitabilitySort(
                    e.target.value as "margin" | "collected" | "name",
                  )
                }
                options={[
                  { value: "margin", label: "Margin %" },
                  { value: "collected", label: "Collected amount" },
                  { value: "name", label: "Matter name" },
                ]}
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matter</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Attorney</TableHead>
                  <TableHead>Billed</TableHead>
                  <TableHead>Collected</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profitabilityRows.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.matterName}
                    </TableCell>
                    <TableCell>{m.client}</TableCell>
                    <TableCell>{m.attorney}</TableCell>
                    <TableCell>{formatCurrency(m.billedToDate)}</TableCell>
                    <TableCell>{formatCurrency(m.collectedToDate)}</TableCell>
                    <TableCell>
                      {formatCurrency(m.billedToDate - m.collectedToDate)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          m.marginPercent >= 40
                            ? "success"
                            : m.marginPercent >= 30
                              ? "gold"
                              : "warning"
                        }
                      >
                        {m.marginPercent}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        );

      case "ap_aging":
        return (
          <Card>
            <CardHeader>
              <CardTitle>AP Aging</CardTitle>
              <CardDescription>
                Outstanding vendor invoices · Total:{" "}
                {formatCurrency(AP_AGING.reduce((s, r) => s + r.amount, 0))}
              </CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Bucket</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {AP_AGING.map((row) => (
                  <TableRow
                    key={row.invoice}
                    className={
                      row.bucket === "90+" ? "bg-red-50/40" : undefined
                    }
                  >
                    <TableCell className="font-medium">{row.vendor}</TableCell>
                    <TableCell>{row.invoice}</TableCell>
                    <TableCell>{formatCurrency(row.amount)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.bucket === "90+"
                            ? "danger"
                            : row.bucket === "61–90"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {row.bucket}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.dueDate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        );

      default:
        return null;
    }
  };

  const activeReportDef = REPORT_CATALOG.find((r) => r.id === activeReport);

  return (
    <>
      <PageHeader
        title="Report Center"
        description="Financial statements, aging reports, trust balances, and profitability analytics."
      >
        <Button variant="secondary" onClick={exportReport}>
          <FileDown className="h-4 w-4" />
          Export CSV
        </Button>
      </PageHeader>

      {favoriteReports.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-4 w-4 text-gold-500" />
              Favorites
            </CardTitle>
            <CardDescription>Quick access to saved reports</CardDescription>
          </CardHeader>
          <div className="flex flex-wrap gap-2 px-6 pb-6">
            {favoriteReports.map((report) => (
              <Button
                key={report.id}
                variant={activeReport === report.id ? "primary" : "secondary"}
                size="sm"
                onClick={() => setActiveReport(report.id)}
              >
                {report.name}
              </Button>
            ))}
          </div>
        </Card>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card padding="sm">
          <div className="space-y-4 p-2">
            <Input
              placeholder="Search reports..."
              value={reportSearch}
              onChange={(e) => setReportSearch(e.target.value)}
            />
            <AccountingTabs
              tabs={CATEGORIES.map((c) => ({ id: c, label: c }))}
              activeTab={categoryFilter}
              onChange={setCategoryFilter}
            />
            <ul className="space-y-1">
              {filteredCatalog.map((report) => {
                const Icon = report.icon;
                const isFavorite = favorites.includes(report.id);
                return (
                  <li key={report.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveReport(report.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setActiveReport(report.id);
                        }
                      }}
                      className={`flex w-full cursor-pointer items-start gap-3 rounded-lg p-3 text-left transition-colors ${
                        activeReport === report.id
                          ? "bg-navy-900 text-white"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 mt-0.5 ${
                          activeReport === report.id
                            ? "text-gold-400"
                            : "text-muted"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">
                            {report.name}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(report.id);
                            }}
                            className="shrink-0"
                            aria-label={
                              isFavorite
                                ? "Remove from favorites"
                                : "Add to favorites"
                            }
                          >
                            <Star
                              className={`h-3.5 w-3.5 ${
                                isFavorite
                                  ? "fill-gold-400 text-gold-400"
                                  : activeReport === report.id
                                    ? "text-gray-400"
                                    : "text-gray-300"
                              }`}
                            />
                          </button>
                        </div>
                        <p
                          className={`mt-0.5 text-xs ${
                            activeReport === report.id
                              ? "text-gray-300"
                              : "text-muted"
                          }`}
                        >
                          {report.description}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </Card>

        <div>
          {activeReportDef && (
            <div className="mb-4 flex items-center gap-2">
              <Badge variant="gold">{activeReportDef.category}</Badge>
              <h2 className="text-lg font-semibold text-navy-900">
                {activeReportDef.name}
              </h2>
            </div>
          )}
          {renderReportWorkspace()}
        </div>
      </div>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
