"use client";

import { useState } from "react";
import { useAttorneyData } from "@/components/attorney/AttorneyDataProvider";
import { todayIsoDate } from "@/lib/attorney/dates";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { TimeEntry } from "@/types/database";

type Props = {
  onCreated?: () => void;
};

export function TimeEntryForm({ onCreated }: Props) {
  const { matters, profileId, addTimeEntry } = useAttorneyData();
  const [matterId, setMatterId] = useState(matters[0]?.id ?? "");
  const [entryDate, setEntryDate] = useState(todayIsoDate());
  const [hours, setHours] = useState("1.0");
  const [description, setDescription] = useState("");
  const [isBillable, setIsBillable] = useState(true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    addTimeEntry({
      matter_id: matterId,
      profile_id: profileId,
      entry_date: entryDate,
      hours: Number(hours),
      description,
      is_billable: isBillable,
    });

    setDescription("");
    setHours("1.0");
    onCreated?.();
  }

  return (
    <Card padding="md">
      <CardTitle className="mb-4">Manual Time Entry</CardTitle>
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
            <input
              type="checkbox"
              checked={isBillable}
              onChange={(e) => setIsBillable(e.target.checked)}
            />
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
        <Button type="submit" disabled={matters.length === 0}>
          Submit for Manager Approval
        </Button>
      </form>
    </Card>
  );
}

type EditProps = {
  entry: TimeEntry;
  isOpen: boolean;
  onClose: () => void;
};

export function TimeEntryEditModal({ entry, isOpen, onClose }: EditProps) {
  const { matters, updateTimeEntry, deleteTimeEntry } = useAttorneyData();
  const [matterId, setMatterId] = useState(entry.matter_id);
  const [entryDate, setEntryDate] = useState(entry.entry_date);
  const [hours, setHours] = useState(String(entry.hours));
  const [description, setDescription] = useState(entry.description);
  const [isBillable, setIsBillable] = useState(entry.is_billable);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    updateTimeEntry(entry.id, {
      matter_id: matterId,
      entry_date: entryDate,
      hours: Number(hours),
      description,
      is_billable: isBillable,
    });
    onClose();
  }

  function handleDelete() {
    deleteTimeEntry(entry.id);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-navy-900">Edit Time Entry</h2>
        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <Select
            label="Matter"
            value={matterId}
            onChange={(e) => setMatterId(e.target.value)}
            options={matters.map((matter) => ({ value: matter.id, label: matter.title }))}
          />
          <Input
            label="Date"
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
          />
          <Input
            label="Hours"
            type="number"
            min="0.1"
            max="24"
            step="0.1"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-navy-900">
            <input
              type="checkbox"
              checked={isBillable}
              onChange={(e) => setIsBillable(e.target.checked)}
            />
            Billable hours
          </label>
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit">Save Changes</Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" variant="ghost" onClick={handleDelete} className="text-red-600">
              Delete
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
