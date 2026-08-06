import { cn } from "@/lib/utils/cn";
import { Badge } from "./Badge";

type StatusType =
  | "active"
  | "inactive"
  | "open"
  | "closed"
  | "pending"
  | "draft"
  | "sent"
  | "paid"
  | "partial"
  | "void"
  | "completed"
  | "in_progress"
  | "critical"
  | "high"
  | "medium"
  | "low"
  | string;

const statusConfig: Record<
  string,
  { label: string; variant: "success" | "warning" | "danger" | "neutral" | "gold" | "default" }
> = {
  active: { label: "Active", variant: "success" },
  inactive: { label: "Inactive", variant: "neutral" },
  open: { label: "Open", variant: "success" },
  closed: { label: "Closed", variant: "neutral" },
  pending: { label: "Pending", variant: "warning" },
  draft: { label: "Draft", variant: "neutral" },
  sent: { label: "Sent", variant: "gold" },
  paid: { label: "Paid", variant: "success" },
  partial: { label: "Partial", variant: "warning" },
  void: { label: "Void", variant: "danger" },
  written_off: { label: "Written Off", variant: "danger" },
  completed: { label: "Completed", variant: "success" },
  in_progress: { label: "In Progress", variant: "gold" },
  awaiting_attorney_review: { label: "Awaiting Attorney Review", variant: "warning" },
  returned_for_correction: { label: "Returned for Correction", variant: "warning" },
  ready_to_send: { label: "Ready to Send", variant: "gold" },
  under_review: { label: "Under Review", variant: "neutral" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
  current: { label: "Current", variant: "success" },
  past_due: { label: "Past Due", variant: "warning" },
  payment_plan: { label: "Payment Plan", variant: "gold" },
  promise_to_pay: { label: "Promise To Pay", variant: "gold" },
  attorney_assistance_needed: {
    label: "Attorney Assistance Needed",
    variant: "warning",
  },
  disputed: { label: "Disputed", variant: "danger" },
  final_notice: { label: "Final Notice", variant: "danger" },
  write_off_requested: { label: "Write-Off Requested", variant: "warning" },
  critical: { label: "Critical", variant: "danger" },
  high: { label: "High", variant: "warning" },
  medium: { label: "Medium", variant: "gold" },
  low: { label: "Low", variant: "neutral" },
  alert_open: { label: "Open", variant: "warning" },
  reviewed: { label: "Reviewed", variant: "gold" },
  escalated: { label: "Escalated", variant: "danger" },
  resolved: { label: "Resolved", variant: "success" },
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    variant: "neutral" as const,
  };

  return (
    <Badge variant={config.variant} className={cn(className)}>
      {config.label}
    </Badge>
  );
}
