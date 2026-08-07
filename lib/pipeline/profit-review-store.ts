export type ProfitReviewRecord = {
  matterId: string;
  matterTitle: string;
  clientName: string;
  status: "pending" | "reviewed";
  createdAt: string;
  reviewedAt?: string;
};

const STORAGE_KEY = "counselflow-profit-review-v1";

function readAll(): ProfitReviewRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ProfitReviewRecord[];
  } catch {
    return [];
  }
}

function writeAll(records: ProfitReviewRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function queueProfitReview(input: {
  matterId: string;
  matterTitle: string;
  clientName: string;
}) {
  const existing = readAll();
  if (existing.some((row) => row.matterId === input.matterId)) return;
  writeAll([
    {
      ...input,
      status: "pending",
      createdAt: new Date().toISOString(),
    },
    ...existing,
  ]);
}

export function fetchPendingProfitReviews(): ProfitReviewRecord[] {
  return readAll().filter((row) => row.status === "pending");
}

export function markProfitReviewed(matterId: string): boolean {
  const rows = readAll();
  const index = rows.findIndex(
    (row) => row.matterId === matterId && row.status === "pending",
  );
  if (index < 0) return false;
  rows[index] = {
    ...rows[index],
    status: "reviewed",
    reviewedAt: new Date().toISOString(),
  };
  writeAll(rows);
  return true;
}
