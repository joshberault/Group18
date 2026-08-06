"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Clock,
  DollarSign,
  Landmark,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { JobApplicationsPanel } from "@/components/admin/JobApplicationsPanel";
import { ParalegalDashboard } from "@/components/dashboard/ParalegalDashboard";
import { AttorneyDashboard } from "@/components/dashboard/AttorneyDashboard";
import { AccountingManagerDashboard } from "@/components/accounting-manager/dashboard/AccountingManagerDashboard";
import { PendingTimeApprovalsPanel } from "@/components/time/PendingTimeApprovalsPanel";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { KPICard } from "@/components/ui/KPICard";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  dashboardKpis,
  monthlyCollectionsChart,
  ROLE_SUMMARY_CONTENT,
  ROLE_SUMMARY_TITLES,
  ROLE_WELCOME_MESSAGES,
} from "@/lib/mock-data/dashboard";
import {
  getCollectionsThisMonthTotal,
  getFullyPaidInvoices,
  getMonthlyCollectionsFromPaidInvoices,
} from "@/lib/billing/collections-utils";
import { formatBillingOperationsSummary } from "@/lib/billing/operations-summary";
import {
  getManagedInvoicesSnapshot,
  getServerInvoicesSnapshot,
  subscribeInvoiceCatalog,
} from "@/lib/billing/invoice-management-store";
import { buildInvoiceStatusSummary } from "@/lib/billing/invoice-status-summary";
import {
  getOutstandingArTotal,
  getTrustFundsHeldDisplay,
  resolveUnbilledApprovedHours,
  fetchActiveOpenMattersCount,
} from "@/lib/dashboard/firm-kpis";
import { buildMatterProfitability } from "@/lib/dashboard/matter-profitability";
import type { MatterProfitabilityRow } from "@/lib/dashboard/matter-profitability";
import {
  buildRecentActivity,
  type ActivityItem,
} from "@/lib/dashboard/recent-activity";
import {
  fetchUpcomingDeadlines,
  type UpcomingDeadlineRow,
} from "@/lib/dashboard/upcoming-deadlines";
import { getOverdueInvoiceMetrics } from "@/lib/billing/receivables-utils";
import { invoicesHref } from "@/lib/billing/routes";
import { USER_ROLE_LABELS } from "@/lib/types";
import { formatCurrency, formatHours } from "@/lib/utils/cn";
import { EmptyState } from "@/components/ui/EmptyState";

/** Billing Specialist destinations for the firm Dashboard KPIs (not /billing). */
const BILLING_SPECIALIST_KPI_HREFS = {
  activeMatters: "/matters",
  unbilledTime: "/attorney/time",
  outstandingAR: "/receivables",
  trustFunds: "/accounting/trust",
  monthlyCollections: "/invoices?status=paid",
  overdueInvoices: invoicesHref({ view: "overdue" }),
} as const;

const MANAGING_PARTNER_KPI_HREFS = {
  activeMatters: "/matters",
  unbilledTime: "/billing",
  outstandingAR: "/receivables",
  trustFunds: "/accounting/trust",
  monthlyCollections: "/reports",
} as const;

const BILLING_SPECIALIST_QUICK_ACTIONS = [
  { label: "Create Invoice", href: "/invoices/generate" },
  { label: "View Invoices", href: "/invoices" },
  { label: "Accounts Receivable", href: "/receivables" },
] as const;

function statusBadgeKey(label: string): string {
  const map: Record<string, string> = {
    Draft: "draft",
    "Awaiting Approval": "pending",
    Sent: "sent",
    "Partially Paid": "partial",
    Paid: "paid",
    Overdue: "void",
    "Written Off": "written_off",
    Canceled: "void",
    Cancelled: "void",
  };
  return map[label] ?? label.toLowerCase().replace(/\s+/g, "_");
}

function DashboardKpiCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  href,
  interactive,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: string;
  href?: string;
  interactive: boolean;
}) {
  const card = (
    <KPICard
      title={title}
      value={value}
      subtitle={subtitle}
      icon={icon}
      trend={trend}
      className={interactive ? "transition-shadow hover:shadow-md" : undefined}
    />
  );

  if (!interactive || !href) {
    return card;
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <Link
        href={href}
        className="block flex-1 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-900 focus-visible:ring-offset-2"
        aria-label={`${title}: ${value}. View details`}
      >
        {card}
      </Link>
      <Link
        href={href}
        className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-semibold text-navy-900 transition-colors hover:bg-gray-50"
      >
        View Details
      </Link>
    </div>
  );
}

export function DashboardContent() {
  const router = useRouter();
  const { role } = useDemoRole();
  const isBillingSpecialist = role === "billing_specialist";

  const invoices = useSyncExternalStore(
    subscribeInvoiceCatalog,
    getManagedInvoicesSnapshot,
    getServerInvoicesSnapshot,
  );

  const [activeMattersCount, setActiveMattersCount] = useState<number | null>(
    null,
  );
  const [activeMattersLoading, setActiveMattersLoading] = useState(false);
  const [unbilledHours, setUnbilledHours] = useState<number | null>(null);
  const [unbilledLoading, setUnbilledLoading] = useState(false);

  useEffect(() => {
    if (!isBillingSpecialist) {
      setActiveMattersCount(null);
      setUnbilledHours(null);
      setActiveMattersLoading(false);
      setUnbilledLoading(false);
      return;
    }

    let cancelled = false;
    setActiveMattersLoading(true);
    setUnbilledLoading(true);

    void (async () => {
      const [matters, unbilled] = await Promise.all([
        fetchActiveOpenMattersCount(),
        resolveUnbilledApprovedHours(),
      ]);
      if (cancelled) return;
      setActiveMattersCount(matters);
      setUnbilledHours(unbilled.hours);
      setActiveMattersLoading(false);
      setUnbilledLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isBillingSpecialist]);

  const paidMonthlyCollections = useMemo(
    () => getMonthlyCollectionsFromPaidInvoices(invoices, 6),
    [invoices],
  );

  const collectionsThisMonth = useMemo(
    () => getCollectionsThisMonthTotal(getFullyPaidInvoices(invoices)),
    [invoices],
  );

  const outstandingAr = useMemo(
    () => getOutstandingArTotal(invoices),
    [invoices],
  );

  const overdueMetrics = useMemo(
    () => getOverdueInvoiceMetrics(invoices),
    [invoices],
  );

  const trustDisplay = getTrustFundsHeldDisplay();

  const collectionsChartData = isBillingSpecialist
    ? paidMonthlyCollections
    : monthlyCollectionsChart;

  const monthlyCollectionsKpiValue = isBillingSpecialist
    ? collectionsThisMonth
    : dashboardKpis.monthlyCollections;

  const monthlyCollectionsSubtitle = isBillingSpecialist
    ? "From fully paid invoices (this month)"
    : "Collected this month";

  const chartDescription = isBillingSpecialist
    ? "Last 6 months of collections from fully paid invoices in the billing catalog"
    : "Mock trend data for dashboard visualization";

  const billingOperationsSummaryText = useMemo(
    () => formatBillingOperationsSummary(invoices),
    [invoices],
  );

  const liveInvoiceStatusSummary = useMemo(
    () => buildInvoiceStatusSummary(invoices),
    [invoices],
  );

  const [deadlines, setDeadlines] = useState<UpcomingDeadlineRow[]>([]);
  const [deadlinesLoading, setDeadlinesLoading] = useState(true);
  const [deadlinesError, setDeadlinesError] = useState<string | null>(null);

  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  const [profitRows, setProfitRows] = useState<MatterProfitabilityRow[]>([]);
  const [profitLoading, setProfitLoading] = useState(true);
  const [profitError, setProfitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDeadlinesLoading(true);
    void (async () => {
      const result = await fetchUpcomingDeadlines(14);
      if (cancelled) return;
      setDeadlines(result.rows);
      setDeadlinesError(result.error);
      setDeadlinesLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setActivityLoading(true);
    void (async () => {
      const items = await buildRecentActivity(invoices, 12);
      if (cancelled) return;
      setActivity(items);
      setActivityLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [invoices]);

  useEffect(() => {
    let cancelled = false;
    setProfitLoading(true);
    void (async () => {
      const result = await buildMatterProfitability(invoices, 8);
      if (cancelled) return;
      setProfitRows(result.rows);
      setProfitError(result.error);
      setProfitLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [invoices]);

  const summaryBody = isBillingSpecialist
    ? billingOperationsSummaryText
    : ROLE_SUMMARY_CONTENT[role];

  const summaryFootnote = isBillingSpecialist
    ? "Live from the shared invoice catalog — updates when invoices change."
    : "Mock data — replace with live Supabase queries on your feature branch.";

  const activeMattersValue = isBillingSpecialist
    ? activeMattersLoading
      ? "…"
      : activeMattersCount != null
        ? String(activeMattersCount)
        : "—"
    : String(dashboardKpis.activeMatters);

  const activeMattersSubtitle = isBillingSpecialist
    ? activeMattersCount != null
      ? "Open matters in firm catalog"
      : activeMattersLoading
        ? "Loading open matters…"
        : "Matters data unavailable"
    : "Open across all practice groups";

  const unbilledTimeValue = isBillingSpecialist
    ? unbilledLoading
      ? "…"
      : unbilledHours != null
        ? formatHours(unbilledHours)
        : "—"
    : formatHours(dashboardKpis.unbilledTimeHours);

  const unbilledTimeSubtitle = isBillingSpecialist
    ? "Approved & not yet billed"
    : "Pending approval or billing";

  const outstandingArValue = isBillingSpecialist
    ? formatCurrency(outstandingAr)
    : formatCurrency(dashboardKpis.outstandingAR);

  const outstandingArSubtitle = isBillingSpecialist
    ? "From AR on open invoices"
    : "Accounts receivable balance";

  const trustFundsValue = isBillingSpecialist
    ? trustDisplay.kind === "unavailable"
      ? trustDisplay.message
      : formatCurrency(trustDisplay.value)
    : formatCurrency(dashboardKpis.trustFundsHeld);

  const trustFundsSubtitle = isBillingSpecialist
    ? "Trust ledger not connected"
    : "Client trust balances";

  if (role === "paralegal") {
    return <ParalegalDashboard />;
  }

  if (role === "attorney") {
    return <AttorneyDashboard />;
  }

  if (role === "accounting_manager") {
    return <AccountingManagerDashboard />;
  }

  const isManagingPartner = role === "managing_partner";

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${USER_ROLE_LABELS[role]} view — ${ROLE_WELCOME_MESSAGES[role]}`}
      />

      <Card className="mb-6 border-gold-500/30 bg-gradient-to-r from-navy-900 to-navy-800 text-white">
        <div className="p-6">
          <p className="text-sm font-medium text-gold-500">
            {ROLE_SUMMARY_TITLES[role]}
          </p>
          <p className="mt-2 text-sm text-gray-200">{summaryBody}</p>
          <p className="mt-3 text-xs text-gray-400">{summaryFootnote}</p>
          {isBillingSpecialist ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {BILLING_SPECIALIST_QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-gold-500 px-3 text-sm font-semibold text-navy-950 transition-colors hover:bg-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </Card>

      {role === "firm_administrator" && (
        <div className="mb-6">
          <JobApplicationsPanel />
        </div>
      )}

      {(role === "managing_partner" || role === "firm_administrator") && (
        <div className="mb-6">
          <PendingTimeApprovalsPanel adminLink={role === "firm_administrator"} />
        </div>
      )}

      <div
        className={
          isBillingSpecialist
            ? "mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3"
            : "mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        }
      >
        <DashboardKpiCard
          title="Active Matters"
          value={activeMattersValue}
          subtitle={activeMattersSubtitle}
          icon={Briefcase}
          href={
            isBillingSpecialist
              ? BILLING_SPECIALIST_KPI_HREFS.activeMatters
              : isManagingPartner
                ? MANAGING_PARTNER_KPI_HREFS.activeMatters
                : undefined
          }
          interactive={isBillingSpecialist || isManagingPartner}
        />
        <DashboardKpiCard
          title="Unbilled Time"
          value={unbilledTimeValue}
          subtitle={unbilledTimeSubtitle}
          icon={Clock}
          href={
            isBillingSpecialist
              ? BILLING_SPECIALIST_KPI_HREFS.unbilledTime
              : isManagingPartner
                ? MANAGING_PARTNER_KPI_HREFS.unbilledTime
                : undefined
          }
          interactive={isBillingSpecialist || isManagingPartner}
        />
        <DashboardKpiCard
          title="Outstanding A/R"
          value={outstandingArValue}
          subtitle={outstandingArSubtitle}
          icon={DollarSign}
          href={
            isBillingSpecialist
              ? BILLING_SPECIALIST_KPI_HREFS.outstandingAR
              : isManagingPartner
                ? MANAGING_PARTNER_KPI_HREFS.outstandingAR
                : undefined
          }
          interactive={isBillingSpecialist || isManagingPartner}
        />
        <DashboardKpiCard
          title="Trust Funds Held"
          value={trustFundsValue}
          subtitle={trustFundsSubtitle}
          icon={Landmark}
          href={
            isBillingSpecialist
              ? BILLING_SPECIALIST_KPI_HREFS.trustFunds
              : isManagingPartner
                ? MANAGING_PARTNER_KPI_HREFS.trustFunds
                : undefined
          }
          interactive={isBillingSpecialist || isManagingPartner}
        />
        <DashboardKpiCard
          title="Monthly Collections"
          value={formatCurrency(monthlyCollectionsKpiValue)}
          subtitle={monthlyCollectionsSubtitle}
          trend={isBillingSpecialist ? undefined : "+8.2% vs. last month"}
          icon={TrendingUp}
          href={
            isBillingSpecialist
              ? BILLING_SPECIALIST_KPI_HREFS.monthlyCollections
              : isManagingPartner
                ? MANAGING_PARTNER_KPI_HREFS.monthlyCollections
                : undefined
          }
          interactive={isBillingSpecialist || isManagingPartner}
        />
        {isBillingSpecialist ? (
          <DashboardKpiCard
            title="Overdue Invoices"
            value={String(overdueMetrics.count)}
            subtitle={`${formatCurrency(overdueMetrics.amount)} overdue`}
            icon={AlertTriangle}
            href={BILLING_SPECIALIST_KPI_HREFS.overdueInvoices}
            interactive
          />
        ) : null}
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Collections</CardTitle>
            <CardDescription>{chartDescription}</CardDescription>
          </CardHeader>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={collectionsChartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#6b7280" />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Collections"]}
                />
                <Bar dataKey="amount" fill="#1e2a4a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
            <CardDescription>
              Tasks and filings due in the next 14 days (from Matters workflow)
            </CardDescription>
          </CardHeader>
          {deadlinesLoading ? (
            <p className="px-4 pb-4 text-sm text-muted">Loading deadlines…</p>
          ) : deadlinesError && deadlines.length === 0 ? (
            <div className="px-2 pb-2">
              <EmptyState
                title="No upcoming deadlines"
                description={
                  deadlinesError.includes("not configured")
                    ? "Connect Supabase to load tasks and filings from Matter records."
                    : "Could not load deadlines with the current permissions, or none are due in the next two weeks."
                }
                className="py-10"
              />
            </div>
          ) : deadlines.length === 0 ? (
            <div className="px-2 pb-2">
              <EmptyState
                title="No upcoming deadlines"
                description="No tasks or filings are due in the next 14 days."
                className="py-10"
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matter</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deadlines.map((deadline) => (
                  <TableRow
                    key={deadline.id}
                    className="cursor-pointer transition-colors hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy-900"
                    tabIndex={0}
                    role="link"
                    aria-label={`Open matter ${deadline.matterName}`}
                    onClick={() => router.push(deadline.href)}
                    onKeyDown={(e: KeyboardEvent<HTMLTableRowElement>) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(deadline.href);
                      }
                    }}
                  >
                    <TableCell className="font-medium">
                      {deadline.matterName}
                    </TableCell>
                    <TableCell>{deadline.task}</TableCell>
                    <TableCell>{deadline.dueDate}</TableCell>
                    <TableCell>
                      <StatusBadge status={deadline.priority} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Live events from Billing, Clients, Matters, and Time &amp; Expenses
            </CardDescription>
          </CardHeader>
          {activityLoading ? (
            <p className="px-4 pb-4 text-sm text-muted">Loading activity…</p>
          ) : activity.length === 0 ? (
            <div className="px-2 pb-2">
              <EmptyState
                title="No recent activity"
                description="Activity will appear as invoices, payments, clients, matters, and time entries are recorded."
                className="py-10"
              />
            </div>
          ) : (
            <ul className="space-y-4 px-4 pb-4">
              {activity.map((item) => {
                const body = (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-navy-900">
                        {item.action}
                      </p>
                      <span className="text-xs text-muted">{item.timestamp}</span>
                    </div>
                    <p className="text-sm text-muted">{item.detail}</p>
                  </>
                );
                return (
                  <li
                    key={item.id}
                    className="border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                  >
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="flex flex-col gap-1 rounded-md transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-900"
                      >
                        {body}
                      </Link>
                    ) : (
                      <div className="flex flex-col gap-1">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Matter Profitability</CardTitle>
              <CardDescription>
                Revenue from invoices; cost from approved billable time &amp;
                expenses
              </CardDescription>
            </CardHeader>
            {profitLoading ? (
              <p className="px-4 pb-4 text-sm text-muted">
                Loading profitability…
              </p>
            ) : profitError && profitRows.length === 0 ? (
              <div className="px-2 pb-2">
                <EmptyState
                  title="No matter profitability data yet"
                  description={profitError}
                  className="py-10"
                />
              </div>
            ) : profitRows.length === 0 ? (
              <div className="px-2 pb-2">
                <EmptyState
                  title="No matter profitability data yet"
                  description="Profitability appears after invoices and approved time are recorded."
                  className="py-10"
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matter</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitRows.map((matter) => (
                    <TableRow
                      key={`${matter.matterName}-${matter.matterId ?? "x"}`}
                      className="cursor-pointer transition-colors hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy-900"
                      tabIndex={0}
                      role="link"
                      aria-label={`Open matter ${matter.matterName}`}
                      onClick={() => router.push(matter.href)}
                      onKeyDown={(e: KeyboardEvent<HTMLTableRowElement>) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(matter.href);
                        }
                      }}
                    >
                      <TableCell className="font-medium">
                        {matter.matterName}
                      </TableCell>
                      <TableCell>{formatCurrency(matter.revenue)}</TableCell>
                      <TableCell>
                        {formatCurrency(matter.billableCost)}
                      </TableCell>
                      <TableCell>{formatCurrency(matter.profit)}</TableCell>
                      <TableCell>{matter.margin}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice Status Summary</CardTitle>
              <CardDescription>
                Live counts and amounts from Invoice Management — click a row to
                open that status
              </CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liveInvoiceStatusSummary.map((row) => (
                  <TableRow
                    key={row.key}
                    className="cursor-pointer transition-colors hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy-900"
                    tabIndex={0}
                    role="link"
                    aria-label={`View ${row.label} invoices in Invoice Management`}
                    onClick={() => router.push(row.href)}
                    onKeyDown={(e: KeyboardEvent<HTMLTableRowElement>) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(row.href);
                      }
                    }}
                  >
                    <TableCell>
                      <StatusBadge status={statusBadgeKey(row.label)} />
                    </TableCell>
                    <TableCell>{row.count}</TableCell>
                    <TableCell>{formatCurrency(row.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </>
  );
}
