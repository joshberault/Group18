import type { ReactNode } from "react";
import "./billing-module.css";

/**
 * Scopes Billing styles and layout under .billing-module so CounselFlow
 * shell, Tailwind theme, and teammate modules are not overridden.
 */
export function BillingModuleShell({ children }: { children: ReactNode }) {
  return <div className="billing-module">{children}</div>;
}
