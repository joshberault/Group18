"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  CalendarClock,
  Check,
  CreditCard,
  FileImage,
  Landmark,
  MessageSquareWarning,
  ShieldCheck,
} from "lucide-react";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { useCaseSelection } from "@/components/client-portal/CaseSelectionProvider";
import { getMatterNameForCaseNumber } from "@/lib/client-portal/case-selection";
import {
  getDynamicInvoiceCharges,
  INVOICE_CHARGES_UPDATE_EVENT,
  type DynamicInvoiceCharge,
} from "@/lib/client-portal/invoice-charge-store";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Textarea } from "@/components/ui/Textarea";
import {
  denyDisputeRequest,
  DISPUTE_REQUESTS_EVENT,
  getDisputeRequests,
  getRecurringPayment,
  RECURRING_PAYMENT_EVENT,
  saveDisputeRequest,
  saveRecurringPayment,
  type DisputeRequest,
  type RecurringPaymentSetup,
} from "@/lib/client-portal/payment-store";
import {
  clientAccountSummary,
  invoiceCharges,
} from "@/lib/mock-data/client-portal";
import { cn, formatCurrency } from "@/lib/utils/cn";

type PaymentAction =
  | "full"
  | "partial"
  | "scheduled"
  | "recurring"
  | "dispute";
type PaymentMethod = "check" | "card" | "electronic-check";
type Step = "form" | "review" | "dispute-reason" | "sent";

interface PaymentFields {
  checkNumber: string;
  checkAmount: string;
  checkMailedDate: string;
  checkMailedFrom: string;
  cardNumber: string;
  securityCode: string;
  expirationDate: string;
  cardholderName: string;
  accountNumber: string;
  routingNumber: string;
  bankName: string;
  accountHolderName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

const UPCOMING_PAYMENT = {
  amount: 1250,
  dueDate: "August 10, 2026",
  invoiceNumber: "INV-2850",
};

const FREQUENCY_OPTIONS = [
  { value: "", label: "Select payment frequency" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every two weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

const INITIAL_FIELDS: PaymentFields = {
  checkNumber: "",
  checkAmount: "",
  checkMailedDate: "",
  checkMailedFrom: "",
  cardNumber: "",
  securityCode: "",
  expirationDate: "",
  cardholderName: "",
  accountNumber: "",
  routingNumber: "",
  bankName: "",
  accountHolderName: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
};

const ACTION_OPTIONS = [
  {
    id: "full" as const,
    title: "Pay the full balance",
    description: "Pay the remaining outstanding balance",
  },
  {
    id: "partial" as const,
    title: "Pay a partial balance",
    description: "Enter a custom amount in USD",
  },
  {
    id: "scheduled" as const,
    title: "Pay the upcoming scheduled payment",
    description: `${formatCurrency(UPCOMING_PAYMENT.amount)} due ${UPCOMING_PAYMENT.dueDate}`,
  },
  {
    id: "recurring" as const,
    title: "Set up recurring payments",
    description: "Schedule automatic card payments",
  },
  {
    id: "dispute" as const,
    title: "Dispute a charge",
    description: "Challenge one or more invoice charges",
  },
];

const PAYMENT_METHODS = [
  {
    id: "check" as const,
    title: "Check",
    description: "Mail a paper check and upload front/back images",
    icon: Banknote,
  },
  {
    id: "card" as const,
    title: "Card",
    description: "Pay with a credit or debit card",
    icon: CreditCard,
  },
  {
    id: "electronic-check" as const,
    title: "Electronic check",
    description: "Pay from a bank account using routing information",
    icon: Landmark,
  },
];

function paymentMethodLabel(method: PaymentMethod) {
  return (
    PAYMENT_METHODS.find((option) => option.id === method)?.title ?? method
  );
}

function maskLastFour(value: string) {
  const cleaned = value.replace(/\s/g, "");
  return cleaned.length > 4 ? `•••• ${cleaned.slice(-4)}` : cleaned;
}

function validateCardFields(
  fields: PaymentFields,
  missingFields: (names: Array<keyof PaymentFields>) => Array<keyof PaymentFields>,
) {
  const missing = missingFields([
    "cardNumber",
    "securityCode",
    "expirationDate",
    "cardholderName",
    "address",
    "city",
    "state",
    "zipCode",
  ]);
  return missing.length > 0
    ? "Complete all required card and cardholder address fields."
    : null;
}

function chargeMatterName(charge: {
  caseNumber: string;
  matterName?: string;
}) {
  return charge.matterName ?? getMatterNameForCaseNumber(charge.caseNumber);
}

export function PayBalance() {
  const { role } = useDemoRole();
  const { matchesCase } = useCaseSelection();
  const [dynamicCharges, setDynamicCharges] = useState<DynamicInvoiceCharge[]>(
    [],
  );
  const canDenyDisputes =
    role === "billing_specialist" ||
    role === "attorney" ||
    role === "managing_partner" ||
    role === "firm_administrator";

  const visibleCharges = [...dynamicCharges, ...invoiceCharges].filter(
    (charge) => matchesCase(charge.caseNumber),
  );
  const outstandingBalance = visibleCharges
    .filter((charge) => charge.status === "unpaid")
    .reduce((sum, charge) => sum + charge.amount, 0);

  const [step, setStep] = useState<Step>("form");
  const [action, setAction] = useState<PaymentAction>("full");
  const [partialAmount, setPartialAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [fields, setFields] = useState<PaymentFields>(INITIAL_FIELDS);
  const [checkFront, setCheckFront] = useState<File | null>(null);
  const [checkBack, setCheckBack] = useState<File | null>(null);
  const [recurringStartDate, setRecurringStartDate] = useState("");
  const [recurringEndDate, setRecurringEndDate] = useState("");
  const [recurringFrequency, setRecurringFrequency] = useState("");
  const [recurringAmount, setRecurringAmount] = useState("");
  const [selectedChargeIds, setSelectedChargeIds] = useState<string[]>([]);
  const [disputeReason, setDisputeReason] = useState("");
  const [savedRecurring, setSavedRecurring] =
    useState<RecurringPaymentSetup | null>(null);
  const [pendingDisputes, setPendingDisputes] = useState<DisputeRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const refreshCharges = () =>
      setDynamicCharges(getDynamicInvoiceCharges());
    refreshCharges();
    window.addEventListener(INVOICE_CHARGES_UPDATE_EVENT, refreshCharges);
    return () =>
      window.removeEventListener(INVOICE_CHARGES_UPDATE_EVENT, refreshCharges);
  }, []);

  const refreshBillingState = useCallback(() => {
    setSavedRecurring(getRecurringPayment());
    setPendingDisputes(
      getDisputeRequests().filter((item) => item.status === "pending"),
    );
  }, []);

  useEffect(() => {
    refreshBillingState();
    window.addEventListener(RECURRING_PAYMENT_EVENT, refreshBillingState);
    window.addEventListener(DISPUTE_REQUESTS_EVENT, refreshBillingState);
    return () => {
      window.removeEventListener(RECURRING_PAYMENT_EVENT, refreshBillingState);
      window.removeEventListener(DISPUTE_REQUESTS_EVENT, refreshBillingState);
    };
  }, [refreshBillingState]);

  const isPaymentAction =
    action === "full" || action === "partial" || action === "scheduled";
  const selectedCharges = visibleCharges.filter((charge) =>
    selectedChargeIds.includes(charge.id),
  );

  const paymentAmount =
    action === "full"
      ? outstandingBalance
      : action === "scheduled"
        ? UPCOMING_PAYMENT.amount
        : action === "recurring"
          ? Number(recurringAmount)
          : Number(partialAmount);

  function updateField(field: keyof PaymentFields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
    setError(null);
  }

  function missingFields(fieldNames: Array<keyof PaymentFields>) {
    return fieldNames.filter((field) => !fields[field].trim());
  }

  function toggleCharge(chargeId: string) {
    setSelectedChargeIds((current) =>
      current.includes(chargeId)
        ? current.filter((id) => id !== chargeId)
        : [...current, chargeId],
    );
    setError(null);
  }

  function validatePayment() {
    if (
      action === "partial" &&
      (!Number.isFinite(paymentAmount) ||
        paymentAmount <= 0 ||
        paymentAmount > outstandingBalance)
    ) {
      return `Enter a partial payment between $0.01 and ${formatCurrency(
        outstandingBalance,
      )}.`;
    }

    if (paymentMethod === "check") {
      const missing = missingFields([
        "checkNumber",
        "checkAmount",
        "checkMailedDate",
        "checkMailedFrom",
      ]);
      if (missing.length > 0 || !checkFront || !checkBack) {
        return "Complete all check fields and attach pictures of both the front and back of the check.";
      }
      if (Number(fields.checkAmount) <= 0) {
        return "Enter a valid amount written on the check.";
      }
    }

    if (paymentMethod === "card") {
      return validateCardFields(fields, missingFields);
    }

    if (paymentMethod === "electronic-check") {
      const missing = missingFields([
        "accountNumber",
        "routingNumber",
        "bankName",
        "accountHolderName",
        "address",
        "city",
        "state",
        "zipCode",
      ]);
      if (missing.length > 0) {
        return "Complete all required electronic check and account holder address fields.";
      }
    }

    return null;
  }

  function validateRecurring() {
    if (!recurringStartDate || !recurringEndDate || !recurringFrequency) {
      return "Enter the beginning date, end date, and frequency for recurring payments.";
    }
    if (recurringEndDate < recurringStartDate) {
      return "The end date must be on or after the beginning date.";
    }
    if (!Number.isFinite(Number(recurringAmount)) || Number(recurringAmount) <= 0) {
      return "Enter a valid recurring payment amount in USD.";
    }
    return validateCardFields(fields, missingFields);
  }

  function handleFormContinue(event: React.FormEvent) {
    event.preventDefault();

    if (action === "dispute") {
      if (selectedChargeIds.length === 0) {
        setError("Select at least one charge to dispute.");
        return;
      }
      setError(null);
      setStep("dispute-reason");
      return;
    }

    const validationError =
      action === "recurring" ? validateRecurring() : validatePayment();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setStep("review");
  }

  function handleDisputeSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!disputeReason.trim()) {
      setError("Explain why these charges should be removed from your account.");
      return;
    }

    saveDisputeRequest({
      chargeIds: selectedChargeIds,
      chargeSummaries: selectedCharges.map(
        (charge) =>
          `${charge.invoiceNumber} (${formatCurrency(charge.amount)} — ${charge.reason})`,
      ),
      reason: disputeReason.trim(),
    });
    setError(null);
    setStep("sent");
  }

  function handleDenyDispute(disputeId: string) {
    denyDisputeRequest(disputeId);
    setStatusMessage(
      "Dispute denied. A notification was sent to the client.",
    );
    refreshBillingState();
  }

  if (step === "sent") {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm sm:px-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
          <Check className="h-7 w-7" />
        </div>
        <h2 className="mt-5 text-2xl font-semibold text-navy-900">
          {action === "dispute"
            ? "Dispute submitted"
            : action === "recurring"
              ? "Recurring payments set up"
              : "Payment submitted"}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          {action === "dispute"
            ? `Your dispute for ${selectedCharges.length} charge${
                selectedCharges.length === 1 ? "" : "s"
              } was sent for review.`
            : action === "recurring"
              ? `Your recurring card payment of ${formatCurrency(
                  Number(recurringAmount),
                )} was scheduled.`
              : `Your demo payment of ${formatCurrency(paymentAmount)} by ${paymentMethodLabel(
                  paymentMethod,
                )} was submitted for processing.`}
        </p>
        <Button
          className="mt-6"
          onClick={() => {
            setStep("form");
            setError(null);
          }}
        >
          Back to Pay Balance
        </Button>
      </div>
    );
  }

  if (step === "dispute-reason") {
    return (
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() => setStep("form")}
          className="mb-4 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-navy-900 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to charge selection
        </button>

        <Card>
          <CardHeader>
            <CardTitle>Why should these charges be removed?</CardTitle>
            <CardDescription>
              Explain your dispute for the selected charge
              {selectedCharges.length === 1 ? "" : "s"}.
            </CardDescription>
          </CardHeader>

          <ul className="mb-5 space-y-2">
            {selectedCharges.map((charge) => (
              <li
                key={charge.id}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-navy-900"
              >
                {charge.invoiceNumber} · {formatCurrency(charge.amount)} ·{" "}
                {charge.reason}
              </li>
            ))}
          </ul>

          <form onSubmit={handleDisputeSubmit} className="space-y-4">
            <Textarea
              label="Reason for dispute"
              className="min-h-36"
              value={disputeReason}
              onChange={(event) => {
                setDisputeReason(event.target.value);
                setError(null);
              }}
              placeholder="Explain why you believe these charges should be removed from your account"
              required
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end">
              <Button type="submit">Submit dispute</Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() => setStep("form")}
          className="mb-4 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-navy-900 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Edit details
        </button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>
                  {action === "recurring"
                    ? "Review recurring payments"
                    : "Review and confirm payment"}
                </CardTitle>
                <CardDescription>
                  Confirm these details before sending.
                </CardDescription>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-gold-500">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>

          <dl className="space-y-4 rounded-xl bg-surface px-4 py-4">
            {action === "recurring" ? (
              <>
                <ReviewRow
                  label="Payment amount"
                  value={formatCurrency(Number(recurringAmount))}
                />
                <ReviewRow label="Begin date" value={recurringStartDate} />
                <ReviewRow label="End date" value={recurringEndDate} />
                <ReviewRow
                  label="Frequency"
                  value={
                    FREQUENCY_OPTIONS.find(
                      (option) => option.value === recurringFrequency,
                    )?.label ?? recurringFrequency
                  }
                />
                <ReviewRow
                  label="Card"
                  value={maskLastFour(fields.cardNumber)}
                />
                <ReviewRow label="Cardholder" value={fields.cardholderName} />
                <ReviewRow
                  label="Billing address"
                  value={`${fields.address}, ${fields.city}, ${fields.state} ${fields.zipCode}`}
                />
              </>
            ) : (
              <>
                <ReviewRow
                  label="Amount"
                  value={formatCurrency(paymentAmount)}
                />
                <ReviewRow
                  label="Payment selection"
                  value={
                    ACTION_OPTIONS.find((option) => option.id === action)
                      ?.title ?? action
                  }
                />
                <ReviewRow
                  label="Payment method"
                  value={paymentMethodLabel(paymentMethod)}
                />

                {paymentMethod === "check" && (
                  <>
                    <ReviewRow label="Check number" value={fields.checkNumber} />
                    <ReviewRow
                      label="Amount written"
                      value={formatCurrency(Number(fields.checkAmount))}
                    />
                    <ReviewRow
                      label="Mail date"
                      value={fields.checkMailedDate}
                    />
                    <ReviewRow
                      label="Mailed from"
                      value={fields.checkMailedFrom}
                    />
                    <ReviewRow
                      label="Check images"
                      value={`${checkFront?.name} and ${checkBack?.name}`}
                    />
                  </>
                )}

                {paymentMethod === "card" && (
                  <>
                    <ReviewRow
                      label="Card"
                      value={maskLastFour(fields.cardNumber)}
                    />
                    <ReviewRow
                      label="Cardholder"
                      value={fields.cardholderName}
                    />
                    <ReviewRow
                      label="Billing address"
                      value={`${fields.address}, ${fields.city}, ${fields.state} ${fields.zipCode}`}
                    />
                  </>
                )}

                {paymentMethod === "electronic-check" && (
                  <>
                    <ReviewRow
                      label="Bank account"
                      value={maskLastFour(fields.accountNumber)}
                    />
                    <ReviewRow label="Bank" value={fields.bankName} />
                    <ReviewRow
                      label="Account holder"
                      value={fields.accountHolderName}
                    />
                    <ReviewRow
                      label="Account holder address"
                      value={`${fields.address}, ${fields.city}, ${fields.state} ${fields.zipCode}`}
                    />
                  </>
                )}
              </>
            )}
          </dl>

          <div className="mt-6 flex justify-end">
            <Button
              onClick={() => {
                if (action === "recurring") {
                  saveRecurringPayment({
                    startDate: recurringStartDate,
                    endDate: recurringEndDate,
                    frequency: recurringFrequency,
                    amount: Number(recurringAmount),
                  });
                  refreshBillingState();
                }
                setStep("sent");
              }}
            >
              <ShieldCheck className="h-4 w-4" />
              Confirm and send payment
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <form onSubmit={handleFormContinue} className="space-y-6">
      {statusMessage && (
        <p className="rounded-lg bg-gold-100 px-4 py-3 text-sm text-navy-900">
          {statusMessage}
        </p>
      )}

      {savedRecurring && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Current recurring payment</CardTitle>
              <CardDescription>
                Payment plan details are view-only. Request changes through the
                Billing Department in Requests.
              </CardDescription>
            </div>
          </CardHeader>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">
                Begin date
              </dt>
              <dd className="mt-1 text-sm font-medium text-navy-900">
                {savedRecurring.startDate}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">
                End date
              </dt>
              <dd className="mt-1 text-sm font-medium text-navy-900">
                {savedRecurring.endDate}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">
                Frequency
              </dt>
              <dd className="mt-1 text-sm font-medium text-navy-900">
                {FREQUENCY_OPTIONS.find(
                  (option) => option.value === savedRecurring.frequency,
                )?.label ?? savedRecurring.frequency}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">
                Amount
              </dt>
              <dd className="mt-1 text-sm font-medium text-navy-900">
                {formatCurrency(savedRecurring.amount)}
              </dd>
            </div>
          </dl>
        </Card>
      )}

      {canDenyDisputes && pendingDisputes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending dispute requests</CardTitle>
            <CardDescription>
              Deny a client dispute to notify them in Notifications.
            </CardDescription>
          </CardHeader>
          <ul className="space-y-3">
            {pendingDisputes.map((dispute) => (
              <li
                key={dispute.id}
                className="rounded-xl border border-gray-200 px-4 py-4"
              >
                <p className="text-sm font-medium text-navy-900">
                  {dispute.chargeSummaries.join("; ")}
                </p>
                <p className="mt-1 text-sm text-navy-900">{dispute.reason}</p>
                <p className="mt-2 text-xs text-muted">
                  Submitted {new Date(dispute.submittedAt).toLocaleString()}
                </p>
                <div className="mt-3">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => handleDenyDispute(dispute.id)}
                  >
                    Deny dispute
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>1. Choose what you want to do</CardTitle>
          <CardDescription>
            Current balance: {formatCurrency(outstandingBalance)}
          </CardDescription>
        </CardHeader>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {ACTION_OPTIONS.map((option) => (
            <label
              key={option.id}
              className={cn(
                "cursor-pointer rounded-xl border px-4 py-4 transition-colors",
                action === option.id
                  ? "border-navy-900 bg-navy-900/5"
                  : "border-gray-200 hover:border-navy-700/40",
              )}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="payment-action"
                  value={option.id}
                  checked={action === option.id}
                  onChange={() => {
                    setAction(option.id);
                    setError(null);
                    if (option.id === "recurring") {
                      setPaymentMethod("card");
                    }
                  }}
                  className="mt-1 h-4 w-4 accent-navy-900"
                />
                <div>
                  <p className="text-sm font-semibold text-navy-900">
                    {option.title}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {option.id === "full"
                      ? formatCurrency(outstandingBalance)
                      : option.description}
                  </p>
                </div>
              </div>
            </label>
          ))}
        </div>

        {action === "partial" && (
          <div className="mt-4 max-w-sm">
            <Input
              label="Partial payment amount (USD)"
              type="number"
              min="0.01"
              max={outstandingBalance}
              step="0.01"
              value={partialAmount}
              onChange={(event) => {
                setPartialAmount(event.target.value);
                setError(null);
              }}
              placeholder="0.00"
              required
            />
          </div>
        )}
      </Card>

      {isPaymentAction && (
        <Card>
          <CardHeader>
            <CardTitle>2. Select a payment method</CardTitle>
            <CardDescription>
              Choose check, card, or electronic check.
            </CardDescription>
          </CardHeader>

          <div className="mb-6 grid gap-3 md:grid-cols-3">
            {PAYMENT_METHODS.map((method) => {
              const Icon = method.icon;
              return (
                <label
                  key={method.id}
                  className={cn(
                    "cursor-pointer rounded-xl border px-4 py-4 transition-colors",
                    paymentMethod === method.id
                      ? "border-navy-900 bg-navy-900/5"
                      : "border-gray-200 hover:border-navy-700/40",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="payment-method"
                      value={method.id}
                      checked={paymentMethod === method.id}
                      onChange={() => {
                        setPaymentMethod(method.id);
                        setError(null);
                      }}
                      className="mt-1 h-4 w-4 accent-navy-900"
                    />
                    <div>
                      <Icon className="mb-2 h-5 w-5 text-navy-900" />
                      <p className="text-sm font-semibold text-navy-900">
                        {method.title}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {method.description}
                      </p>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          {paymentMethod === "check" && (
            <CheckFields
              fields={fields}
              updateField={updateField}
              checkFront={checkFront}
              checkBack={checkBack}
              setCheckFront={setCheckFront}
              setCheckBack={setCheckBack}
            />
          )}
          {paymentMethod === "card" && (
            <CardFields fields={fields} updateField={updateField} />
          )}
          {paymentMethod === "electronic-check" && (
            <ElectronicCheckFields fields={fields} updateField={updateField} />
          )}
        </Card>
      )}

      {action === "recurring" && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>2. Recurring payment schedule</CardTitle>
                  <CardDescription>
                    Set the start date, end date, frequency, and amount.
                  </CardDescription>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-gold-500">
                  <CalendarClock className="h-5 w-5" />
                </div>
              </div>
            </CardHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Beginning date"
                type="date"
                value={recurringStartDate}
                onChange={(event) => {
                  setRecurringStartDate(event.target.value);
                  setError(null);
                }}
                required
              />
              <Input
                label="End date"
                type="date"
                value={recurringEndDate}
                onChange={(event) => {
                  setRecurringEndDate(event.target.value);
                  setError(null);
                }}
                required
              />
              <Select
                label="Frequency of the payment"
                options={FREQUENCY_OPTIONS}
                value={recurringFrequency}
                onChange={(event) => {
                  setRecurringFrequency(event.target.value);
                  setError(null);
                }}
                required
              />
              <Input
                label="Amount of the payment (USD)"
                type="number"
                min="0.01"
                step="0.01"
                value={recurringAmount}
                onChange={(event) => {
                  setRecurringAmount(event.target.value);
                  setError(null);
                }}
                required
              />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Card information</CardTitle>
              <CardDescription>
                Recurring payments use the same required card details as a
                one-time card payment.
              </CardDescription>
            </CardHeader>
            <CardFields fields={fields} updateField={updateField} />
          </Card>
        </>
      )}

      {action === "dispute" && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>2. Select charges to dispute</CardTitle>
                <CardDescription>
                  Choose one or more charges from your invoices, then continue.
                </CardDescription>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-gold-500">
                <MessageSquareWarning className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>

          <ul className="space-y-3">
            {visibleCharges.map((charge) => {
              const selected = selectedChargeIds.includes(charge.id);
              return (
                <li key={charge.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-4 transition-colors",
                      selected
                        ? "border-navy-900 bg-navy-900/5"
                        : "border-gray-200 hover:border-navy-700/40",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleCharge(charge.id)}
                      className="mt-1 h-4 w-4 accent-navy-900"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-navy-900">
                          {formatCurrency(charge.amount)} · {charge.reason}
                        </p>
                        <StatusBadge status={charge.status} />
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        Invoice #{charge.invoiceNumber} ·{" "}
                        {chargeMatterName(charge)} · Charge date{" "}
                        {charge.chargeDate} ·{" "}
                        {charge.status === "paid" ? "Paid" : "Unpaid"}
                      </p>
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="lg">
          {action === "dispute" ? (
            <>Continue</>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              Review and confirm
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function CheckFields({
  fields,
  updateField,
  checkFront,
  checkBack,
  setCheckFront,
  setCheckBack,
}: {
  fields: PaymentFields;
  updateField: (field: keyof PaymentFields, value: string) => void;
  checkFront: File | null;
  checkBack: File | null;
  setCheckFront: (file: File | null) => void;
  setCheckBack: (file: File | null) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input
        label="Check #"
        value={fields.checkNumber}
        onChange={(event) => updateField("checkNumber", event.target.value)}
        required
      />
      <Input
        label="Amount written on check"
        type="number"
        min="0.01"
        step="0.01"
        value={fields.checkAmount}
        onChange={(event) => updateField("checkAmount", event.target.value)}
        required
      />
      <Input
        label="Date check is mailed"
        type="date"
        value={fields.checkMailedDate}
        onChange={(event) => updateField("checkMailedDate", event.target.value)}
        required
      />
      <Input
        label="Location check is mailed from"
        value={fields.checkMailedFrom}
        onChange={(event) => updateField("checkMailedFrom", event.target.value)}
        placeholder="City, State or mailing location"
        required
      />
      <FileUploadField
        label="Picture of front of check"
        file={checkFront}
        onChange={setCheckFront}
      />
      <FileUploadField
        label="Picture of back of check"
        file={checkBack}
        onChange={setCheckBack}
      />
    </div>
  );
}

function CardFields({
  fields,
  updateField,
}: {
  fields: PaymentFields;
  updateField: (field: keyof PaymentFields, value: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input
        label="Card number"
        inputMode="numeric"
        autoComplete="cc-number"
        value={fields.cardNumber}
        onChange={(event) => updateField("cardNumber", event.target.value)}
        required
      />
      <Input
        label="Security code"
        type="password"
        inputMode="numeric"
        autoComplete="cc-csc"
        value={fields.securityCode}
        onChange={(event) => updateField("securityCode", event.target.value)}
        required
      />
      <Input
        label="Expiration date"
        placeholder="MM/YY"
        autoComplete="cc-exp"
        value={fields.expirationDate}
        onChange={(event) => updateField("expirationDate", event.target.value)}
        required
      />
      <Input
        label="Name of card holder"
        autoComplete="cc-name"
        value={fields.cardholderName}
        onChange={(event) => updateField("cardholderName", event.target.value)}
        required
      />
      <AddressFields fields={fields} updateField={updateField} />
    </div>
  );
}

function ElectronicCheckFields({
  fields,
  updateField,
}: {
  fields: PaymentFields;
  updateField: (field: keyof PaymentFields, value: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input
        label="Account number"
        type="password"
        inputMode="numeric"
        value={fields.accountNumber}
        onChange={(event) => updateField("accountNumber", event.target.value)}
        required
      />
      <Input
        label="Routing number"
        inputMode="numeric"
        value={fields.routingNumber}
        onChange={(event) => updateField("routingNumber", event.target.value)}
        required
      />
      <Input
        label="Bank name"
        value={fields.bankName}
        onChange={(event) => updateField("bankName", event.target.value)}
        required
      />
      <Input
        label="Name of account holder"
        value={fields.accountHolderName}
        onChange={(event) =>
          updateField("accountHolderName", event.target.value)
        }
        required
      />
      <AddressFields fields={fields} updateField={updateField} />
    </div>
  );
}

function AddressFields({
  fields,
  updateField,
}: {
  fields: PaymentFields;
  updateField: (field: keyof PaymentFields, value: string) => void;
}) {
  return (
    <>
      <div className="sm:col-span-2">
        <Input
          label="Address"
          autoComplete="street-address"
          value={fields.address}
          onChange={(event) => updateField("address", event.target.value)}
          required
        />
      </div>
      <Input
        label="City"
        autoComplete="address-level2"
        value={fields.city}
        onChange={(event) => updateField("city", event.target.value)}
        required
      />
      <Input
        label="State"
        autoComplete="address-level1"
        value={fields.state}
        onChange={(event) => updateField("state", event.target.value)}
        required
      />
      <Input
        label="Zip code"
        inputMode="numeric"
        autoComplete="postal-code"
        value={fields.zipCode}
        onChange={(event) => updateField("zipCode", event.target.value)}
        required
      />
    </>
  );
}

function FileUploadField({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-navy-900">{label}</label>
      <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-surface px-3 py-3 text-center hover:border-navy-700">
        {file ? (
          <>
            <FileImage className="h-5 w-5 text-navy-900" />
            <span className="mt-1 max-w-full truncate text-xs text-navy-900">
              {file.name}
            </span>
          </>
        ) : (
          <>
            <FileImage className="h-5 w-5 text-muted" />
            <span className="mt-1 text-xs text-muted">Choose an image</span>
          </>
        )}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
          required={!file}
        />
      </label>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col justify-between gap-1 border-b border-gray-200 pb-3 last:border-0 last:pb-0 sm:flex-row sm:gap-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-medium text-navy-900 sm:text-right">
        {value}
      </dd>
    </div>
  );
}
