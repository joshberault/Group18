"use client";

import { useState } from "react";
import { createClientSafe } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { Matter } from "@/types/database";

type Props = {
  matters: Matter[];
  profileId: string;
  onCreated: () => void;
  previewMode?: boolean;
};

export function TimeEntryForm({ matters, profileId, onCreated, previewMode = false }: Props) {
  const [matterId, setMatterId] = useState(matters[0]?.id ?? "");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState("1.0");
  const [description, setDescription] = useState("");
  const [isBillable, setIsBillable] = useState(true);
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

    const supabase = createClientSafe();
    if (!supabase) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("time_entries").insert({
      matter_id: matterId,
      profile_id: profileId,
      entry_date: entryDate,
      hours: Number(hours),
      description,
      is_billable: isBillable,
      status: "pending",
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setDescription("");
    setHours("1.0");
    onCreated();
  }

  return (
    <Card padding="md">
      <CardTitle className="mb-4">Log Time Entry</CardTitle>
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
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            required
          />
          <Input
            label="Hours"
            type="number"
            min="0.1"
            max="24"
            step="0.1"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            required
          />
          <label className="flex items-center gap-2 self-end text-sm text-navy-900">
            <input type="checkbox" checked={isBillable} onChange={(e) => setIsBillable(e.target.checked)} />
            Billable hours
          </label>
          <div className="md:col-span-2">
            <Textarea
              label="Description of work"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Drafted motion, client call, research..."
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
