"use client";

import { useState } from "react";
import type { Invoice } from "@/lib/billing/invoice-types";

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

  const recipient =
    invoice.clientInfo?.email || "billing@client.example";
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
    <div
      className="inv-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="inv-modal inv-modal--reminder"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reminder-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="inv-modal__header">
          <div>
            <p className="inv-modal__kicker">{invoice.invoiceNumber}</p>
            <h2 id="reminder-modal-title">Send Payment Reminder</h2>
          </div>
          <button type="button" className="inv-modal__close" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="inv-modal__body">
          {sent ? (
            <div className="ar-reminder-success" role="status">
              Reminder successfully sent to <strong>{recipient}</strong> for
              invoice <strong>{invoice.invoiceNumber}</strong> (simulated).
            </div>
          ) : (
            <>
              <dl className="ar-reminder-meta">
                <div>
                  <dt>Recipient</dt>
                  <dd>{recipient}</dd>
                </div>
                <div>
                  <dt>Subject</dt>
                  <dd>{subject}</dd>
                </div>
              </dl>

              <section className="ar-reminder-preview">
                <h3>Message Preview</h3>
                <pre className="ar-reminder-preview__body">{body}</pre>
              </section>
            </>
          )}

          <div className="ar-reminder-actions">
            {sent ? (
              <button
                type="button"
                className="dashboard__create-btn"
                onClick={onClose}
              >
                Done
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="dashboard__create-btn"
                  onClick={handleSend}
                >
                  Send Reminder
                </button>
                <button type="button" className="gi-btn" onClick={onClose}>
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
