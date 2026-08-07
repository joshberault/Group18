"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Plus, User } from "lucide-react";
import { MatterGovernancePanel } from "@/components/matters/MatterGovernancePanel";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
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
import { CONFLICT_STATUS_LABELS } from "@/lib/clients/types";
import { fetchClientById } from "@/lib/clients/queries";
import type { FirmClient } from "@/lib/clients/types";
import {
  LIFECYCLE_LABELS,
  type FirmPortfolioMatter,
} from "@/lib/matters/firm-portfolio";
import {
  fetchSharedFirmMatterById,
  fetchSharedFirmMatters,
  reassignLeadAttorney,
  toFirmPortfolioMatter,
} from "@/lib/matters/firm-matters-supabase";
import {
  createMatterDetailTask,
  ensureMatterDetailTasks,
  getMatterDetailTasks,
  MATTER_DETAIL_TASKS_UPDATE_EVENT,
  reassignMatterDetailTask,
  type MatterDetailTask,
} from "@/lib/matters/matter-detail-tasks-store";
import {
  assignResponsibleAttorney,
  FIRM_PORTFOLIO_UPDATE_EVENT,
  getLiveFirmPortfolioMatters,
  setFirmPortfolioBase,
} from "@/lib/matters/firm-portfolio-store";
import {
  defaultMatterStaffAssignee,
  getMatterLeadAttorneySelectOptions,
  getMatterStaffAssigneeSelectOptions,
} from "@/lib/matters/matter-staff-assignees";
import {
  addMatterCaseNote,
  ensureMatterCaseNotes,
  getMatterCaseNotes,
  MATTER_DETAIL_NOTES_UPDATE_EVENT,
  type MatterCaseNote,
} from "@/lib/matters/matter-detail-notes-store";
import {
  ensureMatterDocuments,
  getMatterDocuments,
  MATTER_WORKSPACE_UPDATE_EVENT,
  type MatterDocument,
} from "@/lib/matters/workspace-store";
import { cn } from "@/lib/utils/cn";

function TaskProgressRing({
  percent,
  size = 40,
}: {
  percent: number;
  size?: number;
}) {
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      title={`${percent}% complete`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(
            percent >= 100
              ? "text-emerald-600"
              : percent >= 50
                ? "text-navy-600"
                : "text-amber-600",
          )}
        />
      </svg>
      <span className="absolute text-[10px] font-semibold text-navy-900">
        {percent}%
      </span>
    </div>
  );
}

function formatNoteDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

const DOCUMENT_GROUPS = [
  "Engagement letter",
  "Evidence",
  "Diligence",
  "Contract",
  "Pleading",
  "Discovery",
  "Correspondence",
  "Due diligence",
] as const;

export function SharedMatterDetailScreen({ matterId }: { matterId: string }) {
  const { selectedRole, identity } = useDemoRole();
  const isManagingPartner = selectedRole === "managing_partner";
  const isRestrictedToAssignments =
    selectedRole === "attorney" || selectedRole === "paralegal";

  const staffAssigneeOptions = useMemo(
    () => getMatterStaffAssigneeSelectOptions(),
    [],
  );
  const leadAttorneyOptions = useMemo(
    () => getMatterLeadAttorneySelectOptions(),
    [],
  );
  const defaultStaffAssignee = useMemo(() => defaultMatterStaffAssignee(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portfolioMatter, setPortfolioMatter] =
    useState<FirmPortfolioMatter | null>(null);
  const [allMatters, setAllMatters] = useState<FirmPortfolioMatter[]>([]);
  const [client, setClient] = useState<FirmClient | null>(null);
  const [tasks, setTasks] = useState<MatterDetailTask[]>([]);
  const [notes, setNotes] = useState<MatterCaseNote[]>([]);
  const [documents, setDocuments] = useState<MatterDocument[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [newTask, setNewTask] = useState<{
    title: string;
    description: string;
    assignedTo: string;
    percentComplete: string;
    dueDate: string;
  }>({
    title: "",
    description: "",
    assignedTo: defaultStaffAssignee,
    percentComplete: "0",
    dueDate: "",
  });
  const [newNote, setNewNote] = useState("");

  const refreshPortfolio = useCallback(() => {
    setAllMatters(getLiveFirmPortfolioMatters());
    const live = getLiveFirmPortfolioMatters().find((m) => m.id === matterId);
    if (live) setPortfolioMatter(live);
  }, [matterId]);

  const refreshLocalData = useCallback(() => {
    if (!portfolioMatter) return;
    setTasks(getMatterDetailTasks(portfolioMatter.id));
    setNotes(getMatterCaseNotes(portfolioMatter.id));
    setDocuments(
      getMatterDocuments().filter((doc) => doc.matterId === portfolioMatter.id),
    );
  }, [portfolioMatter]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const assigneeOptions = isRestrictedToAssignments
        ? {
            assigneeFullName: identity.fullName,
            strictAssigneeFilter: true as const,
          }
        : {};

      const [matterResult, allResult] = await Promise.all([
        fetchSharedFirmMatterById(matterId, {
          includeWip: true,
          ...assigneeOptions,
        }),
        isRestrictedToAssignments
          ? Promise.resolve({ matters: [], error: null as string | null })
          : fetchSharedFirmMatters({ includeWip: true }),
      ]);
      if (cancelled) return;

      if (!matterResult.matter) {
        setError(matterResult.error ?? "Matter not found.");
        setLoading(false);
        return;
      }

      const mappedAll = allResult.matters.map(toFirmPortfolioMatter);
      setFirmPortfolioBase(mappedAll);
      const portfolio = toFirmPortfolioMatter(matterResult.matter);
      setPortfolioMatter(
        getLiveFirmPortfolioMatters().find((m) => m.id === portfolio.id) ??
          portfolio,
      );
      setAllMatters(getLiveFirmPortfolioMatters());
      setError(allResult.error);

      ensureMatterDetailTasks(
        matterResult.matter.id,
        matterResult.matter.attorneyName,
      );
      ensureMatterCaseNotes(
        matterResult.matter.id,
        matterResult.matter.attorneyName,
      );
      ensureMatterDocuments(matterResult.matter.id, {
        clientName: matterResult.matter.clientName,
        practiceArea: matterResult.matter.practiceArea,
      });

      if (matterResult.matter.clientId) {
        const clientResult = await fetchClientById(matterResult.matter.clientId);
        if (!cancelled) setClient(clientResult.data);
      }

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [identity.fullName, isRestrictedToAssignments, matterId]);

  useEffect(() => {
    refreshLocalData();
  }, [refreshLocalData, portfolioMatter?.id]);

  useEffect(() => {
    const onUpdate = () => {
      refreshPortfolio();
      refreshLocalData();
    };
    window.addEventListener(FIRM_PORTFOLIO_UPDATE_EVENT, onUpdate);
    window.addEventListener(MATTER_DETAIL_TASKS_UPDATE_EVENT, onUpdate);
    window.addEventListener(MATTER_DETAIL_NOTES_UPDATE_EVENT, onUpdate);
    window.addEventListener(MATTER_WORKSPACE_UPDATE_EVENT, onUpdate);
    return () => {
      window.removeEventListener(FIRM_PORTFOLIO_UPDATE_EVENT, onUpdate);
      window.removeEventListener(MATTER_DETAIL_TASKS_UPDATE_EVENT, onUpdate);
      window.removeEventListener(MATTER_DETAIL_NOTES_UPDATE_EVENT, onUpdate);
      window.removeEventListener(MATTER_WORKSPACE_UPDATE_EVENT, onUpdate);
    };
  }, [refreshLocalData, refreshPortfolio]);

  const attorneys = useMemo(() => {
    const names = new Set<string>(
      leadAttorneyOptions.map((option) => option.value),
    );
    for (const m of allMatters) {
      if (m.responsibleAttorney) names.add(m.responsibleAttorney);
      if (m.originatingAttorney) names.add(m.originatingAttorney);
    }
    return Array.from(names).sort();
  }, [allMatters, leadAttorneyOptions]);

  const documentsByType = useMemo(() => {
    const groups = new Map<string, MatterDocument[]>();
    for (const doc of documents) {
      const key = doc.documentType || "Other";
      const list = groups.get(key) ?? [];
      list.push(doc);
      groups.set(key, list);
    }
    return groups;
  }, [documents]);

  const handleCreateTask = () => {
    if (!portfolioMatter || !newTask.title.trim()) return;
    createMatterDetailTask({
      matterId: portfolioMatter.id,
      title: newTask.title.trim(),
      description: newTask.description.trim() || undefined,
      assignedTo: newTask.assignedTo,
      percentComplete: Number(newTask.percentComplete) || 0,
      dueDate: newTask.dueDate || undefined,
    });
    setTaskModalOpen(false);
    setNewTask({
      title: "",
      description: "",
      assignedTo: defaultStaffAssignee,
      percentComplete: "0",
      dueDate: "",
    });
    setToast("Task created and assigned.");
  };

  const handleAddNote = () => {
    if (!portfolioMatter || !newNote.trim()) return;
    addMatterCaseNote({
      matterId: portfolioMatter.id,
      author: identity.fullName,
      body: newNote.trim(),
    });
    setNewNote("");
    setToast("Case note added.");
  };

  const handleReassignMatter = async (attorneyFullName: string) => {
    if (!portfolioMatter) return;
    const trimmed = attorneyFullName.trim();
    if (!trimmed || trimmed === portfolioMatter.responsibleAttorney) return;

    assignResponsibleAttorney(portfolioMatter.id, trimmed);
    const result = await reassignLeadAttorney(portfolioMatter.id, trimmed);
    refreshPortfolio();
    setToast(
      result.ok
        ? `Matter reassigned to ${trimmed}.`
        : (result.error ?? "Could not reassign matter."),
    );
  };

  if (loading) {
    return <LoadingState message="Loading matter details…" />;
  }

  if (!portfolioMatter) {
    return (
      <EmptyState
        title="Matter not found"
        description={
          error ??
          "This matter is not in the firm register or you do not have access."
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={portfolioMatter.title}
        description={`${portfolioMatter.matterNumber} · ${portfolioMatter.clientName} · ${portfolioMatter.practiceArea}`}
      >
        <Link href="/matters">
          <Button variant="secondary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to matters
          </Button>
        </Link>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="default">{LIFECYCLE_LABELS[portfolioMatter.status]}</Badge>
          <Badge variant="neutral">
            Conflict: {CONFLICT_STATUS_LABELS[portfolioMatter.conflictStatus]}
          </Badge>
          {portfolioMatter.responsibleAttorney && (
            <Badge variant="neutral">
              Lead: {portfolioMatter.responsibleAttorney}
            </Badge>
          )}
        </div>
        {isManagingPartner && (
          <div className="w-48">
            <Select
              value={portfolioMatter.responsibleAttorney ?? ""}
              onChange={(e) => void handleReassignMatter(e.target.value)}
              options={leadAttorneyOptions}
            />
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Tasks to complete</CardTitle>
            <CardDescription>
              Open work items with progress and assignee
            </CardDescription>
          </div>
          {isManagingPartner && (
            <Button size="sm" onClick={() => setTaskModalOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add task
            </Button>
          )}
        </CardHeader>
        <div className="px-6 pb-6">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted">No tasks yet for this matter.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Done</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Assigned to</TableHead>
                  <TableHead>Due</TableHead>
                  {isManagingPartner && (
                    <TableHead className="w-48">Reassign</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <TaskProgressRing percent={task.percentComplete} />
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-navy-900">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-muted">{task.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <User className="h-3.5 w-3.5 text-muted" />
                        {task.assignedTo}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted">
                      {task.dueDate ?? "—"}
                    </TableCell>
                    {isManagingPartner && (
                      <TableCell>
                        <Select
                          value={task.assignedTo}
                          onChange={(e) => {
                            reassignMatterDetailTask(task.id, e.target.value);
                            setToast(`Task reassigned to ${e.target.value}.`);
                          }}
                          options={staffAssigneeOptions}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Shared documents
            </CardTitle>
            <CardDescription>
              Engagement letters, evidence, diligence, contracts, and related files
            </CardDescription>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            {documents.length === 0 ? (
              <p className="text-sm text-muted">No documents uploaded yet.</p>
            ) : (
              DOCUMENT_GROUPS.map((group) => {
                const items = documentsByType.get(group);
                if (!items?.length) return null;
                return (
                  <div key={group}>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      {group}
                    </h4>
                    <ul className="space-y-2">
                      {items.map((doc) => (
                        <li
                          key={doc.id}
                          className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2 text-sm"
                        >
                          <div>
                            <p className="font-medium text-navy-900">
                              {doc.name}
                            </p>
                            <p className="text-xs text-muted">
                              {doc.uploadedBy} · {doc.uploadedAt} ·{" "}
                              {doc.sizeLabel}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })
            )}
            {[...documentsByType.entries()]
              .filter(
                ([type]) =>
                  !DOCUMENT_GROUPS.includes(
                    type as (typeof DOCUMENT_GROUPS)[number],
                  ),
              )
              .map(([type, items]) => (
                <div key={type}>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    {type}
                  </h4>
                  <ul className="space-y-2">
                    {items.map((doc) => (
                      <li
                        key={doc.id}
                        className="rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2 text-sm"
                      >
                        <p className="font-medium text-navy-900">{doc.name}</p>
                        <p className="text-xs text-muted">
                          {doc.uploadedBy} · {doc.uploadedAt}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client information</CardTitle>
            <CardDescription>
              Contact and account details for {portfolioMatter.clientName}
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            {client ? (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">Client name</dt>
                  <dd className="font-medium text-navy-900">{client.name}</dd>
                </div>
                <div>
                  <dt className="text-muted">Type</dt>
                  <dd className="font-medium capitalize text-navy-900">
                    {client.client_type}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Email</dt>
                  <dd className="font-medium text-navy-900">
                    {client.email ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Phone</dt>
                  <dd className="font-medium text-navy-900">
                    {client.phone ?? "—"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted">Address</dt>
                  <dd className="font-medium text-navy-900">
                    {[client.address_line_1, client.city, client.state, client.postal_code]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Conflict status</dt>
                  <dd className="font-medium text-navy-900">
                    {CONFLICT_STATUS_LABELS[client.conflict_check_status]}
                  </dd>
                </div>
                {client.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted">Client notes</dt>
                    <dd className="mt-1 text-navy-900">{client.notes}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">Client name</dt>
                  <dd className="font-medium text-navy-900">
                    {portfolioMatter.clientName}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Matter scope</dt>
                  <dd className="font-medium text-navy-900">
                    {portfolioMatter.engagementScope}
                  </dd>
                </div>
              </dl>
            )}
            {portfolioMatter.clientId && (
              <Link
                href={`/clients/${portfolioMatter.clientId}`}
                className="mt-4 inline-block text-sm font-medium text-navy-700 hover:underline"
              >
                Open full client record →
              </Link>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Case notes</CardTitle>
          <CardDescription>
            Internal notes from the legal team on this matter
          </CardDescription>
        </CardHeader>
        <div className="space-y-4 px-6 pb-6">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border border-gray-100 bg-white px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                <span className="font-medium text-navy-900">{note.author}</span>
                <span>{formatNoteDate(note.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm text-navy-900">{note.body}</p>
            </div>
          ))}
          <div className="space-y-2 border-t border-gray-100 pt-4">
            <Textarea
              label="Add a case note"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
              placeholder="Document strategy, client calls, or next steps…"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={handleAddNote}
              disabled={!newNote.trim()}
            >
              Save note
            </Button>
          </div>
        </div>
      </Card>

      {isManagingPartner && (
        <Card>
          <CardHeader>
            <CardTitle>Governance & engagement</CardTitle>
            <CardDescription>
              Lifecycle, staffing, fee terms, and partner review — same controls as
              the firm matters register
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <MatterGovernancePanel
              matter={portfolioMatter}
              allMatters={allMatters}
              attorneys={attorneys}
              onMatterChange={refreshPortfolio}
              onToast={setToast}
            />
          </div>
        </Card>
      )}

      <Modal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        title="Create and assign task"
        description="Add a new task for this matter and assign it to a team member."
      >
        <div className="space-y-4">
          <Input
            label="Task title"
            value={newTask.title}
            onChange={(e) =>
              setNewTask((prev) => ({ ...prev, title: e.target.value }))
            }
          />
          <Textarea
            label="Description (optional)"
            value={newTask.description}
            onChange={(e) =>
              setNewTask((prev) => ({ ...prev, description: e.target.value }))
            }
            rows={2}
          />
          <Select
            label="Assign to"
            value={newTask.assignedTo}
            onChange={(e) =>
              setNewTask((prev) => ({ ...prev, assignedTo: e.target.value }))
            }
            options={staffAssigneeOptions}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Percent complete"
              type="number"
              min={0}
              max={100}
              value={newTask.percentComplete}
              onChange={(e) =>
                setNewTask((prev) => ({
                  ...prev,
                  percentComplete: e.target.value,
                }))
              }
            />
            <Input
              label="Due date"
              type="date"
              value={newTask.dueDate}
              onChange={(e) =>
                setNewTask((prev) => ({ ...prev, dueDate: e.target.value }))
              }
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTask} disabled={!newTask.title.trim()}>
              Create task
            </Button>
          </div>
        </div>
      </Modal>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
