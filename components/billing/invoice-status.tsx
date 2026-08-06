import { Badge } from "@/components/ui/Badge";
import type { InvoiceStatus } from "@/lib/billing/invoice-types";

export function invoiceStatusVariant(
  status: InvoiceStatus | string,
): "success" | "warning" | "danger" | "neutral" | "gold" | "default" {
  switch (status) {
    case "Paid":
      return "success";
    case "Partially Paid":
      return "warning";
    case "Overdue":
    case "Disputed":
      return "danger";
    case "Sent":
      return "gold";
    case "Cancelled":
    case "Draft":
      return "neutral";
    default:
      return "default";
  }
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus | string }) {
  return <Badge variant={invoiceStatusVariant(status)}>{status}</Badge>;
}
