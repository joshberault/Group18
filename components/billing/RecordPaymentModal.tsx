"use client";

import { useState } from "react";
import type { Invoice } from "@/lib/billing/invoice-types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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
      setError(
        `Amount cannot exceed the remaining balance (${formatCurrency(max)}).`,
      );
      return;
    }
    setError(null);
    onSave(invoice, value);
    setNote(
      `Payment of ${formatCurrency(value)} recorded for ${invoice.invoiceNumber} (simulated).`,
    );
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Record Payment"
      description={invoice.invoiceNumber}
    >
      {note ? (
        <div className="space-y-4">
          <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
            {note}
          </p>
          <Button onClick={onClose}>Done</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Remaining balance:{" "}
            <strong className="text-navy-900">{formatCurrency(max)}</strong> ·
            Client: {invoice.client}
          </p>
          <Input
            label="Payment amount"
            type="number"
            min={0}
            max={max}
            step={50}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={error ?? undefined}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave}>Record Payment</Button>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
