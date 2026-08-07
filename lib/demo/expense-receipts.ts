/**
 * Demo receipt storage — PDFs kept in localStorage separately from the
 * workflow JSON so approval metadata stays light.
 */

export const EXPENSE_RECEIPT_STORAGE_PREFIX = "counselflow-expense-receipt-v1:";
export const MAX_RECEIPT_BYTES = 1_500_000; // ~1.5 MB (base64 expands further)

export type ExpenseReceiptRecord = {
  expenseId: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
  uploadedAt: string;
};

export function receiptStorageKey(expenseId: string): string {
  return `${EXPENSE_RECEIPT_STORAGE_PREFIX}${expenseId}`;
}

export function saveExpenseReceipt(
  expenseId: string,
  receipt: Omit<ExpenseReceiptRecord, "expenseId" | "uploadedAt">,
): { ok: true } | { ok: false; error: string } {
  if (typeof window === "undefined") {
    return { ok: false, error: "Receipts can only be saved in the browser." };
  }
  if (receipt.mimeType !== "application/pdf") {
    return { ok: false, error: "Receipt must be a PDF file." };
  }
  // Rough size check on the data URL payload
  const approxBytes = Math.ceil(((receipt.dataUrl.length - 100) * 3) / 4);
  if (approxBytes > MAX_RECEIPT_BYTES) {
    return {
      ok: false,
      error: "PDF is too large for the demo (max about 1.5 MB). Compress or split the receipt.",
    };
  }
  const record: ExpenseReceiptRecord = {
    expenseId,
    fileName: receipt.fileName,
    mimeType: receipt.mimeType,
    dataUrl: receipt.dataUrl,
    uploadedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(
      receiptStorageKey(expenseId),
      JSON.stringify(record),
    );
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Browser storage is full. Try a smaller PDF.",
    };
  }
}

export function getExpenseReceipt(
  expenseId: string,
): ExpenseReceiptRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(receiptStorageKey(expenseId));
    if (!raw) return null;
    return JSON.parse(raw) as ExpenseReceiptRecord;
  } catch {
    return null;
  }
}

export function readPdfFileAsDataUrl(
  file: File,
): Promise<{ ok: true; dataUrl: string; fileName: string; mimeType: string } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      resolve({ ok: false, error: "Please upload a PDF receipt." });
      return;
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      resolve({
        ok: false,
        error: "PDF is too large for the demo (max about 1.5 MB).",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl.startsWith("data:")) {
        resolve({ ok: false, error: "Could not read the PDF file." });
        return;
      }
      resolve({
        ok: true,
        dataUrl,
        fileName: file.name,
        mimeType: "application/pdf",
      });
    };
    reader.onerror = () =>
      resolve({ ok: false, error: "Could not read the PDF file." });
    reader.readAsDataURL(file);
  });
}
