"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Toast } from "@/components/ui/Toast";
import { useParalegalWorkflow } from "@/hooks/useParalegalWorkflow";
import { PARALEGAL_ASSIGNED_MATTERS } from "@/lib/paralegal/demo-data";
import { filterExpensesByQuery } from "@/lib/paralegal/filters";
import { addParalegalExpense } from "@/lib/paralegal/workflow-store";
import {
  getDemoSubmitterContext,
  submitDemoExpense,
} from "@/lib/demo/time-workflow-store";
import { readPdfFileAsDataUrl } from "@/lib/demo/expense-receipts";
import { formatCurrency } from "@/lib/utils/cn";

export function ParalegalExpensesView() {
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter");
  const action = searchParams.get("action");
  const { expenses, refresh } = useParalegalWorkflow();
  const [toast, setToast] = useState<string | null>(null);
  const [matterId, setMatterId] = useState(
    PARALEGAL_ASSIGNED_MATTERS[0]?.id ?? "",
  );
  const [expenseDate, setExpenseDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const visible = useMemo(
    () => filterExpensesByQuery(expenses, filter),
    [expenses, filter],
  );

  useEffect(() => {
    if (action === "add") {
      document.getElementById("paralegal-expense-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [action]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const matter = PARALEGAL_ASSIGNED_MATTERS.find((m) => m.id === matterId);
    if (!matter) return;
    if (matter.conflictStatus === "possible_conflict" || matter.status === "on_hold") {
      setToast(
        "Expense blocked — matter is on hold or has an unresolved conflict. Escalate via Attorney Hub.",
      );
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setToast("Enter a valid expense amount.");
      return;
    }
    if (!description.trim() || description.trim().length < 8) {
      setToast("Enter a meaningful expense description.");
      return;
    }
    if (!receiptFile) {
      setToast("Attach a PDF receipt or supporting documentation.");
      return;
    }

    setSubmitting(true);
    const receipt = await readPdfFileAsDataUrl(receiptFile);
    if (!receipt.ok) {
      setSubmitting(false);
      setToast(receipt.error);
      return;
    }

    addParalegalExpense({
      matterId: matter.id,
      matterTitle: matter.title,
      clientName: matter.clientName,
      expenseDate,
      amount: value,
      description: description.trim(),
      status: "submitted",
      receiptMissing: false,
    });

    try {
      const submitter = getDemoSubmitterContext("paralegal");
      submitDemoExpense({
        profileId: submitter.profileId,
        submitterName: submitter.submitterName,
        submitterRole: "paralegal",
        employeeId: submitter.employeeId,
        matterId: matter.id,
        matterTitle: matter.title,
        expenseDate,
        amount: value,
        description: description.trim(),
        receipt: {
          fileName: receipt.fileName,
          mimeType: receipt.mimeType,
          dataUrl: receipt.dataUrl,
        },
      });
    } catch (err) {
      setSubmitting(false);
      setToast(err instanceof Error ? err.message : "Could not save expense.");
      return;
    }

    refresh();
    setAmount("");
    setDescription("");
    setReceiptFile(null);
    setSubmitting(false);
    setToast(
      "Expense submitted with receipt for manager approval. Switch to Managing Partner or Firm Administrator to review.",
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reimbursable Expenses"
        description="Record reimbursable expenses with PDF documentation on assigned matters. You cannot approve your own expenses."
      />

      {filter && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="gold">Filter: {filter}</Badge>
          <Link href="/attorney/expenses">
            <Button size="sm" variant="ghost">
              Clear filter
            </Button>
          </Link>
        </div>
      )}

      <Card padding="md" className="scroll-mt-24">
        <div id="paralegal-expense-form">
          <CardTitle className="mb-4">Log reimbursable expense</CardTitle>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Assigned matter"
                value={matterId}
                onChange={(e) => setMatterId(e.target.value)}
                options={PARALEGAL_ASSIGNED_MATTERS.map((m) => ({
                  value: m.id,
                  label: `${m.title} (${m.clientName})`,
                }))}
                required
              />
              <Input
                label="Date"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
              />
              <Input
                label="Amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <Input
                label="Receipt / documentation (PDF)"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                required
              />
            </div>
            <Textarea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
            />
            {receiptFile ? (
              <p className="text-sm text-muted">Selected: {receiptFile.name}</p>
            ) : null}
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit for Manager Approval"}
            </Button>
          </form>
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-navy-900">Your expenses</h2>
        {visible.map((expense) => (
          <Card key={expense.id} padding="md">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-navy-900">
                  {formatCurrency(expense.amount)} · {expense.description}
                </p>
                <p className="text-sm text-muted">
                  {expense.clientName} · {expense.matterTitle} ·{" "}
                  {expense.expenseDate}
                </p>
                <p className="mt-2 text-sm text-muted">
                  {expense.receiptMissing
                    ? "Receipt missing"
                    : "Receipt documentation on file"}
                </p>
              </div>
              <Badge
                variant={
                  expense.status === "draft"
                    ? "warning"
                    : expense.status === "rejected"
                      ? "danger"
                      : "neutral"
                }
              >
                {expense.status}
              </Badge>
            </div>
          </Card>
        ))}
      </section>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
