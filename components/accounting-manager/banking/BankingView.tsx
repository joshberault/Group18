"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Check,
  CreditCard,
  FileDown,
  RefreshCw,
  Send,
} from "lucide-react";
import { AccountingTabs } from "@/components/accounting-manager/shared/AccountingTabs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { KPICard } from "@/components/ui/KPICard";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";
import { exportToCsv } from "@/lib/accounting-manager/export-csv";
import { fetchBankingWorkspace, useSupabaseQuery } from "@/lib/accounting";
import type { BankAccount, BankTransaction } from "@/lib/mock-data/accounting-manager/banking";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatCurrency } from "@/lib/utils/cn";

type BankingTab = "overview" | "accounts" | "transactions" | "reconciliation";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "accounts", label: "Bank Accounts" },
  { id: "transactions", label: "Transactions" },
  { id: "reconciliation", label: "Reconciliation" },
];

function reconVariant(status: string) {
  if (status === "Reconciled") return "success" as const;
  if (status === "In Progress") return "warning" as const;
  return "neutral" as const;
}

export function BankingView() {
  const { data: workspace, loading, error } = useSupabaseQuery(
    fetchBankingWorkspace,
    [],
  );
  const bankingSummaryKpis = workspace?.kpis ?? [];
  const bankAccounts = workspace?.accounts ?? [];
  const bankReconciliations = workspace?.reconciliations ?? [];
  const [localTransactions, setLocalTransactions] = useState<BankTransaction[]>([]);
  useEffect(() => {
    if (workspace?.transactions) {
      setLocalTransactions(workspace.transactions);
    }
  }, [workspace]);
  const transactions = localTransactions;
  const [activeTab, setActiveTab] = useState<BankingTab>("overview");
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; action: () => void } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch =
        !search ||
        t.payee.toLowerCase().includes(search.toLowerCase()) ||
        t.reference.toLowerCase().includes(search.toLowerCase());
      const matchesAccount =
        accountFilter === "all" || t.bankAccountId === accountFilter;
      const matchesType = typeFilter === "all" || t.type === typeFilter;
      return matchesSearch && matchesAccount && matchesType;
    });
  }, [transactions, search, accountFilter, typeFilter]);

  const handleExport = () => {
    exportToCsv(
      "bank-transactions.csv",
      ["Date", "Payee", "Type", "Reference", "Amount", "Cleared", "Category"],
      filteredTransactions.map((t) => [
        t.date,
        t.payee,
        t.type,
        t.reference,
        String(t.amount),
        t.cleared ? "Yes" : "No",
        t.category,
      ]),
    );
    setToast("Bank transactions exported");
  };

  const markCleared = (txn: BankTransaction) => {
    setLocalTransactions((prev) =>
      prev.map((t) => (t.id === txn.id ? { ...t, cleared: true } : t)),
    );
    setToast("Transaction marked as cleared");
    setSelectedTransaction(null);
  };

  if (loading) {
    return <LoadingState message="Loading banking data..." />;
  }

  if (error) {
    return (
      <EmptyState
        title="Banking data unavailable"
        description={error}
        moduleLabel="Banking"
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Banking"
        description="Bank accounts, bank feeds, reconciliations, ACH payments, wire transfers, and the check register."
      >
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setToast("ACH batch scheduled (prototype)")}>
            <Send className="h-4 w-4" />
            Schedule ACH
          </Button>
          <Button
            variant="secondary"
            onClick={() => setToast("Wire transfer form opened (prototype)")}
          >
            <CreditCard className="h-4 w-4" />
            Wire Transfer
          </Button>
          <Button
            variant="secondary"
            onClick={() => setActiveTab("reconciliation")}
          >
            <RefreshCw className="h-4 w-4" />
            Reconcile
          </Button>
          <Button variant="secondary" onClick={handleExport}>
            <FileDown className="h-4 w-4" />
            Export
          </Button>
        </div>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {bankingSummaryKpis.map((kpi) => (
          <KPICard
            key={kpi.id}
            title={kpi.title}
            value={kpi.value}
            subtitle={kpi.supportingText}
            icon={kpi.id === "total-cash" ? Building2 : undefined}
            className={
              kpi.warning ? "border-amber-300 bg-amber-50/60" : undefined
            }
          />
        ))}
      </div>

      <AccountingTabs
        tabs={TABS}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as BankingTab)}
        className="mb-6"
      />

      {(activeTab === "overview" || activeTab === "accounts") && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Bank Accounts</CardTitle>
            <CardDescription>
              Operating, payroll, and savings accounts by office
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto px-6 pb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Office</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead>Reconciliation</TableHead>
                  <TableHead className="text-right">Unreconciled</TableHead>
                  <TableHead>{" "}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <div className="font-medium">{account.name}</div>
                      <div className="text-xs text-muted">{account.accountNumber}</div>
                    </TableCell>
                    <TableCell>{account.bankName}</TableCell>
                    <TableCell>{account.accountType}</TableCell>
                    <TableCell>{account.office}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(account.balance)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(account.availableBalance)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={reconVariant(account.reconciliationStatus)}>
                        {account.reconciliationStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {account.unreconciledCount > 0 ? (
                        <span className="font-medium text-amber-700">
                          {account.unreconciledCount}
                        </span>
                      ) : (
                        "0"
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedAccount(account)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {(activeTab === "overview" || activeTab === "transactions") && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Bank Transactions</CardTitle>
            <CardDescription>
              Deposits, withdrawals, ACH, wires, checks, and transfers
            </CardDescription>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            {activeTab === "transactions" && (
              <div className="flex flex-wrap gap-3">
                <Input
                  placeholder="Search payee or reference..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-xs"
                />
                <Select
                  options={[
                    { value: "all", label: "All accounts" },
                    ...bankAccounts.map((a) => ({
                      value: a.id,
                      label: a.name,
                    })),
                  ]}
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className="max-w-xs"
                />
                <Select
                  options={[
                    { value: "all", label: "All types" },
                    { value: "Deposit", label: "Deposit" },
                    { value: "Withdrawal", label: "Withdrawal" },
                    { value: "ACH", label: "ACH" },
                    { value: "Wire", label: "Wire" },
                    { value: "Check", label: "Check" },
                    { value: "Transfer", label: "Transfer" },
                    { value: "Fee", label: "Fee" },
                  ]}
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="max-w-xs"
                />
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Payee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Cleared</TableHead>
                  <TableHead>{" "}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(activeTab === "overview"
                  ? transactions.slice(0, 6)
                  : filteredTransactions
                ).map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell>{txn.date}</TableCell>
                    <TableCell className="font-medium">{txn.payee}</TableCell>
                    <TableCell>{txn.type}</TableCell>
                    <TableCell>{txn.reference}</TableCell>
                    <TableCell>{txn.category}</TableCell>
                    <TableCell
                      className={`text-right font-medium ${txn.amount < 0 ? "text-red-600" : "text-green-700"}`}
                    >
                      {formatCurrency(txn.amount)}
                    </TableCell>
                    <TableCell>
                      {txn.cleared ? (
                        <Badge variant="success">
                          <Check className="mr-1 h-3 w-3" />
                          Cleared
                        </Badge>
                      ) : (
                        <Badge variant="warning">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedTransaction(txn)}
                      >
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {(activeTab === "overview" || activeTab === "reconciliation") && (
        <Card>
          <CardHeader>
            <CardTitle>Bank Reconciliation</CardTitle>
            <CardDescription>
              Statement balance vs. book balance with outstanding items
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto px-6 pb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Statement</TableHead>
                  <TableHead className="text-right">Book</TableHead>
                  <TableHead className="text-right">Outstanding Checks</TableHead>
                  <TableHead className="text-right">Outstanding Deposits</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>{" "}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankReconciliations.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell className="font-medium">{rec.accountName}</TableCell>
                    <TableCell>{rec.period}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(rec.statementBalance)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(rec.bookBalance)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(rec.outstandingChecks)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(rec.outstandingDeposits)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${rec.variance !== 0 ? "text-red-600" : ""}`}
                    >
                      {formatCurrency(rec.variance)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={reconVariant(rec.status)}>{rec.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setToast(`Reconciliation opened for ${rec.accountName}`)
                        }
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Reconcile
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Drawer
        isOpen={!!selectedAccount}
        onClose={() => setSelectedAccount(null)}
        title={selectedAccount?.name ?? ""}
        description={selectedAccount?.accountNumber}
      >
        {selectedAccount && (
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-muted">Bank</dt>
              <dd>{selectedAccount.bankName}</dd>
            </div>
            <div>
              <dt className="text-muted">Balance</dt>
              <dd className="text-lg font-semibold">
                {formatCurrency(selectedAccount.balance)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Available Balance</dt>
              <dd>{formatCurrency(selectedAccount.availableBalance)}</dd>
            </div>
            <div>
              <dt className="text-muted">Last Reconciled</dt>
              <dd>{selectedAccount.lastReconciled}</dd>
            </div>
            <div>
              <dt className="text-muted">Unreconciled Items</dt>
              <dd>{selectedAccount.unreconciledCount}</dd>
            </div>
            <Button
              onClick={() => {
                setActiveTab("reconciliation");
                setSelectedAccount(null);
              }}
            >
              Start Reconciliation
            </Button>
          </dl>
        )}
      </Drawer>

      <Drawer
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        title="Transaction Detail"
        description={selectedTransaction?.reference}
      >
        {selectedTransaction && (
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-muted">Date</dt>
              <dd>{selectedTransaction.date}</dd>
            </div>
            <div>
              <dt className="text-muted">Payee</dt>
              <dd className="font-medium">{selectedTransaction.payee}</dd>
            </div>
            <div>
              <dt className="text-muted">Description</dt>
              <dd>{selectedTransaction.description}</dd>
            </div>
            <div>
              <dt className="text-muted">Amount</dt>
              <dd className="text-lg font-semibold">
                {formatCurrency(selectedTransaction.amount)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Category</dt>
              <dd>{selectedTransaction.category}</dd>
            </div>
            {!selectedTransaction.cleared && (
              <Button onClick={() => markCleared(selectedTransaction)}>
                Mark as Cleared
              </Button>
            )}
          </dl>
        )}
      </Drawer>

      <Modal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.title ?? ""}
        description={confirmAction?.message}
      >
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmAction(null)}>
            Cancel
          </Button>
          <Button onClick={() => confirmAction?.action()}>Confirm</Button>
        </div>
      </Modal>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
