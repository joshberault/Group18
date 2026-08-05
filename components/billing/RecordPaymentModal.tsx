"use client";

import { useState } from "react";
import type { Invoice } from "@/lib/billing/invoice-types";

type Props = {
  invoice: Invoice;
  onClose: () => void;
  onSave: (invoice: Invoice, amount: number) => void;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function RecordPaymentModal({ invoice, onClose, onSave }: Props) {
  const max = invoice.remainingBalance;
  const [amount, setAmount] = useState(String(max));
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    const value = Number(amount);
    if (Number.isNaN(value) || value <= 0) {
      setError("Enter a payment amount greater than zero.");
      return;
    }
    if (value > max) {
      setError(`Amount cannot exceed the remaining balance (${formatCurrency(max)}).`);
      return;
    }
    setError(null);
    onSave(invoice, value);
    setNote(
      `Payment of ${formatCurrency(value)} recorded for ${invoice.invoiceNumber} (simulated).`,
    );
  }

  return (
    <div
      className="inv-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="inv-modal inv-modal--payment"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="inv-modal__header">
          <div>
            <p className="inv-modal__kicker">{invoice.invoiceNumber}</p>
            <h2 id="payment-modal-title">Record Payment</h2>
          </div>
          <button type="button" className="inv-modal__close" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="inv-modal__body">
          {note ? (
            <div className="ar-reminder-success" role="status">
              {note}
            </div>
          ) : (
            <>
              <p className="ar-payment-lede">
                Remaining balance:{" "}
                <strong>{formatCurrency(max)}</strong> · Client:{" "}
                {invoice.client}
              </p>
              <label className="inv-field">
                <span>Payment amount</span>
                <input
                  type="number"
                  min={0}
                  max={max}
                  step={50}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
              {error ? (
                <p className="ar-payment-error" role="alert">
                  {error}
                </p>
              ) : null}
            </>
          )}

          <div className="ar-reminder-actions">
            {note ? (
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
                  onClick={handleSave}
                >
                  Record Payment
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
