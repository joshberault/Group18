import {
  Award,
  Bell,
  Briefcase,
  ClipboardList,
  CreditCard,
  GitBranch,
  MessageSquare,
  Upload,
  Wallet,
} from "lucide-react";
import type { NavItem } from "@/lib/navigation";

/** Sidebar navigation used ONLY when the demo role is Client. */
export const CLIENT_NAV_ITEMS: NavItem[] = [
  {
    routeKey: "client_portal",
    label: "Account Summary",
    href: "/client-portal/account-summary",
    icon: Wallet,
    description: "Balances, invoices, and account overview",
  },
  {
    routeKey: "client_portal",
    label: "Pay Balance",
    href: "/client-portal/pay-balance",
    icon: CreditCard,
    description: "Review invoices and make a payment",
  },
  {
    routeKey: "client_portal",
    label: "Upload Documents",
    href: "/client-portal/upload-documents",
    icon: Upload,
    description: "Drop and submit case files securely",
  },
  {
    routeKey: "client_portal",
    label: "Requests",
    href: "/client-portal/requests",
    icon: ClipboardList,
    description: "Ask the firm for help or updates",
  },
  {
    routeKey: "client_portal",
    label: "Case Information",
    href: "/client-portal/case-information",
    icon: Briefcase,
    description: "Matter details and team contacts",
  },
  {
    routeKey: "client_portal",
    label: "Messaging",
    href: "/client-portal/messaging",
    icon: MessageSquare,
    description: "Secure messages with your legal team",
  },
  {
    routeKey: "client_portal",
    label: "Case Status",
    href: "/client-portal/case-status",
    icon: GitBranch,
    description: "Track milestones and progress",
  },
  {
    routeKey: "client_portal",
    label: "Notifications",
    href: "/client-portal/notifications",
    icon: Bell,
    description: "Billing, document, and case alerts",
  },
  {
    routeKey: "client_portal",
    label: "My Badges",
    href: "/client-portal/my-badges",
    icon: Award,
    description: "Badges earned for staying on top of your matter",
  },
];

export function isClientPortalRoute(pathname: string): boolean {
  return (
    pathname === "/client-portal" || pathname.startsWith("/client-portal/")
  );
}
