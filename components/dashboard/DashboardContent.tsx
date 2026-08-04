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
  ROLE_WELCOME_MESSAGES,
  upcomingDeadlines,
} from "@/lib/mock-data/dashboard";
import { USER_ROLE_LABELS } from "@/lib/types";
import { formatCurrency, formatHours } from "@/lib/utils/cn";

export function DashboardContent() {
  const { role } = useDemoRole();

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
          <p className="mt-2 text-sm text-gray-200">
            {ROLE_SUMMARY_CONTENT[role]}
          </p>
          <p className="mt-3 text-xs text-gray-400">
            Mock data — replace with live Supabase queries on your feature branch.
          </p>
        </div>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KPICard
          title="Active Matters"
          value={String(dashboardKpis.activeMatters)}
          subtitle="Open across all practice groups"
          icon={Briefcase}
        />
        <KPICard
          title="Unbilled Time"
          value={formatHours(dashboardKpis.unbilledTimeHours)}
          subtitle="Pending approval or billing"
          icon={Clock}
        />
        <KPICard
          title="Outstanding A/R"
          value={formatCurrency(dashboardKpis.outstandingAR)}
          subtitle="Accounts receivable balance"
          icon={DollarSign}
        />
        <KPICard
          title="Trust Funds Held"
          value={formatCurrency(dashboardKpis.trustFundsHeld)}
          subtitle="Client trust balances"
          icon={Landmark}
        />
        <KPICard
          title="Monthly Collections"
          value={formatCurrency(dashboardKpis.monthlyCollections)}
          subtitle="Collected this month"
          trend="+8.2% vs. last month"
          icon={TrendingUp}
        />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
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
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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

        <div className="space-y-6">
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
        </div>
      </div>
    </>
  );
}
