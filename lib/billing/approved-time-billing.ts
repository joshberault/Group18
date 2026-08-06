import {
  allocateNextInvoiceNumberAsync,
  getAllManagedInvoices,
  refreshInvoiceCatalog,
  upsertGeneratedInvoice,
} from "@/lib/billing/invoice-management-store";
import type { Invoice } from "@/lib/billing/invoice-types";
import type { AdminApproval, AdminEmployee, AdminMatter } from "@/lib/admin/types";
import {
  addDynamicInvoiceCharge,
  type DynamicInvoiceCharge,
} from "@/lib/client-portal/invoice-charge-store";
import { addInvoiceAddedNotification } from "@/lib/client-portal/notifications-store";

const TITLE_HOURLY_RATES: Record<string, number> = {
  "senior partner": 650,
  "managing partner": 650,
  partner: 500,
  "senior associate": 350,
  "senior attorney": 350,
  associate: 250,
  "associate attorney": 250,
  "junior associate": 200,
  paralegal: 125,
};

export function getHourlyRateForEmployeeTitle(title: string): number | null {
  return TITLE_HOURLY_RATES[title.trim().toLowerCase()] ?? null;
}

export type ApprovedTimeBillingResult =
  | { ok: true; invoiceNumber: string; amount: number; alreadyInvoiced: boolean }
  | { ok: false; error: string };

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

export async function invoiceApprovedBillableTime(input: {
  approval: AdminApproval;
  employee: AdminEmployee;
  matter: AdminMatter;
  invoiceDate: string;
}): Promise<ApprovedTimeBillingResult> {
  const { approval, employee, matter, invoiceDate } = input;

  if (
    approval.type !== "time_entry" ||
    !approval.timeEntryBillable ||
    !approval.timeEntryHours ||
    approval.timeEntryHours <= 0
  ) {
    return { ok: false, error: "Only positive billable time can be invoiced." };
  }

  const rate = getHourlyRateForEmployeeTitle(employee.title);
  if (rate == null) {
    return {
      ok: false,
      error: `No hourly billing rate is configured for ${employee.title}.`,
    };
  }

  await refreshInvoiceCatalog();
  const sourceKey = `approved-time-${approval.id}`;
  const existing = getAllManagedInvoices().find(
    (invoice) =>
      invoice.sourceKey === sourceKey || invoice.id === sourceKey,
  );
  if (existing) {
    return {
      ok: true,
      invoiceNumber: existing.invoiceNumber,
      amount: existing.totalAmount,
      alreadyInvoiced: true,
    };
  }

  const hours = approval.timeEntryHours;
  const amount = Math.round(hours * rate * 100) / 100;
  const invoiceNumber = await allocateNextInvoiceNumberAsync(
    Number(invoiceDate.slice(0, 4)),
  );
  const description =
    approval.timeEntryDescription ??
    `Approved billable time for ${matter.matterLabel}`;

  const invoice: Invoice = {
    id: sourceKey,
    sourceKey,
    invoiceNumber,
    client: matter.clientName,
    legalMatter: matter.matterLabel,
    attorney: employee.fullName,
    billingMethod: "Hourly",
    invoiceDate,
    dueDate: addDays(invoiceDate, 30),
    totalAmount: amount,
    amountPaid: 0,
    remainingBalance: amount,
    status: "Sent",
    matterId: matter.id,
    clientInfo: {
      name: matter.clientName,
      contact: matter.clientName,
      email: "",
      phone: "",
      billingAddress: "",
    },
    matterDescription: `${matter.matterLabel} (${matter.matterReference})`,
    timeEntries: [
      {
        id: approval.id,
        date: approval.timeEntryDate ?? invoiceDate,
        attorney: employee.fullName,
        description,
        hours,
        rate,
        amount,
      },
    ],
    reimbursableExpenses: [],
    writeDowns: [],
    retainerApplied: 0,
    paymentHistory: [],
  };

  const persisted = await upsertGeneratedInvoice(invoice);
  if (!persisted.ok) {
    return {
      ok: false,
      error: persisted.error ?? "The invoice could not be saved.",
    };
  }

  const charge: DynamicInvoiceCharge = {
    id: `approved-time-charge-${approval.id}`,
    approvalId: approval.id,
    invoiceNumber,
    caseNumber: matter.matterReference,
    matterName: matter.matterLabel,
    clientName: matter.clientName,
    amount,
    reason: `${hours} billable hour${hours === 1 ? "" : "s"} — ${employee.title} at $${rate}/hour`,
    chargeDate: invoiceDate,
    status: "unpaid",
    employeeName: employee.fullName,
    employeeTitle: employee.title,
    hours,
    hourlyRate: rate,
  };
  addDynamicInvoiceCharge(charge);
  addInvoiceAddedNotification({
    invoiceNumber,
    amount,
    matterName: matter.matterLabel,
    matterReference: matter.matterReference,
  });

  return { ok: true, invoiceNumber, amount, alreadyInvoiced: false };
}
