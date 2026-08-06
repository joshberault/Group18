import { CaseInformation } from "@/components/client-portal/CaseInformation";
import { PortalFeatureShell } from "@/components/client-portal/PortalFeatureShell";

export default function CaseInformationPage() {
  return (
    <PortalFeatureShell
      title="Case Information"
      description="Case types, important dates, signed contract, assigned team, and associated tickets."
    >
      <CaseInformation />
    </PortalFeatureShell>
  );
}
