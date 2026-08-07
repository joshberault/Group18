"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  UserMinus,
  UserPlus,
  XCircle,
} from "lucide-react";
import { convertIntakeToClientAndMatter } from "@/lib/intake/convert-intake";
import {
  defaultLeadAttorneyForIntake,
  PRACTICE_AREA_OPTIONS,
  resolvePracticeAreaFromIntake,
} from "@/lib/intake/practice-area-map";
import {
  ACTIVE_INTAKE_STATUSES,
  CONSULTATION_LEGAL_SERVICE_LABELS,
  CONSULTATION_REQUESTS_UPDATE_EVENT,
  formatConsultationDetails,
  getConsultationRequests,
  INTAKE_STATUS_LABELS,
  type ConsultationRequestRecord,
  type IntakeRequestStatus,
  updateIntakeRequest,
} from "@/lib/demo/consultation-requests-store";
import { SPECIALTY_ATTORNEY_PROFILES } from "@/lib/attorney/specialty-attorneys";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Textarea } from "@/components/ui/Textarea";
import { Toast } from "@/components/ui/Toast";

const STATUS_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "active", label: "Active queue" },
  { value: "all", label: "All requests" },
  ...ACTIVE_INTAKE_STATUSES.map((status) => ({
    value: status,
    label: INTAKE_STATUS_LABELS[status],
  })),
  { value: "declined", label: INTAKE_STATUS_LABELS.declined },
  { value: "no_hire", label: INTAKE_STATUS_LABELS.no_hire },
  { value: "converted", label: INTAKE_STATUS_LABELS.converted },
];

function formatServices(record: ConsultationRequestRecord): string {
  return record.legalServices
    .map((id) => CONSULTATION_LEGAL_SERVICE_LABELS[id])
    .join(", ");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface IntakeQueueViewProps {
  /** When embedded in a full-screen dashboard modal. */
  variant?: "standalone" | "embedded";
}

export function IntakeQueueView({ variant = "standalone" }: IntakeQueueViewProps) {
  const isEmbedded = variant === "embedded";
  const [toast, setToast] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"success" | "error">("success");
  const [records, setRecords] = useState<ConsultationRequestRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState("active");
  const [selected, setSelected] = useState<ConsultationRequestRecord | null>(null);
  const [closeModal, setCloseModal] = useState<"decline" | "no_hire" | null>(null);
  const [closeReason, setCloseReason] = useState("");
  const [convertOpen, setConvertOpen] = useState(false);
  const [matterTitle, setMatterTitle] = useState("");
  const [practiceAreaId, setPracticeAreaId] = useState("");
  const [attorneyId, setAttorneyId] = useState("");
  const [converting, setConverting] = useState(false);

  const notify = (message: string, variant: "success" | "error" = "success") => {
    setToast(message);
    setToastVariant(variant);
  };

  const refresh = useCallback(() => {
    setRecords(getConsultationRequests());
  }, []);

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener(CONSULTATION_REQUESTS_UPDATE_EVENT, onUpdate);
    return () =>
      window.removeEventListener(CONSULTATION_REQUESTS_UPDATE_EVENT, onUpdate);
  }, [refresh]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return records;
    if (statusFilter === "active") {
      return records.filter((item) => ACTIVE_INTAKE_STATUSES.includes(item.status));
    }
    return records.filter((item) => item.status === statusFilter);
  }, [records, statusFilter]);

  const kpis = useMemo(() => {
    const active = records.filter((item) =>
      ACTIVE_INTAKE_STATUSES.includes(item.status),
    );
    return {
      active: active.length,
      submitted: records.filter((item) => item.status === "submitted").length,
      scheduled: records.filter((item) => item.status === "consultation_scheduled")
        .length,
      converted: records.filter((item) => item.status === "converted").length,
    };
  }, [records]);

  const openConvert = (record: ConsultationRequestRecord) => {
    const practice = resolvePracticeAreaFromIntake(record.legalServices);
    const attorney = defaultLeadAttorneyForIntake(record.legalServices);
    setSelected(record);
    setMatterTitle(`${record.lastName.trim()} — ${practice.practiceAreaName} matter`);
    setPracticeAreaId(practice.practiceAreaId);
    setAttorneyId(attorney.id);
    setConvertOpen(true);
  };

  const handleStatus = (
    record: ConsultationRequestRecord,
    status: IntakeRequestStatus,
    extra?: Partial<ConsultationRequestRecord>,
  ) => {
    updateIntakeRequest(record.id, { status, ...extra });
    notify(`Request marked as ${INTAKE_STATUS_LABELS[status].toLowerCase()}.`);
    refresh();
  };

  const handleConvert = async () => {
    if (!selected) return;
    setConverting(true);
    const attorney =
      SPECIALTY_ATTORNEY_PROFILES.find((item) => item.id === attorneyId) ??
      defaultLeadAttorneyForIntake(selected.legalServices);

    const result = await convertIntakeToClientAndMatter({
      record: selected,
      matterTitle,
      practiceAreaId,
      leadAttorney: attorney,
    });

    setConverting(false);

    if (result.error || !result.clientId || !result.matterId) {
      notify(result.error ?? "Conversion failed.", "error");
      return;
    }

    updateIntakeRequest(selected.id, {
      status: "converted",
      convertedClientId: result.clientId,
      convertedMatterId: result.matterId,
      statusNote: `Converted to client and matter.`,
    });
    notify("Intake converted — client and draft matter created.");
    setConvertOpen(false);
    setSelected(null);
    refresh();
  };

  const confirmClose = () => {
    if (!selected || !closeModal) return;
    const status = closeModal === "decline" ? "declined" : "no_hire";
    handleStatus(selected, status, {
      declineReason: closeReason.trim() || null,
      statusNote: closeReason.trim() || null,
    });
    setCloseModal(null);
    setCloseReason("");
    setSelected(null);
  };

  return (
    <div className="space-y-6">
      {!isEmbedded ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Active queue
          </p>
          <p className="mt-1 text-2xl font-semibold text-navy-900">{kpis.active}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            New submissions
          </p>
          <p className="mt-1 text-2xl font-semibold text-navy-900">{kpis.submitted}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Consultations scheduled
          </p>
          <p className="mt-1 text-2xl font-semibold text-navy-900">{kpis.scheduled}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Converted
          </p>
          <p className="mt-1 text-2xl font-semibold text-navy-900">{kpis.converted}</p>
        </Card>
      </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="w-full max-w-xs">
          <Select
            label="Filter by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            options={STATUS_FILTER_OPTIONS}
          />
        </div>
        <p className="text-sm text-muted">
          Prospective clients submit requests from the consultation form on the
          dashboard.
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No intake requests"
          description="Switch the status filter or submit a test request as Prospective Client."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prospect</TableHead>
              <TableHead>Services</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Route</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((record) => (
              <TableRow key={record.id}>
                <TableCell>
                  <div className="font-medium text-navy-900">
                    {record.firstName} {record.lastName}
                  </div>
                  <div className="text-xs text-muted">{record.email}</div>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {formatServices(record)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted">
                  {formatDate(record.createdAt)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={record.status} />
                </TableCell>
                <TableCell>
                  <Badge variant="neutral">{record.assigneeName}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap justify-end gap-2">
                    {record.status === "submitted" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          handleStatus(record, "screened", {
                            statusNote: "Initial intake screening complete.",
                          })
                        }
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Screen
                      </Button>
                    )}
                    {ACTIVE_INTAKE_STATUSES.includes(record.status) &&
                      record.status !== "consultation_scheduled" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            handleStatus(record, "consultation_scheduled", {
                              statusNote: "Consultation scheduled with prospect.",
                            })
                          }
                        >
                          <CalendarCheck className="h-3.5 w-3.5" />
                          Schedule
                        </Button>
                      )}
                    {ACTIVE_INTAKE_STATUSES.includes(record.status) && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => openConvert(record)}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Convert
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setSelected(record);
                            setCloseModal("no_hire");
                          }}
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                          No hire
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            setSelected(record);
                            setCloseModal("decline");
                          }}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Decline
                        </Button>
                      </>
                    )}
                    {record.status === "converted" && record.convertedMatterId && (
                      <Link href={`/matters/${record.convertedMatterId}`}>
                        <Button size="sm" variant="secondary">
                          Matter
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    )}
                    {record.status === "converted" && record.convertedClientId && (
                      <Link href={`/clients/${record.convertedClientId}`}>
                        <Button size="sm" variant="secondary">
                          Client
                        </Button>
                      </Link>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelected(record)}
                    >
                      Details
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Modal
        isOpen={Boolean(selected && !closeModal && !convertOpen)}
        onClose={() => setSelected(null)}
        title={
          selected
            ? `${selected.firstName} ${selected.lastName}`
            : "Intake details"
        }
        description="Consultation request details"
        className="max-w-2xl"
      >
        {selected && (
          <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm text-navy-900">
            {formatConsultationDetails(selected)}
          </pre>
        )}
      </Modal>

      <Modal
        isOpen={closeModal !== null}
        onClose={() => {
          setCloseModal(null);
          setCloseReason("");
        }}
        title={closeModal === "decline" ? "Decline representation" : "Mark no hire"}
        description="Record why this prospective client will not become a matter."
      >
        <div className="space-y-4">
          <Textarea
            label="Reason (optional)"
            value={closeReason}
            onChange={(event) => setCloseReason(event.target.value)}
            rows={4}
            placeholder={
              closeModal === "decline"
                ? "Conflict, outside practice area, capacity, etc."
                : "Client chose another firm, decided not to proceed, etc."
            }
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setCloseModal(null);
                setCloseReason("");
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmClose}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={convertOpen}
        onClose={() => setConvertOpen(false)}
        title="Convert to client & matter"
        description="Creates a Supabase client record, draft matter, and lead attorney assignment."
        className="max-w-lg"
      >
        <div className="space-y-4">
          <Input
            label="Matter title"
            value={matterTitle}
            onChange={(event) => setMatterTitle(event.target.value)}
          />
          <Select
            label="Practice area"
            value={practiceAreaId}
            onChange={(event) => setPracticeAreaId(event.target.value)}
            options={PRACTICE_AREA_OPTIONS.map((area) => ({
              value: area.id,
              label: area.name,
            }))}
          />
          <Select
            label="Lead attorney"
            value={attorneyId}
            onChange={(event) => setAttorneyId(event.target.value)}
            options={SPECIALTY_ATTORNEY_PROFILES.map((attorney) => ({
              value: attorney.id,
              label: `${attorney.fullName} — ${attorney.practiceAreaName}`,
            }))}
          />
          <p className="text-sm text-muted">
            The matter starts as draft with engagement not started and partner
            review required. Conflict check must be cleared before billable work.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConvertOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConvert} disabled={converting || !matterTitle.trim()}>
              {converting ? "Converting…" : "Create client & matter"}
            </Button>
          </div>
        </div>
      </Modal>

      <Toast
        message={toast}
        variant={toastVariant}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
