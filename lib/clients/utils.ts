import type { ConflictCheckStatus, FirmClient } from "@/lib/clients/types";
import { CONFLICT_STATUS_LABELS } from "@/lib/clients/types";

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatAddress(client: FirmClient): string {
  const lines = [
    client.address_line_1,
    client.address_line_2,
    [client.city, client.state, client.postal_code].filter(Boolean).join(", "),
  ].filter(Boolean);
  return lines.length ? lines.join("\n") : "—";
}

export function conflictBadgeVariant(
  status: ConflictCheckStatus,
): "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "cleared":
      return "success";
    case "pending":
      return "warning";
    case "possible_conflict":
      return "danger";
    case "not_reviewed":
    default:
      return "neutral";
  }
}

export function conflictLabel(status: ConflictCheckStatus): string {
  return CONFLICT_STATUS_LABELS[status];
}

export function summarizeClients(clients: FirmClient[]) {
  return {
    total: clients.length,
    active: clients.filter((c) => c.status === "active").length,
    individual: clients.filter((c) => c.client_type === "individual").length,
    company: clients.filter((c) => c.client_type === "company").length,
    conflictAlerts: clients.filter(
      (c) =>
        c.conflict_check_status === "pending" ||
        c.conflict_check_status === "possible_conflict",
    ).length,
  };
}
