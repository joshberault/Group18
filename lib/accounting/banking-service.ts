import {
  accountingUnavailableMessage,
  asNumber,
  getAccountingSupabase,
  type QueryResult,
} from "./db";
import type {
  BankAccount,
  BankingSummaryKpi,
  BankReconciliation,
  BankTransaction,
} from "@/lib/mock-data/accounting-manager/banking";

export async function fetchBankingWorkspace(): Promise<
  QueryResult<{
    kpis: BankingSummaryKpi[];
    accounts: BankAccount[];
    transactions: BankTransaction[];
    reconciliations: BankReconciliation[];
  }>
> {
  const supabase = getAccountingSupabase();
  const empty = { kpis: [], accounts: [], transactions: [], reconciliations: [] };
  if (!supabase) {
    return { data: empty, error: accountingUnavailableMessage(), empty: true };
  }

  const [accountsRes, txRes, recRes] = await Promise.all([
    supabase.from("bank_accounts").select("*").order("name"),
    supabase
      .from("bank_transactions")
      .select("*")
      .order("transaction_date", { ascending: false })
      .limit(100),
    supabase.from("bank_reconciliations").select("*"),
  ]);

  if (accountsRes.error) {
    return { data: empty, error: accountsRes.error.message, empty: true };
  }

  const accounts: BankAccount[] = (accountsRes.data ?? []).map((a) => ({
    id: a.id as string,
    name: a.name as string,
    bankName: a.bank_name as string,
    accountNumber: a.account_number as string,
    accountType: a.account_type as BankAccount["accountType"],
    office: (a.office as string) ?? "",
    balance: asNumber(a.balance),
    availableBalance: asNumber(a.available_balance),
    lastReconciled: (a.last_reconciled as string) ?? "",
    reconciliationStatus: a.reconciliation_status as BankAccount["reconciliationStatus"],
    unreconciledCount: asNumber(a.unreconciled_count),
  }));

  const totalCash = accounts.reduce((s, a) => s + a.balance, 0);
  const unreconciled = accounts.reduce((s, a) => s + a.unreconciledCount, 0);

  const kpis: BankingSummaryKpi[] = [
    {
      id: "total-cash",
      title: "Total Cash Position",
      value: `$${totalCash.toLocaleString()}`,
      supportingText: "All operating accounts",
    },
    {
      id: "unreconciled",
      title: "Unreconciled Items",
      value: String(unreconciled),
      supportingText: "Across all accounts",
      warning: unreconciled > 0,
    },
  ];

  const accountNames = new Map(accounts.map((a) => [a.id, a.name]));

  const transactions: BankTransaction[] = (txRes.data ?? []).map((t) => ({
    id: t.id as string,
    date: t.transaction_date as string,
    bankAccountId: t.bank_account_id as string,
    type: t.transaction_type as BankTransaction["type"],
    payee: t.payee as string,
    reference: (t.reference_number as string) ?? "",
    description: t.description as string,
    amount: asNumber(t.amount),
    cleared: Boolean(t.cleared),
    category: (t.category as string) ?? "",
  }));

  const reconciliations: BankReconciliation[] = (recRes.data ?? []).map((r) => ({
    id: r.id as string,
    bankAccountId: r.bank_account_id as string,
    accountName: accountNames.get(r.bank_account_id as string) ?? "",
    period: r.period_label as string,
    statementBalance: asNumber(r.statement_balance),
    bookBalance: asNumber(r.book_balance),
    clearedDeposits: asNumber(r.cleared_deposits),
    clearedWithdrawals: asNumber(r.cleared_withdrawals),
    outstandingChecks: asNumber(r.outstanding_checks),
    outstandingDeposits: asNumber(r.outstanding_deposits),
    variance: asNumber(r.variance),
    status: r.status as BankReconciliation["status"],
    lastUpdated: (r.last_updated as string) ?? "",
  }));

  return {
    data: { kpis, accounts, transactions, reconciliations },
    error: null,
    empty: accounts.length === 0,
  };
}
