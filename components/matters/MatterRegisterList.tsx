"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { CONFLICT_STATUS_LABELS } from "@/lib/clients/types";
import {
  fetchSharedFirmMatters,
  type SharedFirmMatter,
} from "@/lib/matters/firm-matters-supabase";

export function MatterRegisterList({
  title = "Your matters",
  description = "Select a matter to open the full detail screen.",
  assigneeFullName,
  showAllFirmMatters = false,
  strictAssigneeFilter,
}: {
  title?: string;
  description?: string;
  assigneeFullName?: string;
  showAllFirmMatters?: boolean;
  /** When true, only return matters assigned to the filter (no firm-wide fallback). */
  strictAssigneeFilter?: boolean;
}) {
  const { identity } = useDemoRole();
  const [matters, setMatters] = useState<SharedFirmMatter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const assignee = showAllFirmMatters
        ? undefined
        : (assigneeFullName ?? identity.fullName);
      const result = await fetchSharedFirmMatters({
        includeWip: false,
        assigneeFullName: assignee,
        strictAssigneeFilter:
          strictAssigneeFilter ?? Boolean(assignee),
      });
      if (cancelled) return;
      setMatters(result.matters);
      setError(result.error);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [assigneeFullName, identity.fullName, showAllFirmMatters, strictAssigneeFilter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Number</TableHead>
            <TableHead>Matter</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Practice</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted">
                Loading matters…
              </TableCell>
            </TableRow>
          ) : matters.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted">
                {error ?? "No matters found."}
              </TableCell>
            </TableRow>
          ) : (
            matters.map((matter) => (
              <TableRow key={matter.id} className="hover:bg-gray-50">
                <TableCell className="font-medium text-navy-900">
                  <Link
                    href={`/matters/${matter.id}`}
                    className="hover:underline"
                  >
                    {matter.matterNumber}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/matters/${matter.id}`}
                    className="font-medium text-navy-900 hover:underline"
                  >
                    {matter.title}
                  </Link>
                </TableCell>
                <TableCell>{matter.clientName}</TableCell>
                <TableCell>{matter.practiceArea}</TableCell>
                <TableCell>
                  <Badge variant="neutral">
                    {CONFLICT_STATUS_LABELS[matter.conflictStatus]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
