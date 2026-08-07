import type { LucideIcon } from "lucide-react";
import type { UserRole } from "@/lib/types";

export type RouteKey =
  | "dashboard"
  | "analytics"
  | "approvals"
  | "clients"
  | "matters"
  | "admin"
  | "administration"
  | "attorney_hub"
  | "time"
  | "tasks"
  | "calendar"
  | "notes"
  | "billing"
  | "invoices"
  | "receivables"
  | "accounting"
  | "reports"
  | "risk_center"
  | "client_portal"
  | "trust_accounting"
  | "revenue_ledger"
  | "banking"
  | "accounts_payable"
  | "audit_log"
  | "intake";

export interface NavItem {
  routeKey: RouteKey;
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  /** Demo roles that can see this nav item (standard sidebar only) */
  roles?: UserRole[];
  /** Nested sidebar links shown under this item (e.g. Manager Dashboard sections). */
  children?: NavItem[];
}
