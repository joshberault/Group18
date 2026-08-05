"use client";

import {
  Briefcase,
  Clock,
  DollarSign,
  Landmark,
  TrendingUp,
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
  invoiceStatusSummary,
  matterProfitability,
  monthlyCollectionsChart,
  recentActivity,
  ROLE_SUMMARY_CONTENT,
  ROLE_SUMMARY_TITLES,
  upcomingDeadlines,
} from "@/lib/mock-data/dashboard";
import { USER_ROLE_LABELS } from "@/lib/types";
import { formatCurrency, formatHours } from "@/lib/utils/cn";

export function DashboardContent() {
  const {
    selectedRole,
    hasPermission,
    dashboardTitle,
    dashboardDescription,
  } = useDemoRole();

  const showFirmKpis = hasPermission("view_firm_dashboard");
  const showTrust = hasPermission("view_trust_balances");
  const showAR = hasPermission("view_accounts_receivable");
  const showCollections = hasPermission("manage_collections");
  const showProfitability = hasPermission("view_profitability");
  const showInvoices = hasPermission("create_invoices");
  const showDeadlines = hasPermission("manage_tasks");
  const showMatters = hasPermission("view_assigned_matters") || hasPermission("manage_matters");

  return (
    <>
      <PageHeader
        title={dashboardTitle}
        description={`${USER_ROLE_LABELS[selectedRole]} view — ${dashboardDescription}`}
      />

      <Card className="mb-6 border-gold-500/30 bg-gradient-to-r from-navy-900 to-navy-800 text-white">
        <div className="p-6">
          <p className="text-sm font-medium text-gold-500">
            {ROLE_SUMMARY_TITLES[selectedRole]}
          </p>
          <p className="mt-2 text-sm text-gray-200">
            {ROLE_SUMMARY_CONTENT[selectedRole]}
          </p>
          <p className="mt-3 text-xs text-gray-400">
            Mock data — replace with live Supabase queries on your feature branch.
          </p>
        </div>
      </Card>

      {selectedRole === "firm_administrator" && (
        <div className="mb-6">
          <JobApplicationsPanel />
        </div>
      )}

      {(showFirmKpis || showMatters || showAR || showTrust || showCollections) && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {(showFirmKpis || showMatters) && (
            <KPICard
              title="Active Matters"
              value={String(dashboardKpis.activeMatters)}
              subtitle="Open across all practice groups"
              icon={Briefcase}
            />
          )}
          {hasPermission("enter_time") && (
            <KPICard
              title="Unbilled Time"
              value={formatHours(dashboardKpis.unbilledTimeHours)}
              subtitle="Pending approval or billing"
              icon={Clock}
            />
          )}
          {showAR && (
            <KPICard
              title="Outstanding A/R"
              value={formatCurrency(dashboardKpis.outstandingAR)}
              subtitle="Accounts receivable balance"
              icon={DollarSign}
            />
          )}
          {showTrust && (
            <KPICard
              title="Trust Funds Held"
              value={formatCurrency(dashboardKpis.trustFundsHeld)}
              subtitle="Client trust balances"
              icon={Landmark}
            />
          )}
          {showCollections && (
            <KPICard
              title="Monthly Collections"
              value={formatCurrency(dashboardKpis.monthlyCollections)}
              subtitle="Collected this month"
              trend="+8.2% vs. last month"
              icon={TrendingUp}
            />
          )}
        </div>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {showCollections && (
          <Card>
            <CardHeader>
              <CardTitle>Monthly Collections</CardTitle>
              <CardDescription>Mock trend data for dashboard visualization</CardDescription>
            </CardHeader>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyCollectionsChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#6b7280" />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                    tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Collections"]}
                  />
                  <Bar dataKey="amount" fill="#1e2a4a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {showDeadlines && (
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Deadlines</CardTitle>
              <CardDescription>Tasks and filing dates in the next two weeks</CardDescription>
            </CardHeader>
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
                {upcomingDeadlines.map((deadline) => (
                  <TableRow key={deadline.id}>
                    <TableCell className="font-medium">{deadline.matter}</TableCell>
                    <TableCell>{deadline.task}</TableCell>
                    <TableCell>{deadline.dueDate}</TableCell>
                    <TableCell>
                      <StatusBadge status={deadline.priority} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {showFirmKpis && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Firm-wide activity log preview</CardDescription>
            </CardHeader>
            <ul className="space-y-4">
              {recentActivity.map((activity) => (
                <li
                  key={activity.id}
                  className="flex flex-col gap-1 border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-navy-900">
                      {activity.action}
                    </p>
                    <span className="text-xs text-muted">{activity.timestamp}</span>
                  </div>
                  <p className="text-sm text-muted">{activity.detail}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <div className="space-y-6">
          {showProfitability && (
            <Card>
              <CardHeader>
                <CardTitle>Matter Profitability</CardTitle>
                <CardDescription>Revenue, costs, and margin by matter</CardDescription>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matter</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matterProfitability.map((matter) => (
                    <TableRow key={matter.matter}>
                      <TableCell className="font-medium">{matter.matter}</TableCell>
                      <TableCell>{formatCurrency(matter.revenue)}</TableCell>
                      <TableCell>{matter.margin}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {showInvoices && (
            <Card>
              <CardHeader>
                <CardTitle>Invoice Status Summary</CardTitle>
                <CardDescription>Count and total amount by invoice status</CardDescription>
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
                  {invoiceStatusSummary.map((row) => (
                    <TableRow key={row.status}>
                      <TableCell>
                        <StatusBadge status={row.status.toLowerCase().replace(" ", "_")} />
                      </TableCell>
                      <TableCell>{row.count}</TableCell>
                      <TableCell>{formatCurrency(row.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
