"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  Download,
  FileText,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  getRecurringPayment,
  RECURRING_PAYMENT_EVENT,
  type RecurringPaymentSetup,
} from "@/lib/client-portal/payment-store";
import {
  accountRiskControls,
  clientAccountSummary,
  invoiceCharges,
} from "@/lib/mock-data/client-portal";
import { formatCurrency } from "@/lib/utils/cn";

type SummaryView = "home" | "invoice" | "payment-plan";

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Every two weeks",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

function addScheduleDate(start: Date, frequency: string, index: number) {
  const next = new Date(start);
  if (frequency === "weekly") next.setDate(start.getDate() + 7 * index);
  else if (frequency === "biweekly") next.setDate(start.getDate() + 14 * index);
  else if (frequency === "quarterly") next.setMonth(start.getMonth() + 3 * index);
  else next.setMonth(start.getMonth() + index);
  return next;
}

function buildPaymentSchedule(setup: RecurringPaymentSetup) {
  const start = new Date(`${setup.startDate}T12:00:00`);
  const end = new Date(`${setup.endDate}T12:00:00`);
  const rows: Array<{ dueDate: string; amount: number }> = [];

  for (let index = 0; index < 36; index += 1) {
    const due = addScheduleDate(start, setup.frequency, index);
    if (due > end) break;
    rows.push({
      dueDate: due.toISOString().slice(0, 10),
      amount: setup.amount,
    });
  }

  return rows;
}

function ControlStatusBadge({ status }: { status: "clear" | "review" | "matched" }) {
  if (status === "clear" || status === "matched") {
    return <Badge variant="success">Clear</Badge>;
  }
  return <Badge variant="warning">Review</Badge>;
}

export function AccountSummary() {
  const [view, setView] = useState<SummaryView>("home");
  const [recurring, setRecurring] = useState<RecurringPaymentSetup | null>(null);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);

  const refreshRecurring = useCallback(() => {
    setRecurring(getRecurringPayment());
  }, []);

  useEffect(() => {
    refreshRecurring();
    window.addEventListener(RECURRING_PAYMENT_EVENT, refreshRecurring);
    return () =>
      window.removeEventListener(RECURRING_PAYMENT_EVENT, refreshRecurring);
  }, [refreshRecurring]);

  const paymentSchedule = useMemo(
    () => (recurring ? buildPaymentSchedule(recurring) : []),
    [recurring],
  );
  const upcomingPayments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return paymentSchedule.filter(
      (payment) => new Date(`${payment.dueDate}T12:00:00`) >= today,
    );
  }, [paymentSchedule]);

  const chargeTotal = invoiceCharges.reduce(
    (sum, charge) => sum + charge.amount,
    0,
  );
  const unpaidChargeTotal = invoiceCharges
    .filter((charge) => charge.status === "unpaid")
    .reduce((sum, charge) => sum + charge.amount, 0);

  function handleDownloadInvoices() {
    const lines = [
      "CounselFlow Invoice Export",
      `Client: ${clientAccountSummary.clientName}`,
      `Account: ${clientAccountSummary.accountNumber}`,
      "",
      ...invoiceCharges.map(
        (charge) =>
          `${charge.invoiceNumber},${charge.chargeDate},${charge.amount},${charge.status},${charge.reason}`,
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `counselflow-invoices-${clientAccountSummary.accountNumber}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setDownloadMessage("Invoice export downloaded.");
  }

  if (view === "invoice") {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => setView("home")}
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-navy-900 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Account Summary
        </button>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Invoice balance summary</CardTitle>
                <CardDescription>
                  Invoice totals, remaining balance, hours, schedule, and charge
                  breakdown.
                </CardDescription>
              </div>
              <Button type="button" variant="secondary" onClick={handleDownloadInvoices}>
                <Download className="h-4 w-4" />
                Download invoices
              </Button>
            </div>
          </CardHeader>

          {downloadMessage && (
            <p className="mb-4 rounded-lg bg-gold-100 px-3 py-2 text-sm text-navy-900">
              {downloadMessage}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryMetric
              label="Invoice total"
              value={formatCurrency(clientAccountSummary.invoiceTotal)}
            />
            <SummaryMetric
              label="Remaining balance"
              value={formatCurrency(clientAccountSummary.remainingBalance)}
            />
            <SummaryMetric
              label="Attorney hours submitted"
              value={`${clientAccountSummary.hoursSubmitted.attorneys.toFixed(1)} hrs`}
            />
            <SummaryMetric
              label="Paralegal hours submitted"
              value={`${clientAccountSummary.hoursSubmitted.paralegals.toFixed(1)} hrs`}
            />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment schedule</CardTitle>
            <CardDescription>
              Due dates aligned to the recurring payment set up in Pay Balance.
            </CardDescription>
          </CardHeader>

          {!recurring || paymentSchedule.length === 0 ? (
            <p className="text-sm text-muted">
              No recurring payment schedule is set up yet. Create one in Pay
              Balance to see aligning due dates here.
            </p>
          ) : (
            <>
              <p className="mb-4 text-sm text-navy-900">
                {FREQUENCY_LABELS[recurring.frequency] ?? recurring.frequency}{" "}
                payments of {formatCurrency(recurring.amount)} from{" "}
                {recurring.startDate} through {recurring.endDate}.
              </p>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-3">Due date</th>
                      <th className="px-4 py-3">Scheduled amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paymentSchedule.map((row) => (
                      <tr key={row.dueDate}>
                        <td className="px-4 py-3 text-navy-900">{row.dueDate}</td>
                        <td className="px-4 py-3 font-medium text-navy-900">
                          {formatCurrency(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice breakdown</CardTitle>
            <CardDescription>
              Each individual charge that adds up to the invoice total (
              {formatCurrency(chargeTotal)}).
            </CardDescription>
          </CardHeader>

          <ul className="space-y-3">
            {invoiceCharges.map((charge) => (
              <li
                key={charge.id}
                className="rounded-xl border border-gray-200 px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-navy-900">
                      {formatCurrency(charge.amount)} · {charge.reason}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Invoice #{charge.invoiceNumber} · {charge.chargeDate}
                    </p>
                  </div>
                  <StatusBadge status={charge.status} />
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3 text-sm">
            <span className="text-muted">
              Unpaid charges: {formatCurrency(unpaidChargeTotal)}
            </span>
            <span className="font-semibold text-navy-900">
              Remaining balance:{" "}
              {formatCurrency(clientAccountSummary.remainingBalance)}
            </span>
          </div>
        </Card>

        <RiskControlsCard
          title="Invoice risk controls"
          description="Controls that reduce duplicate billings and statement/invoice mismatches."
        >
          {accountRiskControls.duplicateBillingChecks.map((control) => (
            <ControlRow
              key={control.id}
              status={control.status}
              label={control.label}
              detail={control.detail}
            />
          ))}
          <ControlRow
            status={
              accountRiskControls.statementReconciliation.status === "matched"
                ? "clear"
                : "review"
            }
            label="Statement balance matches unpaid invoices"
            detail={`${accountRiskControls.statementReconciliation.detail} Statement ${formatCurrency(
              accountRiskControls.statementReconciliation.statementBalance,
            )} vs unpaid charges ${formatCurrency(
              accountRiskControls.statementReconciliation.remainingFromCharges,
            )}.`}
          />
        </RiskControlsCard>
      </div>
    );
  }

  if (view === "payment-plan") {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => setView("home")}
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-navy-900 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Account Summary
        </button>

        <Card>
          <CardHeader>
            <CardTitle>Payment plan</CardTitle>
            <CardDescription>
              Review the frequency, dates, and amounts of your upcoming
              payments.
            </CardDescription>
          </CardHeader>

          {!recurring || paymentSchedule.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-surface px-5 py-8 text-center">
              <CalendarClock className="mx-auto h-8 w-8 text-muted" />
              <p className="mt-3 font-semibold text-navy-900">
                No payment plan exists
              </p>
              <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
                You do not currently have a payment plan. Submit a request to
                the Billing Department to discuss payment schedules and due
                dates.
              </p>
              <Link
                href="/client-portal/requests?request=payment-schedule"
                className="mt-5 inline-flex items-center justify-center rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-800"
              >
                Request a payment schedule change
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-5 grid gap-4 sm:grid-cols-3">
                <SummaryMetric
                  label="Frequency"
                  value={
                    FREQUENCY_LABELS[recurring.frequency] ??
                    recurring.frequency
                  }
                />
                <SummaryMetric
                  label="Payment amount"
                  value={formatCurrency(recurring.amount)}
                />
                <SummaryMetric
                  label="Plan dates"
                  value={`${recurring.startDate} – ${recurring.endDate}`}
                />
              </div>

              {upcomingPayments.length === 0 ? (
                <p className="rounded-xl bg-surface px-4 py-6 text-center text-sm text-muted">
                  This payment plan has no remaining upcoming payments.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-muted">
                      <tr>
                        <th className="px-4 py-3">Upcoming due date</th>
                        <th className="px-4 py-3">Amount due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {upcomingPayments.map((payment) => (
                        <tr key={payment.dueDate}>
                          <td className="px-4 py-3 text-navy-900">
                            {payment.dueDate}
                          </td>
                          <td className="px-4 py-3 font-medium text-navy-900">
                            {formatCurrency(payment.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="border-gold-500/30 bg-gradient-to-r from-navy-900 to-navy-800 text-white">
        <CardHeader className="mb-0">
          <h2 className="text-base font-semibold text-white">Account Summary</h2>
          <CardDescription className="text-gray-300">
            {clientAccountSummary.clientName} · Account{" "}
            {clientAccountSummary.accountNumber}
          </CardDescription>
        </CardHeader>
        <p className="mt-3 text-sm text-gray-200">
          Last payment {formatCurrency(clientAccountSummary.lastPaymentAmount)}{" "}
          on {clientAccountSummary.lastPaymentDate}.
        </p>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Choose a summary</CardTitle>
          <CardDescription>
            Open invoice balance details or payment plan details.
          </CardDescription>
        </CardHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setView("invoice")}
            className="flex flex-col items-start rounded-2xl border border-gray-200 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-navy-700/40 hover:shadow-md"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-gold-500">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-navy-900">
              Invoice balance summary
            </h3>
            <p className="mt-1 text-sm text-muted">
              Invoice total, remaining balance, hours, schedule, and charge
              breakdown.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setView("payment-plan")}
            className="flex flex-col items-start rounded-2xl border border-gray-200 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-navy-700/40 hover:shadow-md"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-gold-500">
              <CalendarClock className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-navy-900">
              Payment plan
            </h3>
            <p className="mt-1 text-sm text-muted">
              Frequency, dates, and amounts for upcoming payments.
            </p>
          </button>
        </div>
      </Card>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold text-navy-900">{value}</p>
    </div>
  );
}

function RiskControlsCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-gold-500">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <ul className="space-y-3">{children}</ul>
    </Card>
  );
}

function ControlRow({
  status,
  label,
  detail,
}: {
  status: "clear" | "review";
  label: string;
  detail: string;
}) {
  return (
    <li className="rounded-xl border border-gray-200 px-4 py-3">
      <div className="flex items-start gap-3">
        {status === "clear" ? (
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
        ) : (
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-navy-900">{label}</p>
            <ControlStatusBadge status={status} />
          </div>
          <p className="mt-1 text-sm text-muted">{detail}</p>
        </div>
      </div>
    </li>
  );
}
