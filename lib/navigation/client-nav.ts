import {
  Briefcase,
  CreditCard,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Upload,
  UserCircle,
} from "lucide-react";
import type { NavItem } from "@/lib/navigation";

/** Sidebar navigation used ONLY when the demo role is Client. */
export const CLIENT_NAV_ITEMS: NavItem[] = [
  {
    routeKey: "client_portal",
    label: "Dashboard",
    href: "/client-portal",
    icon: LayoutDashboard,
    description: "Your matters, invoices, and account overview",
  },
  {
    routeKey: "client_portal",
    label: "My Matters",
    href: "/client-portal/case-status",
    icon: Briefcase,
    description: "Matter status, milestones, and case updates",
  },
  {
    routeKey: "client_portal",
    label: "Invoices & Payments",
    href: "/client-portal/pay-balance",
    icon: CreditCard,
    description: "Outstanding invoices and payment options",
  },
  {
    routeKey: "client_portal",
    label: "Documents",
    href: "/client-portal/upload-documents",
    icon: Upload,
    description: "Upload and review case documents",
  },
  {
    routeKey: "client_portal",
    label: "Messages",
    href: "/client-portal/messaging",
    icon: MessageSquare,
    description: "Secure messaging with your legal team",
  },
  {
    routeKey: "client_portal",
    label: "Requests",
    href: "/client-portal/requests",
    icon: FileText,
    description: "Submit and track client requests",
  },
  {
    routeKey: "client_portal",
    label: "Account Settings",
    href: "/client-portal/account-summary",
    icon: UserCircle,
    description: "Account summary and billing preferences",
  },
];

export function isClientPortalRoute(pathname: string): boolean {
  return (
    pathname === "/client-portal" || pathname.startsWith("/client-portal/")
  );
}
