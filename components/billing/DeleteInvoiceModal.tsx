"use client";

import { useId, useState } from "react";
import {
  BILLING_ADMIN_PASSWORD,
  verifyBillingAdminPassword,
} from "@/lib/billing/admin-gate";
import type { Invoice } from "@/lib/billing/invoice-types";

type Props = {
  invoice: Invoice;
  onClose: () => void;
  onConfirmDelete: (invoice: Invoice) => void;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function DeleteInvoiceModal({
  invoice,
  onClose,
  onConfirmDelete,
}: Props) {
  const formId = useId();
  const [password, setPassword] = useState("");
  const [confirmNumber, setConfirmNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (confirmNumber.trim() !== invoice.invoiceNumber) {
      setError(
        `Type the invoice number exactly (${invoice.invoiceNumber}) to confirm.`,
      );
      return;
    }
    if (!verifyBillingAdminPassword(password)) {
      setError("Admin password is incorrect. Deletion not authorized.");
      return;
    }

    onConfirmDelete(invoice);
    setDone(true);
  }

  return (
    <div
      className="inv-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="inv-modal inv-modal--delete"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="inv-modal__header">
          <div>
            <p className="inv-modal__kicker">{invoice.invoiceNumber}</p>
            <h2 id={`${formId}-title`}>Delete invoice</h2>
          </div>
          <button type="button" className="inv-modal__close" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="inv-modal__body">
          {done ? (
            <>
              <div className="inv-delete-success" role="status">
                Invoice <strong>{invoice.invoiceNumber}</strong> was permanently
                removed after admin authorization.
              </div>
              <div className="inv-delete-actions">
                <button
                  type="button"
                  className="dashboard__create-btn"
                  onClick={onClose}
                >
                  Done
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="inv-delete-form">
              <p className="inv-delete-warn">
                Deleting an invoice is permanent and requires billing
                administrator approval. This cannot be undone from the demo
                store.
              </p>

              <dl className="inv-dl">
                <div>
                  <dt>Client</dt>
                  <dd>{invoice.client}</dd>
                </div>
                <div>
                  <dt>Total</dt>
                  <dd>{formatCurrency(invoice.totalAmount)}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{invoice.status}</dd>
                </div>
                <div>
                  <dt>Attorney</dt>
                  <dd>{invoice.attorney}</dd>
                </div>
              </dl>

              <label className="inv-field">
                <span>Confirm invoice number</span>
                <input
                  type="text"
                  autoComplete="off"
                  value={confirmNumber}
                  onChange={(e) => setConfirmNumber(e.target.value)}
                  placeholder={invoice.invoiceNumber}
                  required
                />
              </label>

              <label className="inv-field">
                <span>Admin password</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter billing admin password"
                  required
                />
              </label>

              <p className="inv-delete-hint">
                Demo admin password:{" "}
                <code>{BILLING_ADMIN_PASSWORD}</code>
              </p>

              {error ? (
                <p className="inv-delete-error" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="inv-delete-actions">
                <button type="submit" className="inv-delete-confirm-btn">
                  Authorize &amp; delete
                </button>
                <button
                  type="button"
                  className="inv-view-btn"
                  onClick={onClose}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
