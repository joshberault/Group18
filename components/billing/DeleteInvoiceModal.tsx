"use client";

import { useId, useState } from "react";
import type { Invoice } from "@/lib/billing/invoice-types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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

    onConfirmDelete(invoice);
    setDone(true);
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Delete invoice"
      description={invoice.invoiceNumber}
    >
      {done ? (
        <div className="space-y-4">
          <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
            Invoice <strong>{invoice.invoiceNumber}</strong> was permanently
            removed.
          </p>
          <Button onClick={onClose}>Done</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" id={formId}>
          <p className="text-sm text-amber-900">
            Deleting an invoice is permanent. Confirm the invoice number below.
            This cannot be undone from the demo store.
          </p>
          <dl className="grid gap-2 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-xs text-muted">Client</dt>
              <dd className="font-medium text-navy-900">{invoice.client}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Total</dt>
              <dd className="font-medium text-navy-900">
                {formatCurrency(invoice.totalAmount)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Status</dt>
              <dd className="font-medium text-navy-900">{invoice.status}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Attorney</dt>
              <dd className="font-medium text-navy-900">{invoice.attorney}</dd>
            </div>
          </dl>
          <Input
            label="Confirm invoice number"
            value={confirmNumber}
            onChange={(e) => setConfirmNumber(e.target.value)}
            placeholder={invoice.invoiceNumber}
            required
            autoComplete="off"
          />
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="danger">
              Delete invoice
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
