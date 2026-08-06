"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  FileDown,
  Landmark,
  Plus,
  RefreshCw,
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
import { StatusBadge } from "@/components/ui/StatusBadge";
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
import {
  fetchTrustWorkspace,
  resolveTrustException,
  useSupabaseQuery,
  voidTrustTransaction,
} from "@/lib/accounting";
import type {
  TrustClientLedger,
  TrustException,
  TrustTransaction,
} from "@/lib/mock-data/accounting-manager/trust";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatCurrency } from "@/lib/utils/cn";

type TrustTab = "overview" | "accounts" | "ledgers" | "transactions" | "exceptions";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "accounts", label: "Trust Accounts" },
  { id: "ledgers", label: "Client Ledgers" },
  { id: "transactions", label: "Transactions" },
  { id: "exceptions", label: "Exceptions" },
];

function reconStatusVariant(status: string) {
  if (status === "Balanced") return "success" as const;
  if (status === "Variance") return "danger" as const;
  return "warning" as const;
}

function retainerVariant(status: string) {
  if (status === "Sufficient") return "success" as const;
  if (status === "Low") return "warning" as const;
  return "danger" as const;
}

export function TrustAccountingView() {
  const { selectedRole } = useDemoRole();
  const { data: workspace, loading, error, refresh } = useSupabaseQuery(
    fetchTrustWorkspace,
    [],
  );
  const trustSummaryKpis = workspace?.kpis ?? [];
  const trustAccounts = workspace?.accounts ?? [];
  const trustClientLedgers = workspace?.ledgers ?? [];
  const trustReconciliations = workspace?.reconciliations ?? [];
  const [activeTab, setActiveTab] = useState<TrustTab>("overview");
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [selectedLedger, setSelectedLedger] = useState<TrustClientLedger | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<TrustTransaction | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; action: () => void } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const transactions = workspace?.transactions ?? [];
  const exceptions = workspace?.exceptions ?? [];

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch =
        !search ||
        t.client.toLowerCase().includes(search.toLowerCase()) ||
        t.reference.toLowerCase().includes(search.toLowerCase());
      const matchesAccount =
        accountFilter === "all" || t.trustAccountId === accountFilter;
      return matchesSearch && matchesAccount;
    });
  }, [search, accountFilter, transactions]);

  const filteredLedgers = useMemo(() => {
    return trustClientLedgers.filter(
      (l) =>
        !search ||
        l.client.toLowerCase().includes(search.toLowerCase()) ||
        l.matter.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search]);

  const handleExport = () => {
    exportToCsv(
      "trust-transactions.csv",
      ["Date", "Client", "Matter", "Type", "Reference", "Amount", "Status"],
      filteredTransactions.map((t) => [
        t.date,
        t.client,
        t.matter,
        t.type,
        t.reference,
        String(t.amount),
        t.status,
      ]),
    );
    setToast("Trust transactions exported");
  };

  const resolveException = (ex: TrustException) => {
    setConfirmAction({
      title: "Resolve Exception",
      message: `Mark "${ex.type}" for ${ex.client} as resolved?`,
      action: () => {
        void (async () => {
          const result = await resolveTrustException({
            exceptionId: ex.id,
            actor: { name: "Alex Morgan", role: selectedRole },
          });
          if (result.ok) {
            setToast("Exception resolved");
            await refresh();
          } else {
            setToast(result.error ?? "Failed to resolve exception");
          }
          setConfirmAction(null);
        })();
      },
    });
  };

  if (loading) {
    return <LoadingState message="Loading trust accounting..." />;
  }

  if (error) {
    return (
      <EmptyState
        title="Trust data unavailable"
        description={error}
        moduleLabel="Trust Accounting"
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Trust Accounting"
        description="Client trust balances, IOLTA accounts, trust deposits and withdrawals, trust ledgers, low-retainer alerts, and three-way reconciliation."
      >
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setToast("Trust deposit recorded (prototype)")}>
            <Plus className="h-4 w-4" />
            Record Deposit
          </Button>
          <Button
            variant="secondary"
            onClick={() => setToast("Trust transfer initiated (prototype)")}
          >
            <ArrowLeftRight className="h-4 w-4" />
            Transfer Funds
          </Button>
          <Button variant="secondary" onClick={() => setActiveTab("exceptions")}>
            <AlertTriangle className="h-4 w-4" />
            Review Exceptions
          </Button>
          <Button variant="secondary" onClick={handleExport}>
            <FileDown className="h-4 w-4" />
            Export
          </Button>
        </div>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {trustSummaryKpis.map((kpi) => (
          <KPICard
            key={kpi.id}
            title={kpi.title}
            value={kpi.value}
            subtitle={kpi.supportingText}
            icon={kpi.id === "total-trust" ? Landmark : undefined}
            className={
              kpi.warning
                ? "border-amber-300 bg-amber-50/60"
                : undefined
            }
          />
        ))}
      </div>

      <AccountingTabs
        tabs={TABS}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as TrustTab)}
        className="mb-6"
      />

      {(activeTab === "overview" || activeTab === "accounts") && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Three-Way Reconciliation</CardTitle>
            <CardDescription>
              Bank balance vs. firm ledger vs. client sub-ledger totals
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto px-6 pb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Bank</TableHead>
                  <TableHead className="text-right">Ledger</TableHead>
                  <TableHead className="text-right">Client Sub-Ledger</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>{" "}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trustReconciliations.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell className="font-medium">{rec.accountName}</TableCell>
                    <TableCell>{rec.period}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(rec.bankBalance)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(rec.ledgerBalance)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(rec.clientSubledgerTotal)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${rec.variance !== 0 ? "text-red-600" : ""}`}
                    >
                      {formatCurrency(rec.variance)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={reconStatusVariant(rec.status)}>
                        {rec.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {rec.variance !== 0 && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            setToast(`Reconciliation started for ${rec.accountName}`)
                          }
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Reconcile
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {(activeTab === "overview" || activeTab === "accounts") && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Trust Accounts</CardTitle>
            <CardDescription>IOLTA and client trust account balances</CardDescription>
          </CardHeader>
          <div className="overflow-x-auto px-6 pb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Office</TableHead>
                  <TableHead className="text-right">Bank Balance</TableHead>
                  <TableHead className="text-right">Ledger Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reconciliation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trustAccounts.map((account) => (
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
                      {formatCurrency(account.ledgerBalance)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={account.status.toLowerCase()} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={reconStatusVariant(account.reconciliationStatus)}>
                        {account.reconciliationStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {(activeTab === "overview" || activeTab === "ledgers") && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Client Ledgers</CardTitle>
            <CardDescription>
              Matter-level trust sub-ledgers with retainer status
            </CardDescription>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            {activeTab === "ledgers" && (
              <Input
                placeholder="Search client or matter..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Matter</TableHead>
                  <TableHead>Attorney</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Min. Retainer</TableHead>
                  <TableHead>Retainer Status</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>{" "}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLedgers.map((ledger) => (
                  <TableRow key={ledger.id}>
                    <TableCell className="font-medium">{ledger.client}</TableCell>
                    <TableCell>
                      <div>{ledger.matter}</div>
                      <div className="text-xs text-muted">{ledger.matterNumber}</div>
                    </TableCell>
                    <TableCell>{ledger.attorney}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(ledger.balance)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(ledger.minimumRetainer)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={retainerVariant(ledger.retainerStatus)}>
                        {ledger.retainerStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{ledger.lastActivity}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedLedger(ledger)}
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
            <CardTitle>Trust Transactions</CardTitle>
            <CardDescription>Deposits, withdrawals, transfers, and fees</CardDescription>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            {activeTab === "transactions" && (
              <div className="flex flex-wrap gap-3">
                <Input
                  placeholder="Search client or reference..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-xs"
                />
                <Select
                  options={[
                    { value: "all", label: "All accounts" },
                    ...trustAccounts.map((a) => ({
                      value: a.id,
                      label: a.name,
                    })),
                  ]}
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className="max-w-xs"
                />
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Matter</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>{" "}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(activeTab === "overview"
                  ? transactions.slice(0, 5)
                  : filteredTransactions
                ).map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell>{txn.date}</TableCell>
                    <TableCell>{txn.client}</TableCell>
                    <TableCell>{txn.matter}</TableCell>
                    <TableCell>{txn.type}</TableCell>
                    <TableCell>{txn.reference}</TableCell>
                    <TableCell
                      className={`text-right font-medium ${txn.amount < 0 ? "text-red-600" : "text-green-700"}`}
                    >
                      {formatCurrency(txn.amount)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={txn.status.toLowerCase()} />
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

      {(activeTab === "overview" || activeTab === "exceptions") && (
        <Card>
          <CardHeader>
            <CardTitle>Trust Exceptions</CardTitle>
            <CardDescription>
              Items requiring accounting review or correction
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto px-6 pb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Matter</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Days Open</TableHead>
                  <TableHead>{" "}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(activeTab === "overview" ? exceptions.slice(0, 3) : exceptions).map(
                  (ex) => (
                    <TableRow key={ex.id}>
                      <TableCell className="font-medium">{ex.type}</TableCell>
                      <TableCell>{ex.client}</TableCell>
                      <TableCell>{ex.matter}</TableCell>
                      <TableCell className="max-w-xs truncate">{ex.description}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(ex.amount)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={ex.severity.toLowerCase()} />
                      </TableCell>
                      <TableCell>{ex.daysOpen}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => resolveException(ex)}
                        >
                          Resolve
                        </Button>
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Drawer
        isOpen={!!selectedLedger}
        onClose={() => setSelectedLedger(null)}
        title="Client Ledger Detail"
        description={selectedLedger?.matterNumber}
      >
        {selectedLedger && (
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-muted">Client</dt>
              <dd className="font-medium">{selectedLedger.client}</dd>
            </div>
            <div>
              <dt className="text-muted">Matter</dt>
              <dd className="font-medium">{selectedLedger.matter}</dd>
            </div>
            <div>
              <dt className="text-muted">Trust Balance</dt>
              <dd className="text-lg font-semibold">
                {formatCurrency(selectedLedger.balance)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Minimum Retainer</dt>
              <dd>{formatCurrency(selectedLedger.minimumRetainer)}</dd>
            </div>
            <div>
              <dt className="text-muted">Attorney</dt>
              <dd>{selectedLedger.attorney}</dd>
            </div>
            <Button
              className="mt-4"
              onClick={() => {
                setToast("Retainer request sent to client (prototype)");
                setSelectedLedger(null);
              }}
            >
              Request Retainer Replenishment
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
              <dt className="text-muted">Running Balance</dt>
              <dd>{formatCurrency(selectedTransaction.runningBalance)}</dd>
            </div>
            <div>
              <dt className="text-muted">Status</dt>
              <dd>
                <StatusBadge status={selectedTransaction.status.toLowerCase()} />
              </dd>
            </div>
            {selectedTransaction.status === "Pending" && (
              <Button
                variant="danger"
                onClick={() =>
                  setConfirmAction({
                    title: "Void Transaction",
                    message: `Void ${selectedTransaction.reference}? This cannot be undone.`,
                    action: () => {
                      void (async () => {
                        const result = await voidTrustTransaction({
                          transactionId: selectedTransaction.id,
                          actor: { name: "Alex Morgan", role: selectedRole },
                        });
                        if (result.ok) {
                          setToast("Transaction voided");
                          await refresh();
                        } else {
                          setToast(result.error ?? "Failed to void transaction");
                        }
                        setSelectedTransaction(null);
                        setConfirmAction(null);
                      })();
                    },
                  })
                }
              >
                Void Transaction
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
