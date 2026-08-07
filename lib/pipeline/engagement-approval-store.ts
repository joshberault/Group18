export type EngagementApprovalRequest = {
  matterId: string;
  matterTitle: string;
  clientName: string;
  status: "pending" | "approved";
  createdAt: string;
  approvedAt?: string;
};

const STORAGE_KEY = "counselflow-engagement-approvals-v1";

function readAll(): EngagementApprovalRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as EngagementApprovalRequest[];
  } catch {
    return [];
  }
}

function writeAll(requests: EngagementApprovalRequest[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
}

export function queueEngagementApproval(input: {
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

export function fetchPendingEngagementApprovals(): EngagementApprovalRequest[] {
  return readAll().filter((row) => row.status === "pending");
}

export function approveEngagement(matterId: string): boolean {
  const rows = readAll();
  const index = rows.findIndex(
    (row) => row.matterId === matterId && row.status === "pending",
  );
  if (index < 0) return false;
  rows[index] = {
    ...rows[index],
    status: "approved",
    approvedAt: new Date().toISOString(),
  };
  writeAll(rows);
  return true;
}
