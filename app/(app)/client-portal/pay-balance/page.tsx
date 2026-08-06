import { PayBalance } from "@/components/client-portal/PayBalance";
import { PortalFeatureShell } from "@/components/client-portal/PortalFeatureShell";

export default function PayBalancePage() {
  return (
    <PortalFeatureShell
      title="Pay Balance"
      description="Pay a balance, set up recurring card payments, or dispute invoice charges."
    >
      <PayBalance />
    </PortalFeatureShell>
  );
}
