import { PortalFeatureShell } from "@/components/client-portal/PortalFeatureShell";
import { UploadDocuments } from "@/components/client-portal/UploadDocuments";

export default function UploadDocumentsPage() {
  return (
    <PortalFeatureShell
      title="Upload Documents"
      description="Drop files into the box and submit them to your case documentation."
    >
      <UploadDocuments />
    </PortalFeatureShell>
  );
}
