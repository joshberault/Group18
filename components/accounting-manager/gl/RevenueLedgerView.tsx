"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  FileDown,
  Plus,
  Trash2,
} from "lucide-react";
import { AccountingTabs } from "@/components/accounting-manager/shared/AccountingTabs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { KPICard } from "@/components/ui/KPICard";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Textarea } from "@/components/ui/Textarea";
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
  fetchRevenueLedgerWorkspace,
  postJournalEntry,
  useSupabaseQuery,
} from "@/lib/accounting";
import type {
  CloseTask,
  JournalEntry,
  JournalEntryLine,
} from "@/lib/mock-data/accounting-manager/gl";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatCurrency } from "@/lib/utils/cn";

type GlTab =
  | "overview"
  | "journal-entries"
  | "revenue-recognition"
  | "general-ledger"
  | "trial-balance"
  | "month-end-close";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "journal-entries", label: "Journal Entries" },
  { id: "revenue-recognition", label: "Revenue Recognition" },
  { id: "general-ledger", label: "General Ledger" },
  { id: "trial-balance", label: "Trial Balance" },
  { id: "month-end-close", label: "Month-End Close" },
];

interface DraftLine {
  id: string;
  accountCode: string;
  description: string;
  debit: string;
  credit: string;
}

function emptyLine(defaultCode = "1010"): DraftLine {
  return {
    id: crypto.randomUUID(),
    accountCode: defaultCode,
    description: "",
    debit: "",
    credit: "",
  };
}

function closeTaskVariant(status: string) {
  if (status === "Complete") return "success" as const;
  if (status === "In Progress") return "warning" as const;
  if (status === "Blocked") return "danger" as const;
  return "neutral" as const;
}

export function RevenueLedgerView() {
  const { selectedRole } = useDemoRole();
  const { data: workspace, loading, error, warning, refresh } = useSupabaseQuery(
    fetchRevenueLedgerWorkspace,
    [],
  );
  const glSummaryKpis = workspace?.kpis ?? [];
  const revenueRecognitionItems = workspace?.revenueItems ?? [];
  const glLines = workspace?.glLines ?? [];
  const trialBalance = workspace?.trialBalance ?? [];
  const chartOfAccounts = workspace?.chartOfAccounts ?? [];
  const defaultAccountCode = chartOfAccounts[0]?.code ?? "1010";
  const [activeTab, setActiveTab] = useState<GlTab>("overview");
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [tasks, setTasks] = useState<CloseTask[]>([]);
  useEffect(() => {
    if (workspace) {
      setEntries(workspace.journalEntries);
      setTasks(workspace.closeTasks);
    }
  }, [workspace]);
  const [showJeForm, setShowJeForm] = useState(false);
  const [jeDate, setJeDate] = useState("2026-08-05");
  const [jeDescription, setJeDescription] = useState("");
  const [jeLines, setJeLines] = useState<DraftLine[]>(() => [
    emptyLine(defaultAccountCode),
    emptyLine(defaultAccountCode),
  ]);
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; action: () => void } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [accountFilter, setAccountFilter] = useState("all");

  const totalDebits = useMemo(
    () => jeLines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0),
    [jeLines],
  );
  const totalCredits = useMemo(
    () => jeLines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0),
    [jeLines],
  );
  const isBalanced = totalDebits > 0 && totalDebits === totalCredits;

  const filteredGlLines = useMemo(
    () =>
      accountFilter === "all"
        ? glLines
        : glLines.filter((l) => l.accountCode === accountFilter),
    [accountFilter],
  );

  const trialTotals = useMemo(() => {
    const debits = trialBalance.reduce((s, r) => s + r.debit, 0);
    const credits = trialBalance.reduce((s, r) => s + r.credit, 0);
    return { debits, credits, balanced: debits === credits };
  }, []);

  const closeProgress = useMemo(() => {
    const complete = tasks.filter((t) => t.status === "Complete").length;
    return Math.round((complete / tasks.length) * 100);
  }, [tasks]);

  const updateLine = (id: string, field: keyof DraftLine, value: string) => {
    setJeLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
    );
  };

  const addLine = () => setJeLines((prev) => [...prev, emptyLine()]);

  const removeLine = (id: string) => {
    if (jeLines.length <= 2) return;
    setJeLines((prev) => prev.filter((l) => l.id !== id));
  };

  const submitJournalEntry = () => {
    if (!isBalanced || !jeDescription.trim()) return;

    const lines: JournalEntryLine[] = jeLines.map((l, i) => {
      const account = chartOfAccounts.find((a) => a.code === l.accountCode)!;
      return {
        id: `jel-new-${i}`,
        accountCode: l.accountCode,
        accountName: account.name,
        description: l.description || jeDescription,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
      };
    });

    const newEntry: JournalEntry = {
      id: `je-new-${Date.now()}`,
      entryNumber: `JE-2026-${String(entries.length + 840).padStart(4, "0")}`,
      date: jeDate,
      description: jeDescription,
      status: "Draft",
      totalDebit: totalDebits,
      totalCredit: totalCredits,
      createdBy: "Alex Morgan",
      lines,
    };

    setEntries((prev) => [newEntry, ...prev]);
    setShowJeForm(false);
    setJeDescription("");
    setJeLines([emptyLine(defaultAccountCode), emptyLine(defaultAccountCode)]);
    setToast("Journal entry created as draft");
  };

  const postEntry = (entry: JournalEntry) => {
    setConfirmAction({
      title: "Post Journal Entry",
      message: `Post ${entry.entryNumber} for ${formatCurrency(entry.totalDebit)}? This will update the general ledger.`,
      action: () => {
        void (async () => {
          const result = await postJournalEntry({
            entryId: entry.id,
            actor: { name: "Alex Morgan", role: selectedRole },
          });
          if (result.ok) {
            setToast(`${entry.entryNumber} posted successfully`);
            await refresh();
          } else {
            setToast(result.error ?? "Failed to post entry");
          }
          setConfirmAction(null);
        })();
      },
    });
  };

  const reverseEntry = (entry: JournalEntry) => {
    setConfirmAction({
      title: "Reverse Journal Entry",
      message: `Reverse ${entry.entryNumber}? A reversing entry will be created.`,
      action: () => {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entry.id ? { ...e, status: "Reversed" } : e,
          ),
        );
        setToast(`${entry.entryNumber} reversed`);
        setConfirmAction(null);
      },
    });
  };

  const completeTask = (task: CloseTask) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, status: "Complete" as const } : t,
      ),
    );
    setToast(`"${task.task}" marked complete`);
  };

  const handleExportTrialBalance = () => {
    exportToCsv(
      "trial-balance.csv",
      ["Account Code", "Account Name", "Type", "Debit", "Credit"],
      trialBalance.map((r) => [
        r.accountCode,
        r.accountName,
        r.accountType,
        String(r.debit),
        String(r.credit),
      ]),
    );
    setToast("Trial balance exported");
  };

  if (loading) {
    return <LoadingState message="Loading general ledger..." />;
  }

  if (error) {
    return (
      <EmptyState
        title="Ledger data unavailable"
        description={error}
        moduleLabel="Revenue & General Ledger"
      />
    );
  }

  return (
    <>
      {warning ? (
        <Card className="mb-4 border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          {warning}
        </Card>
      ) : null}
      <PageHeader
        title="Revenue & General Ledger"
        description="Journal entries, revenue recognition, chart of accounts, general ledger, trial balance, adjustments, and month-end close."
      >
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => { setShowJeForm(true); setActiveTab("journal-entries"); }}>
            <Plus className="h-4 w-4" />
            New Journal Entry
          </Button>
          <Button variant="secondary" onClick={() => setActiveTab("month-end-close")}>
            <BookOpen className="h-4 w-4" />
            Month-End Close
          </Button>
          <Button variant="secondary" onClick={handleExportTrialBalance}>
            <FileDown className="h-4 w-4" />
            Export Trial Balance
          </Button>
        </div>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {glSummaryKpis.map((kpi) => (
          <KPICard
            key={kpi.id}
            title={kpi.title}
            value={kpi.id === "close-progress" ? `${closeProgress}%` : kpi.value}
            subtitle={kpi.supportingText}
            className={
              kpi.warning ? "border-amber-300 bg-amber-50/60" : undefined
            }
          />
        ))}
      </div>

      <AccountingTabs
        tabs={TABS}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as GlTab)}
        className="mb-6"
      />

      {(activeTab === "overview" || activeTab === "journal-entries") && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Journal Entries</CardTitle>
                <CardDescription>
                  Draft, posted, and reversed journal entries
                </CardDescription>
              </div>
              {activeTab === "journal-entries" && (
                <Button size="sm" onClick={() => setShowJeForm(true)}>
                  <Plus className="h-4 w-4" />
                  New Entry
                </Button>
              )}
            </div>
          </CardHeader>
          <div className="overflow-x-auto px-6 pb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entry #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>{" "}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(activeTab === "overview"
                  ? entries.slice(0, 4)
                  : entries
                ).map(
                  (entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {entry.entryNumber}
                      </TableCell>
                      <TableCell>{entry.date}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {entry.description}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(entry.totalDebit)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(entry.totalCredit)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={entry.status.toLowerCase()} />
                      </TableCell>
                      <TableCell>{entry.createdBy}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {entry.status === "Draft" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => postEntry(entry)}
                            >
                              Post
                            </Button>
                          )}
                          {entry.status === "Posted" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => reverseEntry(entry)}
                            >
                              Reverse
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {(activeTab === "overview" || activeTab === "revenue-recognition") && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Revenue Recognition</CardTitle>
            <CardDescription>
              Recognized, deferred, and pending revenue by matter
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto px-6 pb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Matter</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Recognized</TableHead>
                  <TableHead className="text-right">Deferred</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(activeTab === "overview"
                  ? revenueRecognitionItems.slice(0, 4)
                  : revenueRecognitionItems
                ).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.client}</TableCell>
                    <TableCell>
                      <div>{item.matter}</div>
                      <div className="text-xs text-muted">{item.matterNumber}</div>
                    </TableCell>
                    <TableCell>{item.invoiceNumber}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right text-green-700">
                      {formatCurrency(item.recognizedAmount)}
                    </TableCell>
                    <TableCell className="text-right text-amber-700">
                      {formatCurrency(item.deferredAmount)}
                    </TableCell>
                    <TableCell>{item.recognitionMethod}</TableCell>
                    <TableCell>
                      <StatusBadge status={item.status.toLowerCase()} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {(activeTab === "overview" || activeTab === "general-ledger") && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>General Ledger</CardTitle>
            <CardDescription>Posted transactions by account</CardDescription>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            {activeTab === "general-ledger" && (
              <Select
                label="Filter by account"
                options={[
                  { value: "all", label: "All accounts" },
                  ...chartOfAccounts.map((a) => ({
                    value: a.code,
                    label: `${a.code} – ${a.name}`,
                  })),
                ]}
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="max-w-sm"
              />
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Entry #</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(activeTab === "overview"
                  ? glLines.slice(0, 5)
                  : filteredGlLines
                ).map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>{line.date}</TableCell>
                    <TableCell>{line.entryNumber}</TableCell>
                    <TableCell>
                      <div className="font-medium">{line.accountCode}</div>
                      <div className="text-xs text-muted">{line.accountName}</div>
                    </TableCell>
                    <TableCell>{line.description}</TableCell>
                    <TableCell className="text-right">
                      {line.debit > 0 ? formatCurrency(line.debit) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {line.credit > 0 ? formatCurrency(line.credit) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(line.balance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {(activeTab === "overview" || activeTab === "trial-balance") && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Trial Balance</CardTitle>
                <CardDescription>
                  Account balances as of August 2026
                  {trialTotals.balanced && (
                    <Badge variant="success" className="ml-2">
                      Balanced
                    </Badge>
                  )}
                </CardDescription>
              </div>
              {activeTab === "trial-balance" && (
                <Button size="sm" variant="secondary" onClick={handleExportTrialBalance}>
                  <FileDown className="h-4 w-4" />
                  Export
                </Button>
              )}
            </div>
          </CardHeader>
          <div className="overflow-x-auto px-6 pb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trialBalance.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.accountCode}</TableCell>
                    <TableCell>{row.accountName}</TableCell>
                    <TableCell>{row.accountType}</TableCell>
                    <TableCell className="text-right">
                      {row.debit > 0 ? formatCurrency(row.debit) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.credit > 0 ? formatCurrency(row.credit) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-gray-50 font-semibold">
                  <TableCell colSpan={3}>Totals</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(trialTotals.debits)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(trialTotals.credits)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {(activeTab === "overview" || activeTab === "month-end-close") && (
        <Card>
          <CardHeader>
            <CardTitle>Month-End Close Checklist</CardTitle>
            <CardDescription>
              {tasks.filter((t) => t.status === "Complete").length} of{" "}
              {tasks.length} tasks complete ({closeProgress}%)
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-navy-900 transition-all"
                style={{ width: `${closeProgress}%` }}
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>{" "}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(activeTab === "overview" ? tasks.slice(0, 5) : tasks).map(
                  (task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.task}</TableCell>
                      <TableCell>{task.category}</TableCell>
                      <TableCell>{task.assignee}</TableCell>
                      <TableCell>{task.dueDate}</TableCell>
                      <TableCell>
                        <Badge variant={closeTaskVariant(task.status)}>
                          {task.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {task.status !== "Complete" &&
                          task.status !== "Blocked" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => completeTask(task)}
                            >
                              Complete
                            </Button>
                          )}
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Modal
        isOpen={showJeForm}
        onClose={() => setShowJeForm(false)}
        title="New Journal Entry"
        description="Debits must equal credits before posting"
        className="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Date"
              type="date"
              value={jeDate}
              onChange={(e) => setJeDate(e.target.value)}
            />
          </div>
          <Textarea
            label="Description"
            value={jeDescription}
            onChange={(e) => setJeDescription(e.target.value)}
            placeholder="Entry description..."
          />

          <div className="space-y-2">
            <p className="text-sm font-medium text-navy-900">Line Items</p>
            {jeLines.map((line) => (
              <div key={line.id} className="grid gap-2 sm:grid-cols-12">
                <div className="sm:col-span-3">
                  <Select
                    options={chartOfAccounts.map((a) => ({
                      value: a.code,
                      label: `${a.code} – ${a.name}`,
                    }))}
                    value={line.accountCode}
                    onChange={(e) =>
                      updateLine(line.id, "accountCode", e.target.value)
                    }
                  />
                </div>
                <div className="sm:col-span-3">
                  <Input
                    placeholder="Description"
                    value={line.description}
                    onChange={(e) =>
                      updateLine(line.id, "description", e.target.value)
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    type="number"
                    placeholder="Debit"
                    value={line.debit}
                    onChange={(e) =>
                      updateLine(line.id, "debit", e.target.value)
                    }
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    type="number"
                    placeholder="Credit"
                    value={line.credit}
                    onChange={(e) =>
                      updateLine(line.id, "credit", e.target.value)
                    }
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="flex items-end sm:col-span-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeLine(line.id)}
                    disabled={jeLines.length <= 2}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button size="sm" variant="secondary" onClick={addLine}>
              <Plus className="h-4 w-4" />
              Add Line
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
            <div>
              <span className="text-muted">Total Debits: </span>
              <span className="font-semibold">{formatCurrency(totalDebits)}</span>
              <span className="mx-3 text-muted">|</span>
              <span className="text-muted">Total Credits: </span>
              <span className="font-semibold">{formatCurrency(totalCredits)}</span>
            </div>
            {isBalanced ? (
              <Badge variant="success">Balanced</Badge>
            ) : (
              <Badge variant="danger">
                Out of balance ({formatCurrency(Math.abs(totalDebits - totalCredits))})
              </Badge>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowJeForm(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitJournalEntry}
              disabled={!isBalanced || !jeDescription.trim()}
            >
              Save as Draft
            </Button>
          </div>
        </div>
      </Modal>

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
