import { AccountSummary } from "@/components/client-portal/AccountSummary";
import { PortalFeatureShell } from "@/components/client-portal/PortalFeatureShell";

export default function AccountSummaryPage() {
  return (
    <PortalFeatureShell
      title="Account Summary"
      description="Review invoice balance details, trust accounting, and built-in risk controls."
    >
      <AccountSummary />
    </PortalFeatureShell>
  );
}
