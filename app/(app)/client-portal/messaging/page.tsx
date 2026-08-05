import { Messaging } from "@/components/client-portal/Messaging";
import { PortalFeatureShell } from "@/components/client-portal/PortalFeatureShell";

export default function MessagingPage() {
  return (
    <PortalFeatureShell
      title="Messaging"
      description="Create a secure message for your case team or the Billing Department."
    >
      <Messaging />
    </PortalFeatureShell>
  );
}
