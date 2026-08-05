import { Landmark } from "lucide-react";
import { AccountingSectionPlaceholder } from "@/components/accounting/AccountingSectionPlaceholder";

export default function TrustAccountingPage() {
  return (
    <AccountingSectionPlaceholder
      title="Trust Accounting"
      description="Client trust balances, IOLTA accounts, trust deposits and withdrawals, trust ledgers, low-retainer alerts, and three-way reconciliation."
      icon={<Landmark className="h-7 w-7" />}
    />
  );
}
