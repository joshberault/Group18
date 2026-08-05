/**
 * Demo billing admin password for destructive actions (invoice delete).
 * Replace with real role-based auth when Supabase auth is wired.
 */
export const BILLING_ADMIN_PASSWORD = "NV-ADMIN-628";

export function verifyBillingAdminPassword(password: string): boolean {
  return password.trim() === BILLING_ADMIN_PASSWORD;
}
