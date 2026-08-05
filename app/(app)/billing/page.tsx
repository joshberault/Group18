import { BillingDashboard } from "@/components/billing/BillingDashboard";
import { BillingModuleShell } from "@/components/billing/BillingModuleShell";
import { ClientRelatedMatters } from "@/components/client-related-matters/ClientRelatedMatters";
import { fetchBillingDashboard } from "@/lib/billing/queries";

export const dynamic = "force-dynamic";

/** Billing Dashboard KPIs, period filters, and revenue attribution. */
export default async function BillingPage() {
  const data = await fetchBillingDashboard();

  return (
    <>
      <BillingModuleShell>
        <BillingDashboard data={data} />
      </BillingModuleShell>
      {/* Rendered outside the shell so scoped .billing-module CSS does not override it. */}
      <ClientRelatedMatters />
    </>
  );
}
