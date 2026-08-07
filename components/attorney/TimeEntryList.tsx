"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { TimeEntryEditModal } from "@/components/attorney/TimeEntryForm";
import { deleteDemoTimeEntry } from "@/lib/demo/time-workflow-store";
import { deletePendingTimeEntryInSupabase } from "@/lib/time/time-entry-supabase";
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
  onDeleted,
}: {
  entries: TimeEntry[];
  editable?: boolean;
  onDeleted?: () => void;
}) {
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(entry: TimeEntry) {
    if (entry.status !== "pending") {
      setDeleteError("Only pending entries can be deleted.");
      return;
    }
    if (!window.confirm("Delete this time entry? This cannot be undone.")) {
      return;
    }

    setDeletingId(entry.id);
    setDeleteError(null);

    const supabaseId =
      entry.id.startsWith("time-demo-") ? null : entry.id;
    if (supabaseId) {
      const result = await deletePendingTimeEntryInSupabase(supabaseId);
      if (!result.ok) {
        setDeleteError(result.error ?? "Could not delete time entry.");
        setDeletingId(null);
        return;
      }
    }

    deleteDemoTimeEntry(entry.id);
    onDeleted?.();
    setDeletingId(null);
  }

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
      {deleteError && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {deleteError}
        </p>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Requested by</TableHead>
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
              <TableCell>{entry.requested_by_name ?? "—"}</TableCell>
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
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingEntry(entry)}
                      aria-label="Edit time entry"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {entry.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDelete(entry)}
                        disabled={deletingId === entry.id}
                        aria-label="Delete time entry"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </div>
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
