import { ClipboardList } from "lucide-react";
import { AccountingSectionPlaceholder } from "@/components/accounting/AccountingSectionPlaceholder";

export default function AuditLogPage() {
  return (
    <AccountingSectionPlaceholder
      title="Audit Log"
      description="Who created, changed, approved, or deleted financial records, including timestamps and before-and-after values when available."
      icon={<ClipboardList className="h-7 w-7" />}
    />
  );
}
