import { BookOpen } from "lucide-react";
import { AccountingSectionPlaceholder } from "@/components/accounting/AccountingSectionPlaceholder";

export default function RevenueLedgerPage() {
  return (
    <AccountingSectionPlaceholder
      title="Revenue & General Ledger"
      description="Journal entries, revenue recognition, chart of accounts, general ledger, trial balance, adjustments, and month-end close."
      icon={<BookOpen className="h-7 w-7" />}
    />
  );
}
