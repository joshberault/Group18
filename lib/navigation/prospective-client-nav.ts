import { LayoutDashboard } from "lucide-react";
import type { NavItem } from "@/lib/navigation/types";

/** Sidebar navigation used ONLY when the demo role is Prospective Client. */
export const PROSPECTIVE_CLIENT_NAV_ITEMS: NavItem[] = [
  {
    routeKey: "dashboard",
    label: "Consultation Request Form",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Request a consultation with the firm",
  },
];
