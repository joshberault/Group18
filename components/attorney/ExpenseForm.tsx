"use client";

import { useState } from "react";
import { createClientSafe } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { Matter } from "@/types/database";

type DemoExpensePayload = {
  matter_id: string;
  profile_id: string;
  expense_date: string;
  amount: number;
  description: string;
};

type Props = {
  matters: Matter[];
  profileId: string;
  onCreated: () => void;
  previewMode?: boolean;
  onDemoSubmit?: (payload: DemoExpensePayload) => void;
};

export function ExpenseForm({
  matters,
  profileId,
  onCreated,
  previewMode = false,
  onDemoSubmit,
}: Props) {
  const [matterId, setMatterId] = useState(matters[0]?.id ?? "");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (previewMode) {
      if (onDemoSubmit) {
        onDemoSubmit({
          matter_id: matterId,
          profile_id: profileId,
          expense_date: expenseDate,
          amount: Number(amount),
          description: description.trim(),
        });
        setAmount("");
        setDescription("");
        setError(null);
        onCreated();
        return;
      }
      setError("Demo mode — sign in later to save real entries.");
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClientSafe();
    if (!supabase) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("expense_submissions").insert({
      matter_id: matterId,
      profile_id: profileId,
      expense_date: expenseDate,
      amount: Number(amount),
      description,
      status: "pending",
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setAmount("");
    setDescription("");
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
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading || matters.length === 0}>
          {loading ? "Submitting..." : "Submit for Manager Approval"}
        </Button>
      </form>
    </Card>
  );
}
