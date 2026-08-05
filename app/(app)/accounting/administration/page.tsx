import { Settings } from "lucide-react";
import { AccountingSectionPlaceholder } from "@/components/accounting/AccountingSectionPlaceholder";

export default function AdministrationPage() {
  return (
    <AccountingSectionPlaceholder
      title="Administration"
      description="Role and permission settings, offices, billing rates, tax settings, matter types, accounting periods, integrations, and firm configuration."
      icon={<Settings className="h-7 w-7" />}
    />
  );
}
