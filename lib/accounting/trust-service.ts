import {
  accountingUnavailableMessage,
  asNumber,
  getAccountingSupabase,
  type QueryResult,
} from "./db";
import type {
  TrustAccount,
  TrustClientLedger,
  TrustException,
  TrustReconciliation,
  TrustSummaryKpi,
  TrustTransaction,
} from "@/lib/mock-data/accounting-manager/trust";

export async function fetchTrustWorkspace(): Promise<
  QueryResult<{
    kpis: TrustSummaryKpi[];
    accounts: TrustAccount[];
    ledgers: TrustClientLedger[];
    transactions: TrustTransaction[];
    exceptions: TrustException[];
    reconciliations: TrustReconciliation[];
  }>
> {
  const supabase = getAccountingSupabase();
  if (!supabase) {
    return {
      data: {
        kpis: [],
        accounts: [],
        ledgers: [],
        transactions: [],
        exceptions: [],
        reconciliations: [],
      },
      error: accountingUnavailableMessage(),
      empty: true,
    };
  }

  const [accountsRes, ledgersRes, txRes, exRes, recRes, clientsRes, mattersRes] =
    await Promise.all([
      supabase.from("trust_accounts").select("*").order("name"),
      supabase.from("trust_client_ledgers").select("*"),
      supabase
        .from("trust_transactions")
        .select("*")
        .order("transaction_date", { ascending: false })
        .limit(100),
      supabase.from("trust_exceptions").select("*").eq("status", "Open"),
      supabase.from("trust_reconciliations").select("*"),
      supabase.from("clients").select("id, name"),
      supabase.from("matters").select("id, title"),
    ]);

  if (accountsRes.error) {
    return {
      data: {
        kpis: [],
        accounts: [],
        ledgers: [],
        transactions: [],
        exceptions: [],
        reconciliations: [],
      },
      error: accountsRes.error.message,
      empty: true,
    };
  }

  const clientNames = new Map(
    (clientsRes.data ?? []).map((c) => [c.id as string, c.name as string]),
  );
  const matterNames = new Map(
    (mattersRes.data ?? []).map((m) => [m.id as string, m.title as string]),
  );

  const accounts: TrustAccount[] = (accountsRes.data ?? []).map((a) => ({
    id: a.id as string,
    name: a.name as string,
    bankName: a.bank_name as string,
    accountNumber: a.account_number as string,
    accountType: a.account_type as TrustAccount["accountType"],
    office: (a.office as string) ?? "",
    balance: asNumber(a.balance),
    ledgerBalance: asNumber(a.ledger_balance),
    clientBalance: asNumber(a.client_balance),
    status: a.status as TrustAccount["status"],
    lastReconciled: (a.last_reconciled as string) ?? "",
    reconciliationStatus: a.reconciliation_status as TrustAccount["reconciliationStatus"],
    variance: asNumber(a.variance),
  }));

  const totalHeld = accounts.reduce((s, a) => s + a.clientBalance, 0);
  const openExceptions = (exRes.data ?? []).length;

  const kpis: TrustSummaryKpi[] = [
    {
      id: "trust-held",
      title: "Trust Funds Held",
      value: `$${totalHeld.toLocaleString()}`,
      supportingText: `${accounts.length} trust accounts`,
    },
    {
      id: "exceptions",
      title: "Open Exceptions",
      value: String(openExceptions),
      supportingText: "Require review",
      warning: openExceptions > 0,
    },
  ];

  const ledgers: TrustClientLedger[] = (ledgersRes.data ?? []).map((l) => ({
    id: l.id as string,
    clientId: l.client_id as string,
    client: clientNames.get(l.client_id as string) ?? "Client",
    matterId: (l.matter_id as string) ?? "",
    matter: l.matter_id
      ? matterNames.get(l.matter_id as string) ?? "Matter"
      : "—",
    matterNumber: "",
    trustAccountId: l.trust_account_id as string,
    balance: asNumber(l.balance),
    minimumRetainer: asNumber(l.minimum_retainer),
    retainerStatus: l.retainer_status as TrustClientLedger["retainerStatus"],
    lastActivity: (l.last_activity as string) ?? "",
    attorney: (l.attorney as string) ?? "",
  }));

  const transactions: TrustTransaction[] = (txRes.data ?? []).map((t) => ({
    id: t.id as string,
    date: t.transaction_date as string,
    trustAccountId: t.trust_account_id as string,
    client: t.client_id
      ? clientNames.get(t.client_id as string) ?? ""
      : "",
    matter: t.matter_id
      ? matterNames.get(t.matter_id as string) ?? ""
      : "",
    type: t.transaction_type as TrustTransaction["type"],
    reference: (t.reference_number as string) ?? "",
    description: t.description as string,
    amount: asNumber(t.amount),
    runningBalance: asNumber(t.running_balance),
    status: t.status as TrustTransaction["status"],
  }));

  const exceptions: TrustException[] = (exRes.data ?? []).map((e) => ({
    id: e.id as string,
    type: e.exception_type as string,
    client: e.client_id
      ? clientNames.get(e.client_id as string) ?? ""
      : "",
    matter: e.matter_id
      ? matterNames.get(e.matter_id as string) ?? ""
      : "",
    description: e.description as string,
    amount: asNumber(e.amount),
    severity: e.severity as TrustException["severity"],
    daysOpen: asNumber(e.days_open),
    assignedTo: (e.assigned_to as string) ?? "",
  }));

  const accountNames = new Map(
    (accountsRes.data ?? []).map((a) => [a.id as string, a.name as string]),
  );

  const reconciliations: TrustReconciliation[] = (recRes.data ?? []).map(
    (r) => ({
      id: r.id as string,
      trustAccountId: r.trust_account_id as string,
      accountName: accountNames.get(r.trust_account_id as string) ?? "",
      period: r.period_label as string,
      bankBalance: asNumber(r.bank_balance),
      ledgerBalance: asNumber(r.book_balance),
      clientSubledgerTotal: asNumber(r.client_ledger_total),
      variance: asNumber(r.variance),
      status: r.status as TrustReconciliation["status"],
      lastUpdated: (r.last_updated as string) ?? "",
      preparedBy: "Alex Morgan",
    }),
  );

  return {
    data: { kpis, accounts, ledgers, transactions, exceptions, reconciliations },
    error: null,
    empty: accounts.length === 0,
  };
}
