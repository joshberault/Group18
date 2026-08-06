/**
 * Client portal payment controls:
 * - Amount above invoice balance requires explicit trust-credit handling.
 * - Idempotency keys prevent duplicate payment processing.
 */

export const PROCESSED_PAYMENTS_KEY = "counselflow-processed-payments";
export const PROCESSED_PAYMENTS_EVENT = "client-processed-payments-updated";
export const TRUST_CREDITS_KEY = "counselflow-trust-credits";

export interface ProcessedPaymentRecord {
  idempotencyKey: string;
  amount: number;
  invoiceApplied: number;
  trustCredit: number;
  processedAt: string;
}

export interface PaymentAllocation {
  invoiceApplied: number;
  trustCredit: number;
}

export function createPaymentIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `pay-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function allocatePaymentAgainstBalance(input: {
  amount: number;
  balanceDue: number;
  applyExcessAsTrustCredit: boolean;
}): { ok: true; allocation: PaymentAllocation } | { ok: false; error: string } {
  const amount = Math.round(Number(input.amount) * 100) / 100;
  const balanceDue = Math.round(Number(input.balanceDue) * 100) / 100;

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter a valid payment amount greater than zero." };
  }

  if (!Number.isFinite(balanceDue) || balanceDue < 0) {
    return { ok: false, error: "Invoice balance is unavailable." };
  }

  if (balanceDue <= 0) {
    return { ok: false, error: "This invoice has no remaining balance." };
  }

  if (amount > balanceDue) {
    if (!input.applyExcessAsTrustCredit) {
      return {
        ok: false,
        error: `Payment of ${amount.toFixed(2)} exceeds the invoice balance of ${balanceDue.toFixed(2)}. Enable “Apply excess as trust credit” or enter an amount up to the balance.`,
      };
    }
    return {
      ok: true,
      allocation: {
        invoiceApplied: balanceDue,
        trustCredit: Math.round((amount - balanceDue) * 100) / 100,
      },
    };
  }

  return {
    ok: true,
    allocation: { invoiceApplied: amount, trustCredit: 0 },
  };
}

function readProcessedPayments(): ProcessedPaymentRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(
      localStorage.getItem(PROCESSED_PAYMENTS_KEY) ?? "[]",
    );
    return Array.isArray(stored) ? (stored as ProcessedPaymentRecord[]) : [];
  } catch {
    return [];
  }
}

function writeProcessedPayments(records: ProcessedPaymentRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROCESSED_PAYMENTS_KEY, JSON.stringify(records));
  window.dispatchEvent(new CustomEvent(PROCESSED_PAYMENTS_EVENT));
}

export function findProcessedPayment(
  idempotencyKey: string,
): ProcessedPaymentRecord | null {
  const key = idempotencyKey.trim();
  if (!key) return null;
  return (
    readProcessedPayments().find((item) => item.idempotencyKey === key) ?? null
  );
}

function recordTrustCredit(amount: number, reference: string) {
  if (typeof window === "undefined" || !(amount > 0)) return;
  try {
    const existing = JSON.parse(localStorage.getItem(TRUST_CREDITS_KEY) ?? "[]");
    const list = Array.isArray(existing) ? existing : [];
    list.unshift({
      amount,
      reference,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(TRUST_CREDITS_KEY, JSON.stringify(list));
  } catch {
    // ignore storage failures in demo
  }
}

/**
 * Processes a payment once per idempotency key.
 * Over-balance amounts are only accepted when applyExcessAsTrustCredit is true.
 */
export function processPaymentOnce(input: {
  idempotencyKey: string;
  amount: number;
  balanceDue: number;
  applyExcessAsTrustCredit: boolean;
}):
  | {
      ok: true;
      alreadyProcessed: boolean;
      invoiceApplied: number;
      trustCredit: number;
    }
  | { ok: false; error: string } {
  const idempotencyKey = input.idempotencyKey.trim();
  if (!idempotencyKey) {
    return { ok: false, error: "Missing payment idempotency key." };
  }

  const existing = findProcessedPayment(idempotencyKey);
  if (existing) {
    return {
      ok: true,
      alreadyProcessed: true,
      invoiceApplied: existing.invoiceApplied,
      trustCredit: existing.trustCredit,
    };
  }

  const allocation = allocatePaymentAgainstBalance({
    amount: input.amount,
    balanceDue: input.balanceDue,
    applyExcessAsTrustCredit: input.applyExcessAsTrustCredit,
  });

  if (!allocation.ok) {
    return allocation;
  }

  const record: ProcessedPaymentRecord = {
    idempotencyKey,
    amount: Math.round(Number(input.amount) * 100) / 100,
    invoiceApplied: allocation.allocation.invoiceApplied,
    trustCredit: allocation.allocation.trustCredit,
    processedAt: new Date().toISOString(),
  };

  writeProcessedPayments([record, ...readProcessedPayments()]);
  recordTrustCredit(record.trustCredit, idempotencyKey);

  return {
    ok: true,
    alreadyProcessed: false,
    invoiceApplied: record.invoiceApplied,
    trustCredit: record.trustCredit,
  };
}
