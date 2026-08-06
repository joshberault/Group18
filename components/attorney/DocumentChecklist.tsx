"use client";

import { useState } from "react";
import { useAttorneyData } from "@/components/attorney/AttorneyDataProvider";
import { formatDate } from "@/lib/attorney/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export function DocumentChecklist({ matterId }: { matterId: string }) {
  const { checklistItems, toggleChecklistItem, addChecklistItem, deleteChecklistItem } =
    useAttorneyData();
  const items = checklistItems.filter((item) => item.matter_id === matterId);
  const completed = items.filter((item) => item.completed).length;
  const [label, setLabel] = useState("");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    addChecklistItem({
      matter_id: matterId,
      label,
      completed: false,
      due_date: null,
    });
    setLabel("");
  }

  return (
    <Card padding="md">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-navy-900">Document Checklist</h2>
          <p className="text-sm text-muted">
            {completed} of {items.length} items complete
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2">
            <label className="flex flex-1 items-center gap-3 text-sm text-navy-900">
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => toggleChecklistItem(item.id)}
              />
              <span className={item.completed ? "line-through text-muted" : undefined}>
                {item.label}
              </span>
            </label>
            <div className="flex items-center gap-2">
              {item.due_date && (
                <span className="text-xs text-muted">Due {formatDate(item.due_date)}</span>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600"
                onClick={() => deleteChecklistItem(item.id)}
              >
                Remove
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={handleAdd} className="mt-4 flex flex-wrap gap-2">
        <Input
          label="Add checklist item"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="min-w-[240px] flex-1"
          required
        />
        <Button type="submit" className="self-end">
          Add Item
        </Button>
      </form>
    </Card>
  );
}
