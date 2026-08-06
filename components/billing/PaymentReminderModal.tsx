"use client";

import { useState } from "react";
import type { Invoice } from "@/lib/billing/invoice-types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

type Props = {
  invoice: Invoice;
  onClose: () => void;
  onSend: (invoice: Invoice) => void;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function PaymentReminderModal({ invoice, onClose, onSend }: Props) {
  const [sent, setSent] = useState(false);

  const recipient = invoice.clientInfo?.email || "billing@client.example";
  const subject = `Payment Reminder – Invoice ${invoice.invoiceNumber}`;
  const amountDue = invoice.remainingBalance || invoice.totalAmount;
  const clientName = invoice.clientInfo?.name || invoice.client;

  const body = `Dear ${clientName},

Our records indicate that Invoice ${invoice.invoiceNumber} for ${formatCurrency(amountDue)} was due on ${formatDate(invoice.dueDate)} and currently remains outstanding.

If payment has already been submitted, please disregard this reminder.

Otherwise, we kindly request payment at your earliest convenience. If you have any questions regarding this invoice, please contact our billing department.

Thank you,

North & Vale LLP
Billing Department`;

  function handleSend() {
    onSend(invoice);
    setSent(true);
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Send Payment Reminder"
      description={invoice.invoiceNumber}
      className="max-w-xl"
    >
      {sent ? (
        <div className="space-y-4">
          <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
            Reminder successfully sent to <strong>{recipient}</strong> for
            invoice <strong>{invoice.invoiceNumber}</strong> (simulated).
          </p>
          <Button onClick={onClose}>Done</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase text-muted">
                Recipient
              </dt>
              <dd className="text-sm text-navy-900">{recipient}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-muted">
                Subject
              </dt>
              <dd className="text-sm text-navy-900">{subject}</dd>
            </div>
          </dl>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-navy-900">
              Message Preview
            </h3>
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-navy-900">
              {body}
            </pre>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSend}>Send Reminder</Button>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
