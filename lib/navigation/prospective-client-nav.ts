import { LayoutDashboard } from "lucide-react";
import type { NavItem } from "@/lib/navigation";

/** Sidebar navigation used ONLY when the demo role is Prospective Client. */
export const PROSPECTIVE_CLIENT_NAV_ITEMS: NavItem[] = [
  {
    routeKey: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Request a consultation with the firm",
  },
];
