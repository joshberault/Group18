import { CaseStatus } from "@/components/client-portal/CaseStatus";
import { PortalFeatureShell } from "@/components/client-portal/PortalFeatureShell";

export default function CaseStatusPage() {
  return (
    <PortalFeatureShell
      title="Case Status"
      description="Track the major client and legal-team tasks for each case you are engaged in."
    >
      <CaseStatus />
    </PortalFeatureShell>
  );
}
