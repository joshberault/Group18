export const DYNAMIC_INVOICE_CHARGES_KEY =
  "counselflow-dynamic-invoice-charges";
export const INVOICE_CHARGES_UPDATE_EVENT =
  "client-invoice-charges-updated";

export type DynamicInvoiceCharge = {
  id: string;
  approvalId: string;
  invoiceNumber: string;
  caseNumber: string;
  matterName: string;
  clientName: string;
  amount: number;
  reason: string;
  chargeDate: string;
  status: "unpaid";
  employeeName: string;
  employeeTitle: string;
  hours: number;
  hourlyRate: number;
};

export function getDynamicInvoiceCharges(): DynamicInvoiceCharge[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = JSON.parse(
      localStorage.getItem(DYNAMIC_INVOICE_CHARGES_KEY) ?? "[]",
    );
    return Array.isArray(stored) ? (stored as DynamicInvoiceCharge[]) : [];
  } catch {
    return [];
  }
}

export function addDynamicInvoiceCharge(
  charge: DynamicInvoiceCharge,
): boolean {
  if (typeof window === "undefined") return false;

  const existing = getDynamicInvoiceCharges();
  if (existing.some((item) => item.approvalId === charge.approvalId)) {
    return false;
  }

  localStorage.setItem(
    DYNAMIC_INVOICE_CHARGES_KEY,
    JSON.stringify([charge, ...existing]),
  );
  window.dispatchEvent(new CustomEvent(INVOICE_CHARGES_UPDATE_EVENT));
  return true;
}
