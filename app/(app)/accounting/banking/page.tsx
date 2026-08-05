import { Building2 } from "lucide-react";
import { AccountingSectionPlaceholder } from "@/components/accounting/AccountingSectionPlaceholder";

export default function BankingPage() {
  return (
    <AccountingSectionPlaceholder
      title="Banking"
      description="Bank accounts, bank feeds, reconciliations, ACH payments, wire transfers, and the check register."
      icon={<Building2 className="h-7 w-7" />}
    />
  );
}
