"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  CLIENT_AUDIT_FIELD_LABELS,
  type ClientAuditEvent,
} from "@/lib/clients/audit-log";
import { formatDate } from "@/lib/clients/utils";

interface ClientAuditHistoryProps {
  events: ClientAuditEvent[];
  loading?: boolean;
  error?: string | null;
}

export function ClientAuditHistory({
  events,
  loading,
  error,
}: ClientAuditHistoryProps) {
  if (loading) {
    return <LoadingState message="Loading audit history..." />;
  }

  if (error) {
    return (
      <EmptyState
        title="Audit history unavailable"
        description={error}
        moduleLabel="Clients · Audit"
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit history</CardTitle>
        <CardDescription>
          Contact and conflict-check field changes are recorded when saved.
        </CardDescription>
      </CardHeader>
      {events.length === 0 ? (
        <p className="px-6 pb-6 text-sm text-muted">
          No audited field changes yet for this client.
        </p>
      ) : (
        <div className="overflow-x-auto px-6 pb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Field</TableHead>
                <TableHead>Old value</TableHead>
                <TableHead>New value</TableHead>
                <TableHead>Changed by</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(event.changed_at)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {CLIENT_AUDIT_FIELD_LABELS[event.field_name] ??
                      event.field_name}
                  </TableCell>
                  <TableCell className="max-w-[10rem] truncate">
                    {event.old_value || "—"}
                  </TableCell>
                  <TableCell className="max-w-[10rem] truncate">
                    {event.new_value || "—"}
                  </TableCell>
                  <TableCell>{event.changed_by}</TableCell>
                  <TableCell className="max-w-[12rem] truncate">
                    {event.reason || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
