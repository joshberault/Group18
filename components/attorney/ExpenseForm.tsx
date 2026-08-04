"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Matter } from "@/types/database";

type Props = {
  matters: Matter[];
  profileId: string;
  onCreated: () => void;
  previewMode?: boolean;
};

export function ExpenseForm({ matters, profileId, onCreated, previewMode = false }: Props) {
  const [matterId, setMatterId] = useState(matters[0]?.id ?? "");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (previewMode) {
      setError("Demo mode — sign in later to save real entries.");
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
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
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-brand-700">Log Reimbursable Expense</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Matter</span>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={matterId}
            onChange={(e) => setMatterId(e.target.value)}
            required
          >
            {matters.map((matter) => (
              <option key={matter.id} value={matter.id}>
                {matter.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Date</span>
          <input
            type="date"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Amount</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="125.00"
            required
          />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block text-slate-600">Description</span>
          <textarea
            className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Court filing fee, travel, expert invoice..."
            required
          />
        </label>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading || matters.length === 0}
        className="mt-4 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit for Manager Approval"}
      </button>
    </form>
  );
}
