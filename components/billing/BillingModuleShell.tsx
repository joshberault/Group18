import type { ReactNode } from "react";

/**
 * Legacy no-op wrapper — Billing pages now use CounselFlow AppShell only.
 * Kept so any stray imports compile safely.
 */
export function BillingModuleShell({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
