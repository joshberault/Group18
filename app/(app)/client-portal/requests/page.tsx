import { PortalFeatureShell } from "@/components/client-portal/PortalFeatureShell";
import { Requests } from "@/components/client-portal/Requests";

export default function RequestsPage() {
  return (
    <PortalFeatureShell
      title="Requests"
      description="Submit requests to your legal team or fulfill requests they have sent to you."
    >
      <Requests />
    </PortalFeatureShell>
  );
}
