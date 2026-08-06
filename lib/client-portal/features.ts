import type { LucideIcon } from "lucide-react";
import {
  Award,
  Bell,
  Briefcase,
  ClipboardList,
  CreditCard,
  GitBranch,
  LayoutDashboard,
  MessageSquare,
  Upload,
} from "lucide-react";

export interface PortalFeatureApp {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

export const PORTAL_FEATURE_APPS: PortalFeatureApp[] = [
  {
    id: "account-summary",
    title: "Account Summary",
    description: "Balances, invoices, and account overview",
    href: "/client-portal/account-summary",
    icon: LayoutDashboard,
  },
  {
    id: "pay-balance",
    title: "Pay Balance",
    description: "Review invoices and make a payment",
    href: "/client-portal/pay-balance",
    icon: CreditCard,
  },
  {
    id: "upload-documents",
    title: "Upload Documents",
    description: "Drop and submit case files securely",
    href: "/client-portal/upload-documents",
    icon: Upload,
  },
  {
    id: "requests",
    title: "Requests",
    description: "Ask the firm for help or updates",
    href: "/client-portal/requests",
    icon: ClipboardList,
  },
  {
    id: "case-information",
    title: "Case Information",
    description: "Matter details and team contacts",
    href: "/client-portal/case-information",
    icon: Briefcase,
  },
  {
    id: "messaging",
    title: "Messaging",
    description: "Secure messages with your legal team",
    href: "/client-portal/messaging",
    icon: MessageSquare,
  },
  {
    id: "case-status",
    title: "Case Status",
    description: "Track milestones and progress",
    href: "/client-portal/case-status",
    icon: GitBranch,
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Billing, document, and case alerts",
    href: "/client-portal/notifications",
    icon: Bell,
  },
  {
    id: "my-badges",
    title: "My Badges",
    description: "Badges earned for staying on top of your matter",
    href: "/client-portal/my-badges",
    icon: Award,
  },
];
