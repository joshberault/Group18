import { Wallet } from "lucide-react";
import { AccountingSectionPlaceholder } from "@/components/accounting/AccountingSectionPlaceholder";

export default function AccountsPayablePage() {
  return (
    <AccountingSectionPlaceholder
      title="Expenses & Accounts Payable"
      description="Vendor bills, expense reimbursements, matter-related expenses, cost recovery, payment approvals, and accounts payable."
      icon={<Wallet className="h-7 w-7" />}
    />
  );
}
