"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { ConflictBadge } from "@/components/clients/ConflictBadge";
import type { FirmClient } from "@/lib/clients/types";
import { CLIENT_TYPE_LABELS, displayClientName } from "@/lib/clients/types";
import { formatDate } from "@/lib/clients/utils";
import type { ClientPermissions } from "@/lib/clients/permissions";

interface ClientTableProps {
  clients: FirmClient[];
  permissions: ClientPermissions;
}

export function ClientTable({ clients, permissions }: ClientTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Client #</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Assigned attorney</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Primary contact</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Conflict</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => (
          <TableRow key={client.id}>
            <TableCell className="font-medium">{client.client_number}</TableCell>
            <TableCell>{displayClientName(client)}</TableCell>
            <TableCell>{client.assigned_attorney_name || "—"}</TableCell>
            <TableCell>{CLIENT_TYPE_LABELS[client.client_type]}</TableCell>
            <TableCell>{client.primary_contact_name || "—"}</TableCell>
            <TableCell>{client.email || "—"}</TableCell>
            <TableCell>{client.phone || "—"}</TableCell>
            <TableCell>
              <StatusBadge status={client.status} />
            </TableCell>
            <TableCell>
              <ConflictBadge status={client.conflict_check_status} />
            </TableCell>
            <TableCell>{formatDate(client.created_at)}</TableCell>
            <TableCell className="text-right">
              <Link href={`/clients/${client.id}`}>
                <Button size="sm" variant="secondary">
                  View
                </Button>
              </Link>
              {permissions.canEditContact && (
                <Link href={`/clients/${client.id}?edit=1`} className="ml-2">
                  <Button size="sm" variant="ghost">
                    Edit
                  </Button>
                </Link>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
