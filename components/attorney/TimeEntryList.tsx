"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { TimeEntryEditModal } from "@/components/attorney/TimeEntryForm";
import { formatDate, statusBadgeClass } from "@/lib/attorney/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import type { TimeEntry } from "@/types/database";

export function TimeEntryList({
  entries,
  editable = true,
}: {
  entries: TimeEntry[];
  editable?: boolean;
}) {
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  if (entries.length === 0) {
    return (
      <EmptyState
        title="No time entries yet"
        description="Log your first entry using the timer or manual form above."
      />
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Matter</TableHead>
            <TableHead>Hours</TableHead>
            <TableHead>Billable</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{formatDate(entry.entry_date)}</TableCell>
              <TableCell>{entry.matter?.title ?? "—"}</TableCell>
              <TableCell>{entry.hours}</TableCell>
              <TableCell>{entry.is_billable ? "Yes" : "No"}</TableCell>
              <TableCell>{entry.description}</TableCell>
              <TableCell>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${statusBadgeClass(entry.status)}`}
                >
                  {entry.status}
                </span>
              </TableCell>
              <TableCell>
                {editable ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingEntry(entry)}
                    aria-label="Edit time entry"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                ) : (
                  <span className="text-xs text-muted">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editingEntry && (
        <TimeEntryEditModal
          entry={editingEntry}
          isOpen
          onClose={() => setEditingEntry(null)}
        />
      )}
    </>
  );
}
