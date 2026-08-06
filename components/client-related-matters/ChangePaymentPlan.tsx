"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, Check, Info } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { BILLING_MODEL_LABELS } from "@/lib/client-related-matters/billing-models";
import {
  formatCurrency,
  type ResolvedMatter,
} from "@/lib/client-related-matters/data";
import { addNotification } from "@/lib/client-related-matters/notifications-store";
import {
  CRM_PAYMENT_PLAN_UPDATE_EVENT,
  FREQUENCY_LABELS,
  FREQUENCY_OPTIONS,
  formatPlanDate,
  getPaymentPlan,
  projectSchedule,
  savePaymentPlan,
  type PaymentFrequency,
  type PaymentPlan,
} from "@/lib/client-related-matters/payment-plan-store";

const MODEL_BADGE = {
  hourly: "gold",
  retainer: "warning",
  flat_fee: "success",
  contingency: "neutral",
} as const;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function defaultPlan(matter: ResolvedMatter): PaymentPlan {
  return {
    matterId: matter.id,
    frequency: "monthly",
    installmentAmount:
      matter.planTarget > 0 ? Math.round(matter.planTarget / 4) : 0,
    startDate: todayIso(),
    autopay: false,
    updatedAt: new Date().toISOString(),
  };
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-medium text-navy-900">{value}</dd>
    </div>
  );
}

export function ChangePaymentPlan({ matters }: { matters: ResolvedMatter[] }) {
  const [matterId, setMatterId] = useState(matters[0]?.id ?? "");
  const [currentPlan, setCurrentPlan] = useState<PaymentPlan | null>(null);
  const [frequency, setFrequency] = useState<PaymentFrequency>("monthly");
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [startDate, setStartDate] = useState(todayIso());
  const [autopay, setAutopay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const matter = matters.find((item) => item.id === matterId) ?? null;

  useEffect(() => {
    if (matters.length === 0) {
      setMatterId("");
      return;
    }
    if (!matters.some((item) => item.id === matterId)) {
      setMatterId(matters[0].id);
    }
  }, [matters, matterId]);

  useEffect(() => {
    if (!matter) {
      setCurrentPlan(null);
      return;
    }

    function loadPlan(target: ResolvedMatter) {
      const plan = getPaymentPlan(target.id) ?? defaultPlan(target);
      setCurrentPlan(plan);
      setFrequency(plan.frequency);
      setInstallmentAmount(
        plan.installmentAmount > 0 ? String(plan.installmentAmount) : "",
      );
      setStartDate(plan.startDate);
      setAutopay(plan.autopay);
      setError(null);
      setSavedMessage(null);
    }

    loadPlan(matter);

    const handler = () => loadPlan(matter);
    window.addEventListener(CRM_PAYMENT_PLAN_UPDATE_EVENT, handler);
    return () =>
      window.removeEventListener(CRM_PAYMENT_PLAN_UPDATE_EVENT, handler);
  }, [matter]);

  const parsedAmount = Number(installmentAmount);
  const proposedSchedule = useMemo(() => {
    if (!matter || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return null;
    }
    return projectSchedule(
      { frequency, installmentAmount: parsedAmount, startDate },
      matter.planTarget,
    );
  }, [matter, frequency, parsedAmount, startDate]);

  if (matters.length === 0 || !matter) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Change payment plan</CardTitle>
          <CardDescription>
            No matters are available for the selected client.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isContingency = matter.billingModel === "contingency";

  function handleSave() {
    if (!matter) return;

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter an installment amount greater than $0.");
      return;
    }
    if (!startDate) {
      setError("Choose the date the first installment is collected.");
      return;
    }
    if (
      matter.billingModel === "flat_fee" &&
      matter.flatFeeAmount != null &&
      parsedAmount > matter.flatFeeAmount
    ) {
      setError(
        `${matter.caseType} is a flat-fee matter billed at ${formatCurrency(
          matter.flatFeeAmount,
        )}. An installment cannot exceed the flat fee.`,
      );
      return;
    }

    const plan: PaymentPlan = {
      matterId: matter.id,
      frequency,
      installmentAmount: parsedAmount,
      startDate,
      autopay,
      updatedAt: new Date().toISOString(),
    };

    savePaymentPlan(plan);
    addNotification({
      id: `crm-notif-plan-${matter.id}`,
      title: "Payment plan updated",
      message: `${matter.clientName} — ${matter.matterName} now pays ${formatCurrency(
        parsedAmount,
      )} ${FREQUENCY_LABELS[frequency].toLowerCase()} starting ${formatPlanDate(
        startDate,
      )}.`,
      createdAt: new Date().toISOString(),
      type: "payment_plan",
      matterReference: matter.matterReference,
      actionLabel: "Review receivables",
      actionHref: "/receivables",
    });

    setError(null);
    setSavedMessage(
      `Payment plan saved for ${matter.matterName}. The client was notified.`,
    );
  }

  function handleReset() {
    if (!currentPlan) return;
    setFrequency(currentPlan.frequency);
    setInstallmentAmount(
      currentPlan.installmentAmount > 0
        ? String(currentPlan.installmentAmount)
        : "",
    );
    setStartDate(currentPlan.startDate);
    setAutopay(currentPlan.autopay);
    setError(null);
    setSavedMessage(null);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <CardTitle>Change payment plan</CardTitle>
              <Badge variant={MODEL_BADGE[matter.billingModel]}>
                {BILLING_MODEL_LABELS[matter.billingModel]}
              </Badge>
            </div>
            <CardDescription>
              Adjust how a client pays down a matter. The billing model
              determines which changes are allowed.
            </CardDescription>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-gold-500">
            <CalendarClock className="h-6 w-6" />
          </div>
        </div>
      </CardHeader>

      <div className="space-y-6">
        <Select
          label="Matter"
          options={matters.map((item) => ({
            value: item.id,
            label: `${item.clientName} — ${item.matterName} (${item.matterReference})`,
          }))}
          value={matterId}
          onChange={(event) => setMatterId(event.target.value)}
        />

        <div className="rounded-xl border border-gray-200 bg-surface px-4 py-3">
          <p className="text-sm font-semibold text-navy-900">Current plan</p>
          <dl className="mt-1 divide-y divide-gray-200">
            <SummaryRow label="Case type" value={matter.caseType} />
            <SummaryRow
              label={
                matter.billingModel === "flat_fee"
                  ? "Flat fee"
                  : "Outstanding balance"
              }
              value={formatCurrency(matter.planTarget)}
            />
            {currentPlan && !isContingency && (
              <>
                <SummaryRow
                  label="Installment"
                  value={`${formatCurrency(currentPlan.installmentAmount)} ${FREQUENCY_LABELS[
                    currentPlan.frequency
                  ].toLowerCase()}`}
                />
                <SummaryRow
                  label="First payment"
                  value={formatPlanDate(currentPlan.startDate)}
                />
                <SummaryRow
                  label="Autopay"
                  value={currentPlan.autopay ? "Enabled" : "Disabled"}
                />
              </>
            )}
          </dl>
        </div>

        {isContingency ? (
          <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-navy-900" />
            <div>
              <p className="text-sm font-semibold text-navy-900">
                No payment plan for contingency matters
              </p>
              <p className="mt-1 text-sm text-muted">
                {matter.caseType} is billed on contingency. No invoice is issued
                until the case is finished through the legal system and a
                verdict is reached. On a client win the firm invoices 35% of the
                amount recovered; on a loss no invoice is created.
              </p>
            </div>
          </div>
        ) : (
          <>
            {matter.billingModel === "retainer" && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    Retainer matter
                  </p>
                  <p className="mt-1 text-sm text-amber-900">
                    The retainer must be paid before work is completed, and task
                    progress stays at 0% until every invoice on this matter is
                    paid. Choose a schedule that clears the balance before the
                    expected completion date.
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <Select
                label="Payment frequency"
                options={FREQUENCY_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                value={frequency}
                onChange={(event) => {
                  setFrequency(event.target.value as PaymentFrequency);
                  setSavedMessage(null);
                  setError(null);
                }}
              />
              <Input
                label="Installment amount (USD)"
                type="number"
                min="0"
                step="50"
                value={installmentAmount}
                onChange={(event) => {
                  setInstallmentAmount(event.target.value);
                  setSavedMessage(null);
                  setError(null);
                }}
              />
              <Input
                label="First payment date"
                type="date"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  setSavedMessage(null);
                  setError(null);
                }}
              />
              <label className="mt-7 flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-2">
                <input
                  type="checkbox"
                  checked={autopay}
                  onChange={(event) => {
                    setAutopay(event.target.checked);
                    setSavedMessage(null);
                  }}
                  className="h-4 w-4 accent-navy-900"
                />
                <span className="text-sm font-medium text-navy-900">
                  Collect automatically on the card on file
                </span>
              </label>
            </div>

            {proposedSchedule && (
              <div className="rounded-xl border border-gray-200 bg-surface px-4 py-3">
                <p className="text-sm font-semibold text-navy-900">
                  Projected schedule
                </p>
                <dl className="mt-1 divide-y divide-gray-200">
                  <SummaryRow
                    label="Installments"
                    value={`${proposedSchedule.installments} payment${
                      proposedSchedule.installments === 1 ? "" : "s"
                    }`}
                  />
                  <SummaryRow
                    label="Final installment"
                    value={formatCurrency(proposedSchedule.finalInstallment)}
                  />
                  <SummaryRow
                    label="Paid in full"
                    value={formatPlanDate(proposedSchedule.finalPaymentDate)}
                  />
                </dl>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            {savedMessage && (
              <p className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
                <Check className="h-4 w-4 shrink-0" />
                {savedMessage}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="secondary" onClick={handleReset}>
                Reset
              </Button>
              <Button onClick={handleSave}>Save payment plan</Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
