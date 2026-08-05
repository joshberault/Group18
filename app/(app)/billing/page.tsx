import { BillingPageClient } from "./BillingPageClient";
import { fetchBillingDashboard } from "@/lib/billing/queries";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const data = await fetchBillingDashboard();

  return <BillingPageClient dashboardData={data} />;
}
