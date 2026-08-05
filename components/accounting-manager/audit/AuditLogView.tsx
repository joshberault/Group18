"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Flag,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  amAuditEvents,
  auditActionOptions,
  auditModuleOptions,
  auditReviewStatusOptions,
  auditRiskOptions,
  auditRoleOptions,
  auditUserOptions,
  getAuditKpis,
  type AuditEvent,
  type AuditReviewStatus,
} from "@/lib/mock-data/accounting-manager/audit";
import { exportToCsv } from "@/lib/accounting-manager/export-csv";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { KPICard } from "@/components/ui/KPICard";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Toast } from "@/components/ui/Toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

const PAGE_SIZE = 10;

function riskVariant(
  risk: string,
): "success" | "warning" | "danger" | "neutral" | "gold" | "default" {
  if (risk === "Low") return "success";
  if (risk === "Medium") return "warning";
  if (risk === "High") return "gold";
  return "danger";
}

function reviewVariant(
  status: AuditReviewStatus,
): "success" | "warning" | "danger" | "neutral" {
  if (status === "Reviewed") return "success";
  if (status === "Flagged") return "danger";
  return "warning";
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateInput(iso: string): string {
  return iso.slice(0, 10);
}

export function AuditLogView() {
  const [events, setEvents] = useState<AuditEvent[]>(() =>
    amAuditEvents.map((e) => ({ ...e, detail: { ...e.detail } })),
  );
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [flagNote, setFlagNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const kpis = useMemo(() => getAuditKpis(events), [events]);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();

    return events
      .filter((event) => {
        if (dateFrom && formatDateInput(event.timestamp) < dateFrom) return false;
        if (dateTo && formatDateInput(event.timestamp) > dateTo) return false;
        if (userFilter !== "all" && event.user !== userFilter) return false;
        if (roleFilter !== "all" && event.role !== roleFilter) return false;
        if (moduleFilter !== "all" && event.module !== moduleFilter) return false;
        if (actionFilter !== "all" && event.action !== actionFilter) return false;
        if (riskFilter !== "all" && event.riskLevel !== riskFilter) return false;
        if (reviewFilter !== "all" && event.reviewStatus !== reviewFilter) {
          return false;
        }

        if (!q) return true;

        return (
          event.user.toLowerCase().includes(q) ||
          event.recordId.toLowerCase().includes(q) ||
          event.description.toLowerCase().includes(q) ||
          event.ipOrSession.toLowerCase().includes(q) ||
          event.recordType.toLowerCase().includes(q) ||
          (event.detail.relatedRecord?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
  }, [
    events,
    search,
    dateFrom,
    dateTo,
    userFilter,
    roleFilter,
    moduleFilter,
    actionFilter,
    riskFilter,
    reviewFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const pageEvents = filteredEvents.slice(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE,
  );

  const updateEvent = (id: string, patch: Partial<AuditEvent>) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    );
    setSelectedEvent((prev) =>
      prev?.id === id ? { ...prev, ...patch } : prev,
    );
  };

  const handleMarkReviewed = () => {
    if (!selectedEvent) return;
    updateEvent(selectedEvent.id, {
      reviewStatus: "Reviewed",
      flagged: false,
      reviewNote: reviewNote.trim() || selectedEvent.reviewNote,
    });
    setToast("Event marked as reviewed.");
    setReviewNote("");
  };

  const handleFlag = () => {
    if (!selectedEvent) return;
    if (!flagNote.trim()) return;
    updateEvent(selectedEvent.id, {
      reviewStatus: "Flagged",
      flagged: true,
      reviewNote: flagNote.trim(),
    });
    setFlagModalOpen(false);
    setFlagNote("");
    setToast("Event flagged for follow-up.");
  };

  const handleExport = () => {
    const headers = [
      "Timestamp",
      "User",
      "Role",
      "Module",
      "Action",
      "Record Type",
      "Record ID",
      "Description",
      "Risk Level",
      "IP/Session",
      "Review Status",
    ];
    const rows = filteredEvents.map((e) => [
      formatTimestamp(e.timestamp),
      e.user,
      e.role,
      e.module,
      e.action,
      e.recordType,
      e.recordId,
      e.description,
      e.riskLevel,
      e.ipOrSession,
      e.reviewStatus,
    ]);
    exportToCsv(
      `audit-log-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows,
    );
    setToast(`Exported ${filteredEvents.length} audit events.`);
  };

  const openDetail = (event: AuditEvent) => {
    setSelectedEvent(event);
    setReviewNote(event.reviewNote ?? "");
  };

  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Review changes, approvals, deletions, financial actions, and access events across the application."
      >
        <Button variant="secondary" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <button type="button" className="text-left" onClick={() => { setDateFrom(""); setDateTo(""); setSearch(""); }}>
          <KPICard title="Events Today" value={String(kpis.eventsToday)} icon={ShieldCheck} className="cursor-pointer transition-shadow hover:shadow-md" />
        </button>
        <button type="button" className="text-left" onClick={() => setRiskFilter("High")}>
          <KPICard title="High-Risk Changes" value={String(kpis.highRiskChanges)} icon={ShieldAlert} className="cursor-pointer transition-shadow hover:shadow-md" />
        </button>
        <button type="button" className="text-left" onClick={() => setActionFilter("Approval")}>
          <KPICard title="Approval Actions" value={String(kpis.approvalActions)} icon={CheckCircle2} className="cursor-pointer transition-shadow hover:shadow-md" />
        </button>
        <button type="button" className="text-left" onClick={() => setActionFilter("Access")}>
          <KPICard title="Failed Access Attempts" value={String(kpis.failedAccessAttempts)} icon={XCircle} className="cursor-pointer transition-shadow hover:shadow-md" />
        </button>
        <button type="button" className="text-left" onClick={() => setActionFilter("Export")}>
          <KPICard title="Data Exports" value={String(kpis.dataExports)} icon={Download} className="cursor-pointer transition-shadow hover:shadow-md" />
        </button>
        <button type="button" className="text-left" onClick={() => setReviewFilter("Unreviewed")}>
          <KPICard title="Unreviewed Exceptions" value={String(kpis.unreviewedExceptions)} icon={AlertTriangle} className="cursor-pointer transition-shadow hover:shadow-md" />
        </button>
      </div>

      <Card className="mb-6" padding="md">
        <CardHeader>
          <CardTitle>Search & Filters</CardTitle>
          <CardDescription>
            {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}{" "}
            match current filters
          </CardDescription>
        </CardHeader>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Search"
            placeholder="User, record, description, reference…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
          <Input
            label="Date from"
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(0);
            }}
          />
          <Input
            label="Date to"
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(0);
            }}
          />
          <Select
            label="User"
            value={userFilter}
            onChange={(e) => {
              setUserFilter(e.target.value);
              setPage(0);
            }}
            options={[
              { value: "all", label: "All users" },
              ...auditUserOptions.map((u) => ({ value: u, label: u })),
            ]}
          />
          <Select
            label="Role"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(0);
            }}
            options={[
              { value: "all", label: "All roles" },
              ...auditRoleOptions.map((r) => ({ value: r, label: r })),
            ]}
          />
          <Select
            label="Module"
            value={moduleFilter}
            onChange={(e) => {
              setModuleFilter(e.target.value);
              setPage(0);
            }}
            options={[
              { value: "all", label: "All modules" },
              ...auditModuleOptions.map((m) => ({ value: m, label: m })),
            ]}
          />
          <Select
            label="Action type"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(0);
            }}
            options={[
              { value: "all", label: "All actions" },
              ...auditActionOptions.map((a) => ({ value: a, label: a })),
            ]}
          />
          <Select
            label="Risk level"
            value={riskFilter}
            onChange={(e) => {
              setRiskFilter(e.target.value);
              setPage(0);
            }}
            options={[
              { value: "all", label: "All risk levels" },
              ...auditRiskOptions.map((r) => ({ value: r, label: r })),
            ]}
          />
          <Select
            label="Review status"
            value={reviewFilter}
            onChange={(e) => {
              setReviewFilter(e.target.value);
              setPage(0);
            }}
            options={[
              { value: "all", label: "All statuses" },
              ...auditReviewStatusOptions.map((s) => ({ value: s, label: s })),
            ]}
          />
        </div>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Module</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Record Type</TableHead>
            <TableHead>Record ID</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Risk</TableHead>
            <TableHead>Session</TableHead>
            <TableHead>Review</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageEvents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={12} className="py-8 text-center text-muted">
                No audit events match the current filters.
              </TableCell>
            </TableRow>
          ) : (
            pageEvents.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="whitespace-nowrap text-xs">
                  {formatTimestamp(event.timestamp)}
                </TableCell>
                <TableCell>{event.user}</TableCell>
                <TableCell className="text-xs">{event.role}</TableCell>
                <TableCell className="text-xs">{event.module}</TableCell>
                <TableCell>{event.action}</TableCell>
                <TableCell className="text-xs">{event.recordType}</TableCell>
                <TableCell className="font-mono text-xs">
                  {event.recordId}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {event.description}
                </TableCell>
                <TableCell>
                  <Badge variant={riskVariant(event.riskLevel)}>
                    {event.riskLevel}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[120px] truncate text-xs text-muted">
                  {event.ipOrSession}
                </TableCell>
                <TableCell>
                  <Badge variant={reviewVariant(event.reviewStatus)}>
                    {event.reviewStatus}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDetail(event)}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {filteredEvents.length > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted">
            Showing {page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, filteredEvents.length)} of{" "}
            {filteredEvents.length}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Drawer
        isOpen={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.recordId ?? "Audit Event"}
        description={selectedEvent?.description}
      >
        {selectedEvent && (
          <div className="space-y-6">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Timestamp</dt>
                <dd className="font-medium text-navy-900">
                  {formatTimestamp(selectedEvent.timestamp)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">User</dt>
                <dd className="font-medium text-navy-900">
                  {selectedEvent.user} ({selectedEvent.role})
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Module</dt>
                <dd className="font-medium text-navy-900">
                  {selectedEvent.module}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Action</dt>
                <dd className="font-medium text-navy-900">
                  {selectedEvent.action}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Record</dt>
                <dd className="font-medium text-navy-900">
                  {selectedEvent.recordType} · {selectedEvent.recordId}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Risk level</dt>
                <dd>
                  <Badge variant={riskVariant(selectedEvent.riskLevel)}>
                    {selectedEvent.riskLevel}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Session reference</dt>
                <dd className="font-mono text-xs text-navy-900">
                  {selectedEvent.detail.sessionReference}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">IP / Session</dt>
                <dd className="text-xs text-navy-900">
                  {selectedEvent.ipOrSession}
                </dd>
              </div>
              {selectedEvent.detail.sourceModule && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Source module</dt>
                  <dd className="font-medium text-navy-900">
                    {selectedEvent.detail.sourceModule}
                  </dd>
                </div>
              )}
              {selectedEvent.detail.relatedRecord && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Related record</dt>
                  <dd className="font-medium text-navy-900">
                    {selectedEvent.detail.relatedRecord}
                  </dd>
                </div>
              )}
            </dl>

            {selectedEvent.detail.beforeValue && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  Before
                </p>
                <p className="text-sm text-navy-900">
                  {selectedEvent.detail.beforeValue}
                </p>
              </div>
            )}

            {selectedEvent.detail.afterValue && (
              <div className="rounded-lg border border-gray-200 bg-green-50 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  After
                </p>
                <p className="text-sm text-navy-900">
                  {selectedEvent.detail.afterValue}
                </p>
              </div>
            )}

            {selectedEvent.detail.reason && (
              <div>
                <p className="mb-1 text-sm font-medium text-muted">
                  Reason / Note
                </p>
                <p className="text-sm text-navy-900">
                  {selectedEvent.detail.reason}
                </p>
              </div>
            )}

            {selectedEvent.reviewNote && (
              <div>
                <p className="mb-1 text-sm font-medium text-muted">
                  Review note
                </p>
                <p className="text-sm text-navy-900">
                  {selectedEvent.reviewNote}
                </p>
              </div>
            )}

            <Textarea
              label="Add review note"
              placeholder="Optional note when marking reviewed…"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
            />

            <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
              <Button onClick={handleMarkReviewed}>
                <CheckCircle2 className="h-4 w-4" />
                Mark Reviewed
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setFlagNote(selectedEvent.reviewNote ?? "");
                  setFlagModalOpen(true);
                }}
              >
                <Flag className="h-4 w-4" />
                Flag for Follow-Up
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        isOpen={flagModalOpen}
        onClose={() => setFlagModalOpen(false)}
        title="Flag for Follow-Up"
        description="Add a note explaining why this event requires follow-up."
      >
        <div className="space-y-4">
          <Textarea
            label="Follow-up note"
            placeholder="Required — describe the concern or next step…"
            value={flagNote}
            onChange={(e) => setFlagNote(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFlagModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={!flagNote.trim()}
              onClick={handleFlag}
            >
              Flag Event
            </Button>
          </div>
        </div>
      </Modal>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
