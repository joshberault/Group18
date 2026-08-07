"use client";

import { useState } from "react";
import { createClientSafe } from "@/lib/supabase/client";
import {
  getDemoSubmitterContext,
  notifyApprovalWorkflowChange,
  submitDemoExpense,
} from "@/lib/demo/time-workflow-store";
import { readPdfFileAsDataUrl } from "@/lib/demo/expense-receipts";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { checkMatterBillable } from "@/lib/matters/matter-activation-gates";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { UserRole } from "@/lib/types";
import type { Matter } from "@/types/database";

const APPROVAL_SUCCESS_MESSAGE =
  "Expense submitted for manager approval with receipt. Switch to Managing Partner or Firm Administrator on the dashboard to review.";

type Props = {
  matters: Matter[];
  submitterRole?: UserRole;
  onCreated: () => void;
};

export function ExpenseForm({
  matters,
  submitterRole = "attorney",
  onCreated,
}: Props) {
  const { selectedRole, attorneySpecialty } = useDemoRole();
  const effectiveRole = submitterRole ?? selectedRole;
  const [matterId, setMatterId] = useState(matters[0]?.id ?? "");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a valid expense amount.");
      return;
    }

    if (!description.trim()) {
      setError("Description is required.");
      return;
    }

    if (!receiptFile) {
      setError("Attach a PDF receipt or supporting documentation.");
      return;
    }

    const gate = await checkMatterBillable(matterId);
    if (!gate.allowed) {
      setError(gate.reason ?? "Expense entry is blocked for this matter.");
      return;
    }

    setLoading(true);

    const receipt = await readPdfFileAsDataUrl(receiptFile);
    if (!receipt.ok) {
      setLoading(false);
      setError(receipt.error);
      return;
    }

    const matterTitle =
      matters.find((matter) => matter.id === matterId)?.title ?? undefined;
    const submitter = getDemoSubmitterContext(
      effectiveRole,
      effectiveRole === "attorney" ? attorneySpecialty : null,
    );

    try {
      submitDemoExpense({
        profileId: submitter.profileId,
        submitterName: submitter.submitterName,
        submitterRole: effectiveRole,
        employeeId: submitter.employeeId,
        matterId,
        matterTitle,
        expenseDate,
        amount: parsedAmount,
        description: description.trim(),
        receipt: {
          fileName: receipt.fileName,
          mimeType: receipt.mimeType,
          dataUrl: receipt.dataUrl,
        },
      });
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Could not save expense.");
      return;
    }

    const supabase = createClientSafe();
    if (supabase) {
      const { error: insertError } = await supabase.from("expense_submissions").insert({
        matter_id: matterId,
        profile_id: submitter.profileId,
        expense_date: expenseDate,
        amount: parsedAmount,
        description: description.trim(),
        status: "pending",
      });
      if (insertError) {
        console.warn("Supabase expense insert skipped:", insertError.message);
      } else {
        notifyApprovalWorkflowChange();
      }
    }

    setLoading(false);
    setAmount("");
    setDescription("");
    setReceiptFile(null);
    setSuccess(APPROVAL_SUCCESS_MESSAGE);
    onCreated();
  }

  return (
    <Card padding="md">
      <CardTitle className="mb-4">Log Reimbursable Expense</CardTitle>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Matter"
            value={matterId}
            onChange={(e) => setMatterId(e.target.value)}
            options={matters.map((matter) => ({ value: matter.id, label: matter.title }))}
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
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="125.00"
            required
          />
          <Input
            label="Receipt / documentation (PDF)"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
            required
          />
          <div className="md:col-span-2">
            <Textarea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Court filing fee, travel, expert invoice..."
              required
            />
          </div>
        </div>
        {receiptFile ? (
          <p className="text-sm text-muted">Selected: {receiptFile.name}</p>
        ) : null}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-700">{success}</p>}
        <Button type="submit" disabled={loading || matters.length === 0}>
          {loading ? "Submitting..." : "Submit for Manager Approval"}
        </Button>
      </form>
    </Card>
  );
}
