"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  FileText,
  FileX2,
  GitBranch,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  addMatterDocument,
  addMatterMessage,
  addMatterRequest,
  fulfillMatterRequest,
  getClientDocumentDeletionRequests,
  getMatterDocuments,
  getMatterMessages,
  getMatterRequests,
  getMatterStatuses,
  MATTER_WORKSPACE_UPDATE_EVENT,
  resolveClientDocumentDeletionRequest,
  saveMatterStatus,
  type ClientDocumentDeletionRequest,
  type MatterCaseStatus,
  type MatterDocument,
  type MatterMessage,
  type MatterRequest,
} from "@/lib/matters/workspace-store";
import {
  PARALEGAL_ASSIGNED_MATTERS,
  type ParalegalAssignmentMatter,
} from "@/lib/paralegal/demo-data";
import { cn } from "@/lib/utils/cn";

type MatterFeature = "status" | "documentation" | "requests" | "messaging";

const FEATURES: Array<{
  id: MatterFeature;
  label: string;
  icon: typeof GitBranch;
}> = [
  { id: "status", label: "Case Status", icon: GitBranch },
  { id: "documentation", label: "Documentation", icon: FileText },
  { id: "requests", label: "Requests", icon: ClipboardList },
  { id: "messaging", label: "Messaging", icon: MessageSquare },
];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function MatterWorkspace() {
  const { identity } = useDemoRole();
  const [activeFeature, setActiveFeature] = useState<MatterFeature>("status");
  const [matterId, setMatterId] = useState(PARALEGAL_ASSIGNED_MATTERS[0].id);
  const [statuses, setStatuses] = useState<MatterCaseStatus[]>([]);
  const [documents, setDocuments] = useState<MatterDocument[]>([]);
  const [requests, setRequests] = useState<MatterRequest[]>([]);
  const [messages, setMessages] = useState<MatterMessage[]>([]);

  const matter =
    PARALEGAL_ASSIGNED_MATTERS.find((item) => item.id === matterId) ??
    PARALEGAL_ASSIGNED_MATTERS[0];

  const refresh = useCallback(() => {
    setStatuses(getMatterStatuses());
    setDocuments(getMatterDocuments());
    setRequests(getMatterRequests());
    setMessages(getMatterMessages());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(MATTER_WORKSPACE_UPDATE_EVENT, refresh);
    return () =>
      window.removeEventListener(MATTER_WORKSPACE_UPDATE_EVENT, refresh);
  }, [refresh]);

  return (
    <section aria-labelledby="matter-workspace-heading" className="space-y-6">
      <Card className="border-gold-500/30 bg-gradient-to-r from-navy-900 to-navy-800 text-white">
        <div className="flex flex-col gap-5 p-1 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-gold-500">Matter workspace</p>
            <h2
              id="matter-workspace-heading"
              className="mt-1 text-2xl font-semibold"
            >
              Case activity by matter
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-gray-200">
              Review status, documents, requests, and messages for one matter at
              a time.
            </p>
          </div>
          <div className="w-full lg:w-[430px]">
            <Select
              id="matter-workspace-selector"
              label="Matter name / Case #"
              options={PARALEGAL_ASSIGNED_MATTERS.map((item) => ({
                value: item.id,
                label: `${item.title} · Case # ${item.matterNumber}`,
              }))}
              value={matterId}
              onChange={(event) => setMatterId(event.target.value)}
              className="border-white/30 bg-white text-navy-900"
            />
          </div>
        </div>
      </Card>

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Matter features"
      >
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          const selected = activeFeature === feature.id;
          return (
            <button
              key={feature.id}
              type="button"
              role="tab"
              id={`matter-tab-${feature.id}`}
              aria-selected={selected}
              aria-controls={`matter-panel-${feature.id}`}
              onClick={() => setActiveFeature(feature.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                selected
                  ? "border-navy-900 bg-navy-900 text-white"
                  : "border-gray-200 bg-white text-navy-900 hover:bg-gray-50",
              )}
            >
              <Icon className="h-4 w-4" />
              {feature.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`matter-panel-${activeFeature}`}
        aria-labelledby={`matter-tab-${activeFeature}`}
      >
        {activeFeature === "status" && (
          <CaseStatusPanel matter={matter} statuses={statuses} onSaved={refresh} />
        )}
        {activeFeature === "documentation" && (
          <DocumentationPanel
            matter={matter}
            documents={documents}
            uploadedBy={identity.fullName}
          />
        )}
        {activeFeature === "requests" && (
          <RequestsPanel
            matter={matter}
            requests={requests}
            requestedBy={identity.fullName}
          />
        )}
        {activeFeature === "messaging" && (
          <MessagingPanel
            matter={matter}
            messages={messages}
            sender={identity.fullName}
          />
        )}
      </div>
    </section>
  );
}

function CaseStatusPanel({
  matter,
  statuses,
  onSaved,
}: {
  matter: ParalegalAssignmentMatter;
  statuses: MatterCaseStatus[];
  onSaved: () => void;
}) {
  const status = statuses.find((item) => item.matterId === matter.id);

  if (!status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Case Status</CardTitle>
          <CardDescription>No status record exists for this matter.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const completed = status.tasks.filter((task) => task.completed).length;
  const progress = Math.round((completed / status.tasks.length) * 100);

  function toggleTask(taskId: string) {
    saveMatterStatus({
      ...status!,
      tasks: status!.tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task,
      ),
    });
    onSaved();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{matter.title}</CardTitle>
            <CardDescription>
              Case # {matter.matterNumber} · Opened {matter.openDate} ·{" "}
              {matter.practiceArea}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant={matter.status === "on_hold" ? "warning" : "success"}>
              {matter.status.replaceAll("_", " ")}
            </Badge>
            <Badge variant="neutral">{status.phase}</Badge>
          </div>
        </div>
      </CardHeader>

      <p className="text-sm text-navy-900">{status.summary}</p>
      <p className="mt-3 text-sm font-medium text-navy-900">
        Next deadline: {status.nextDeadline}
      </p>

      <div className="mt-5">
        <div className="mb-2 flex justify-between text-sm">
          <span className="font-medium text-navy-900">
            {completed} of {status.tasks.length} tasks complete
          </span>
          <span className="text-muted">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-navy-900 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <ul className="mt-5 space-y-3">
        {status.tasks.map((task) => (
          <li
            key={task.id}
            className={cn(
              "flex items-start gap-3 rounded-xl border px-4 py-3",
              task.completed
                ? "border-green-200 bg-green-50"
                : "border-gray-200 bg-white",
            )}
          >
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => toggleTask(task.id)}
              className="mt-1 h-4 w-4 accent-navy-900"
              aria-label={`Mark ${task.title} ${task.completed ? "incomplete" : "complete"}`}
            />
            <div>
              <p className="text-sm font-medium text-navy-900">{task.title}</p>
              <p className="mt-1 text-xs text-muted">Owner: {task.owner}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function DocumentationPanel({
  matter,
  documents,
  uploadedBy,
}: {
  matter: ParalegalAssignmentMatter;
  documents: MatterDocument[];
  uploadedBy: string;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("");
  const [otherDocumentType, setOtherDocumentType] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletionRequest, setDeletionRequest] =
    useState<ClientDocumentDeletionRequest | null>(null);
  const visible = documents.filter((item) => item.matterId === matter.id);
  const pendingDeletionRequests = getClientDocumentDeletionRequests().filter(
    (request) => request.status === "pending",
  );

  const documentTypeOptions = [
    "Signed contracts",
    "Evidence",
    "Court documents",
    "Case evidence",
    "Business documents",
    "Legal documents",
    "Other",
  ];

  function uploadDocument() {
    if (!documentType) {
      setError("Select the type of documentation before uploading.");
      return;
    }
    if (documentType === "Other" && !otherDocumentType.trim()) {
      setError("Describe what type of document this is before uploading.");
      return;
    }
    if (!pendingFile) {
      setError("Choose a file before uploading.");
      return;
    }
    const resolvedDocumentType =
      documentType === "Other" ? otherDocumentType.trim() : documentType;
    addMatterDocument({
      id: `matter-document-${Date.now()}`,
      matterId: matter.id,
      name: pendingFile.name,
      documentType: resolvedDocumentType,
      uploadedBy,
      uploadedAt: formatTimestamp(new Date().toISOString()),
      sizeLabel: formatFileSize(pendingFile.size),
    });
    setMessage(
      `${pendingFile.name} was added to ${matter.title} as ${resolvedDocumentType}.`,
    );
    setDocumentType("");
    setOtherDocumentType("");
    setPendingFile(null);
    setError(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  function resolveDeletion(decision: "approved" | "denied") {
    if (!deletionRequest) return;
    resolveClientDocumentDeletionRequest(
      deletionRequest.id,
      decision,
      uploadedBy,
    );
    setMessage(
      decision === "approved"
        ? `${deletionRequest.documentName} was deleted after approval.`
        : `The deletion request for ${deletionRequest.documentName} was denied.`,
    );
    setDeletionRequest(null);
  }

  return (
    <>
      {message && (
        <p className="mb-4 rounded-lg bg-gold-100 px-4 py-3 text-sm text-navy-900">
          {message}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload documentation</CardTitle>
            <CardDescription>
              Select a documentation type before attaching a file to{" "}
              {matter.title} · Case # {matter.matterNumber}.
            </CardDescription>
          </CardHeader>
          <div className="space-y-4">
            <Select
              label="Type of documentation"
              options={[
                { value: "", label: "Select documentation type" },
                ...documentTypeOptions.map((value) => ({
                  value,
                  label: value,
                })),
              ]}
              value={documentType}
              onChange={(event) => {
                setDocumentType(event.target.value);
                if (event.target.value !== "Other") {
                  setOtherDocumentType("");
                }
                setError(null);
              }}
            />

            {documentType === "Other" && (
              <Input
                label="What type of document is this?"
                value={otherDocumentType}
                onChange={(event) => {
                  setOtherDocumentType(event.target.value);
                  setError(null);
                }}
                placeholder="Enter the document type"
                required
              />
            )}

            <input
              ref={fileInput}
              type="file"
              className="hidden"
              onChange={(event) => {
                setPendingFile(event.target.files?.[0] ?? null);
                setMessage(null);
                setError(null);
              }}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex min-h-40 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-surface px-6 py-8 text-center hover:border-navy-700"
            >
              <Upload className="h-7 w-7 text-navy-900" />
              <span className="mt-2 text-sm font-semibold text-navy-900">
                {pendingFile ? pendingFile.name : "Choose a file"}
              </span>
              <span className="mt-1 text-xs text-muted">
                {pendingFile
                  ? `${formatFileSize(pendingFile.size)} ready to upload`
                  : "Click to browse your computer"}
              </span>
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button onClick={uploadDocument}>
              <Upload className="h-4 w-4" />
              Upload to matter
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Matter documents</CardTitle>
            <CardDescription>
              {visible.length} document(s) for this case. Red documents have a
              client deletion request awaiting a decision.
            </CardDescription>
          </CardHeader>

          {pendingDeletionRequests.length > 0 && (
            <div className="mb-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">
                Client deletion requests
              </p>
              <ul className="space-y-3">
                {pendingDeletionRequests.map((request) => (
                  <li key={request.id}>
                    <button
                      type="button"
                      onClick={() => setDeletionRequest(request)}
                      className="flex w-full items-start gap-3 rounded-xl border border-red-300 bg-red-50 px-3 py-3 text-left transition-colors hover:bg-red-100"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
                        <FileX2 className="h-5 w-5" />
                      </div>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-red-900">
                          {request.documentName}
                        </span>
                        <span className="mt-1 block text-xs text-red-700">
                          {request.documentType} · {request.matterName} · Case #{" "}
                          {request.matterNumber}
                        </span>
                        <span className="mt-2 block text-xs text-red-800">
                          Requested by {request.requestedBy}: {request.reason}
                        </span>
                        <span className="mt-2 block text-xs font-semibold text-red-900">
                          Click to approve or deny deletion
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {visible.length === 0 ? (
            <p className="text-sm text-muted">No documentation uploaded yet.</p>
          ) : (
            <ul className="space-y-3">
              {visible.map((document) => (
                <li
                  key={document.id}
                  className="flex items-start gap-3 rounded-xl border border-gray-200 px-3 py-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-900/5 text-navy-900">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-navy-900">
                      {document.name}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {document.documentType} · {document.sizeLabel}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Uploaded by {document.uploadedBy} · {document.uploadedAt}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal
        isOpen={deletionRequest !== null}
        onClose={() => setDeletionRequest(null)}
        title="Review document deletion request"
        description={
          deletionRequest
            ? `${deletionRequest.requestedBy} requested deletion of “${deletionRequest.documentName}.”`
            : undefined
        }
      >
        {deletionRequest && (
          <div className="space-y-4">
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-semibold text-red-900">
                {deletionRequest.documentName}
              </p>
              <p className="mt-1 text-xs text-red-700">
                {deletionRequest.documentType} · {deletionRequest.matterName} ·
                Case # {deletionRequest.matterNumber}
              </p>
              <p className="mt-3 text-sm text-red-900">
                Reason: {deletionRequest.reason}
              </p>
            </div>
            <p className="text-sm text-muted">
              Approving permanently removes the document from the client’s
              documentation list. Denying restores it to its normal state.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => resolveDeletion("denied")}
              >
                <XCircle className="h-4 w-4" />
                Deny request
              </Button>
              <Button
                type="button"
                onClick={() => resolveDeletion("approved")}
                className="bg-red-700 hover:bg-red-800"
              >
                <ShieldCheck className="h-4 w-4" />
                Approve and delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

type RequestView = "home" | "create" | "fulfilled" | "fulfill-list" | "fulfill";

function RequestsPanel({
  matter,
  requests,
  requestedBy,
}: {
  matter: ParalegalAssignmentMatter;
  requests: MatterRequest[];
  requestedBy: string;
}) {
  const [view, setView] = useState<RequestView>("home");
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const recipients = useMemo(
    () => [
      matter.clientName,
      `${matter.attorneyName} — Attorney`,
      "Parker Legal — Paralegal",
      "Billing Department",
    ],
    [matter.clientName, matter.attorneyName],
  );

  const visible = requests.filter((item) => item.matterId === matter.id);
  const openRequests = visible.filter((item) => item.status !== "completed");
  const fulfilledRequests = visible.filter(
    (item) => item.status === "completed",
  );
  const activeRequest =
    visible.find((item) => item.id === activeRequestId) ?? null;

  const resetForm = useCallback(() => {
    setDetails("");
    setSentTo("");
    setError(null);
  }, []);

  const goHome = useCallback(() => {
    setView("home");
    setActiveRequestId(null);
    resetForm();
  }, [resetForm]);

  useEffect(() => {
    goHome();
    setConfirmation(null);
  }, [matter.id, goHome]);

  function submitNewRequest(event: React.FormEvent) {
    event.preventDefault();
    if (!details.trim()) {
      setError("Describe the request before sending it.");
      return;
    }
    if (!sentTo) {
      setError("Choose who this request is sent to.");
      return;
    }

    const summary = details.trim();
    addMatterRequest({
      id: `matter-request-${Date.now()}`,
      matterId: matter.id,
      requestType: "Matter request",
      subject: summary.length > 60 ? `${summary.slice(0, 57)}...` : summary,
      details: summary,
      requestedBy,
      assignedTo: sentTo,
      status: "pending",
      createdAt: new Date().toISOString().slice(0, 10),
    });
    setConfirmation(`Request sent to ${sentTo} for ${matter.title}.`);
    goHome();
  }

  function submitFulfillment(event: React.FormEvent) {
    event.preventDefault();
    if (!activeRequest) return;
    if (!details.trim()) {
      setError("Describe how the request was fulfilled.");
      return;
    }
    if (!sentTo) {
      setError("Choose who the fulfillment is sent to.");
      return;
    }

    fulfillMatterRequest(activeRequest.id, {
      details: details.trim(),
      sentTo,
      fulfilledBy: requestedBy,
      fulfilledAt: new Date().toISOString().slice(0, 10),
    });
    setConfirmation(`Fulfillment sent to ${sentTo}.`);
    goHome();
  }

  if (view === "home") {
    const options = [
      {
        id: "create" as const,
        title: "Create a new request",
        description: `Send a new request about ${matter.title}.`,
        icon: Send,
        count: null,
      },
      {
        id: "fulfilled" as const,
        title: "See fulfilled requests",
        description: "Review requests that have already been completed.",
        icon: CheckCircle2,
        count: fulfilledRequests.length,
      },
      {
        id: "fulfill-list" as const,
        title: "Fulfill a request",
        description: "Respond to a request that is still open.",
        icon: ClipboardList,
        count: openRequests.length,
      },
    ];

    return (
      <div className="mx-auto max-w-3xl">
        {confirmation && (
          <p className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
            {confirmation}
          </p>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Requests</CardTitle>
            <CardDescription>
              Choose an option for {matter.title} · Case # {matter.matterNumber}.
            </CardDescription>
          </CardHeader>
          <div className="space-y-3">
            {options.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    resetForm();
                    setConfirmation(null);
                    setView(option.id);
                  }}
                  className="flex w-full items-start gap-4 rounded-xl border border-gray-200 px-4 py-4 text-left transition-colors hover:border-navy-700/40 hover:bg-surface"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-gold-500">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-navy-900">
                        {option.title}
                      </span>
                      {option.count !== null && option.count > 0 && (
                        <Badge variant="neutral">{option.count}</Badge>
                      )}
                    </span>
                    <span className="mt-1 block text-sm text-muted">
                      {option.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>
    );
  }

  if (view === "fulfilled") {
    return (
      <div className="mx-auto max-w-3xl">
        <BackToRequests onClick={goHome} />
        <Card>
          <CardHeader>
            <CardTitle>Fulfilled requests</CardTitle>
            <CardDescription>
              Completed requests for Case # {matter.matterNumber}.
            </CardDescription>
          </CardHeader>
          {fulfilledRequests.length === 0 ? (
            <p className="text-sm text-muted">
              No requests have been fulfilled for this matter yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {fulfilledRequests.map((request) => (
                <li
                  key={request.id}
                  className="rounded-xl border border-green-200 bg-green-50/50 px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-navy-900">
                      {request.subject}
                    </p>
                    <Badge variant="success">completed</Badge>
                  </div>
                  <p className="mt-2 text-sm text-navy-900">{request.details}</p>
                  <p className="mt-2 text-xs text-muted">
                    Requested by {request.requestedBy} · {request.createdAt}
                  </p>
                  {request.fulfillment && (
                    <div className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-3">
                      <p className="text-xs font-semibold text-navy-900">
                        Fulfillment
                      </p>
                      <p className="mt-1 text-sm text-navy-900">
                        {request.fulfillment.details}
                      </p>
                      <p className="mt-2 text-xs text-muted">
                        Sent to {request.fulfillment.sentTo} by{" "}
                        {request.fulfillment.fulfilledBy} ·{" "}
                        {request.fulfillment.fulfilledAt}
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    );
  }

  if (view === "fulfill-list") {
    return (
      <div className="mx-auto max-w-3xl">
        <BackToRequests onClick={goHome} />
        <Card>
          <CardHeader>
            <CardTitle>Fulfill a request</CardTitle>
            <CardDescription>
              Choose an open request for Case # {matter.matterNumber}.
            </CardDescription>
          </CardHeader>
          {openRequests.length === 0 ? (
            <p className="text-sm text-muted">
              No open requests for this matter.
            </p>
          ) : (
            <ul className="space-y-3">
              {openRequests.map((request) => (
                <li key={request.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveRequestId(request.id);
                      setDetails("");
                      setSentTo(request.requestedBy);
                      setError(null);
                      setView("fulfill");
                    }}
                    className="flex w-full items-start justify-between gap-4 rounded-xl border border-gray-200 px-4 py-4 text-left transition-colors hover:border-navy-700/40 hover:bg-surface"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-navy-900">
                        {request.subject}
                      </span>
                      <span className="mt-1 block text-xs text-muted">
                        {request.requestType} · Assigned to {request.assignedTo}
                      </span>
                      <span className="mt-2 block text-sm text-navy-900">
                        {request.details}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-medium text-navy-700">
                      Open
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    );
  }

  const isFulfilling = view === "fulfill";

  return (
    <div className="mx-auto max-w-2xl">
      <BackToRequests
        onClick={isFulfilling ? () => setView("fulfill-list") : goHome}
        label={isFulfilling ? "Back to open requests" : "Back to requests"}
      />
      <Card>
        <CardHeader>
          <CardTitle>
            {isFulfilling ? "Fulfill request" : "Create a new request"}
          </CardTitle>
          <CardDescription>
            {isFulfilling && activeRequest
              ? `Responding to “${activeRequest.subject}” on ${matter.title}.`
              : `New request for ${matter.title} · Case # ${matter.matterNumber}.`}
          </CardDescription>
        </CardHeader>

        {isFulfilling && activeRequest && (
          <p className="mb-5 rounded-xl bg-surface px-4 py-3 text-sm text-navy-900">
            {activeRequest.details}
          </p>
        )}

        <form
          onSubmit={isFulfilling ? submitFulfillment : submitNewRequest}
          className="space-y-5"
        >
          <Textarea
            label={
              isFulfilling
                ? "Describe how the request was fulfilled"
                : "Describe the request"
            }
            className="min-h-40"
            value={details}
            onChange={(event) => {
              setDetails(event.target.value);
              setError(null);
            }}
            placeholder={
              isFulfilling
                ? "Explain what was provided or completed"
                : "Explain what you need and any useful details"
            }
          />

          <Select
            label={isFulfilling ? "Send fulfillment to" : "Send request to"}
            options={[
              { value: "", label: "Select a recipient" },
              ...recipients.map((value) => ({ value, label: value })),
            ]}
            value={sentTo}
            onChange={(event) => {
              setSentTo(event.target.value);
              setError(null);
            }}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end">
            <Button type="submit">
              <Send className="h-4 w-4" />
              {isFulfilling ? "Send fulfillment" : "Send request"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function BackToRequests({
  onClick,
  label = "Back to requests",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-4 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-navy-900 transition-colors hover:bg-gray-100"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  );
}

type MessagingView = "inbox" | "recipients" | "topic" | "compose";

const MESSAGE_TOPICS = [
  "General case correspondence",
  "New case updates",
  "Settlement discussion",
  "Other",
];

const MESSAGE_STEPS: Array<Exclude<MessagingView, "inbox">> = [
  "recipients",
  "topic",
  "compose",
];

function MessagingPanel({
  matter,
  messages,
  sender,
}: {
  matter: ParalegalAssignmentMatter;
  messages: MatterMessage[];
  sender: string;
}) {
  const attachmentInput = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<MessagingView>("inbox");
  const [recipients, setRecipients] = useState<string[]>([""]);
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const visible = useMemo(
    () => messages.filter((item) => item.matterId === matter.id),
    [messages, matter.id],
  );

  const contacts = useMemo(
    () => [
      { value: matter.clientName, label: `${matter.clientName} — Client` },
      ...matter.paralegalNames.map((name) => ({
        value: name,
        label: `${name} — Paralegal`,
      })),
    ],
    [matter.clientName, matter.paralegalNames],
  );

  const resetWizard = useCallback(() => {
    setRecipients([""]);
    setTopic("");
    setSubject("");
    setBody("");
    setAttachment(null);
    setError(null);
    if (attachmentInput.current) attachmentInput.current.value = "";
  }, []);

  useEffect(() => {
    setView("inbox");
    setConfirmation(null);
    resetWizard();
  }, [matter.id, resetWizard]);

  const selectedLabels = recipients
    .map((value) => contacts.find((contact) => contact.value === value)?.label)
    .filter((label): label is string => Boolean(label));

  function contactOptions(index: number) {
    const chosenElsewhere = new Set(
      recipients.filter((value, position) => position !== index && value),
    );

    return [
      { value: "", label: "Select a recipient" },
      ...contacts.filter((contact) => !chosenElsewhere.has(contact.value)),
    ];
  }

  function continueFromRecipients() {
    if (recipients.some((value) => !value)) {
      setError("Select a recipient in each field before continuing.");
      return;
    }
    setError(null);
    setView("topic");
  }

  function continueFromTopic() {
    if (!topic) {
      setError("Select what your message is regarding.");
      return;
    }
    setSubject(topic);
    setError(null);
    setView("compose");
  }

  function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!subject.trim()) {
      setError("Add a subject before sending.");
      return;
    }
    if (!body.trim()) {
      setError("Write a message before sending.");
      return;
    }

    addMatterMessage({
      id: `matter-message-${Date.now()}`,
      matterId: matter.id,
      sender,
      senderRole: "Legal team",
      recipients: selectedLabels,
      subject: subject.trim(),
      body: `${body.trim()}${attachment ? `\n\nAttachment: ${attachment.name}` : ""}`,
      sentAt: new Date().toISOString(),
    });
    setConfirmation(
      `Message sent to ${selectedLabels.join(", ")} for ${matter.title}.`,
    );
    resetWizard();
    setView("inbox");
  }

  if (view === "inbox") {
    return (
      <div className="mx-auto max-w-4xl">
        {confirmation && (
          <p className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
            {confirmation}
          </p>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Matter messaging</CardTitle>
            <CardDescription>
              Secure conversation for {matter.title} · Case #{" "}
              {matter.matterNumber}.
            </CardDescription>
          </CardHeader>

          <button
            type="button"
            onClick={() => {
              resetWizard();
              setConfirmation(null);
              setView("recipients");
            }}
            className="mb-5 flex w-full items-start gap-4 rounded-xl border border-gray-200 px-4 py-4 text-left transition-colors hover:border-navy-700/40 hover:bg-surface"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-gold-500">
              <Send className="h-5 w-5" />
            </div>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-navy-900">
                Create a new message
              </span>
              <span className="mt-1 block text-sm text-muted">
                Message the client or a paralegal on {matter.title}.
              </span>
            </span>
          </button>

          <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-xl bg-surface p-4">
            {visible.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">
                No messages for this matter.
              </p>
            ) : (
              visible.map((message) => {
                const isCurrentUser = message.sender === sender;
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      isCurrentUser ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-3",
                        isCurrentUser
                          ? "bg-navy-900 text-white"
                          : "border border-gray-200 bg-white text-navy-900",
                      )}
                    >
                      <p
                        className={cn(
                          "text-xs font-semibold",
                          isCurrentUser ? "text-gold-500" : "text-muted",
                        )}
                      >
                        {message.sender} · {message.senderRole}
                      </p>
                      {message.recipients && message.recipients.length > 0 && (
                        <p
                          className={cn(
                            "mt-1 text-xs",
                            isCurrentUser ? "text-gray-300" : "text-muted",
                          )}
                        >
                          To: {message.recipients.join(", ")}
                        </p>
                      )}
                      {message.subject && (
                        <p className="mt-1 text-sm font-semibold">
                          {message.subject}
                        </p>
                      )}
                      <p className="mt-1 whitespace-pre-wrap text-sm">
                        {message.body}
                      </p>
                      <p
                        className={cn(
                          "mt-2 text-xs",
                          isCurrentUser ? "text-gray-300" : "text-muted",
                        )}
                      >
                        {formatTimestamp(message.sentAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    );
  }

  const currentStep = MESSAGE_STEPS.indexOf(view);

  return (
    <div className="mx-auto max-w-3xl">
      <div
        className="mb-6 flex items-center justify-center gap-2"
        aria-label="Message progress"
      >
        {MESSAGE_STEPS.map((step, index) => (
          <div key={step} className="flex items-center">
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold",
                index <= currentStep
                  ? "bg-navy-900 text-white"
                  : "bg-gray-200 text-muted",
              )}
            >
              {index + 1}
            </span>
            {index < MESSAGE_STEPS.length - 1 && (
              <span
                className={cn(
                  "h-0.5 w-8 sm:w-16",
                  index < currentStep ? "bg-navy-900" : "bg-gray-200",
                )}
              />
            )}
          </div>
        ))}
      </div>

      <Card padding="lg">
        {view === "recipients" && (
          <>
            <div className="mb-7 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold-100 text-navy-900">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-semibold text-navy-900">
                To whom should we send the message?
              </h2>
              <p className="mt-2 text-sm text-muted">
                Choose the client or a paralegal assigned to {matter.title} ·
                Case # {matter.matterNumber}.
              </p>
            </div>

            <div className="space-y-4">
              {recipients.map((recipient, index) => (
                <div key={index} className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <Select
                      id={`matter-message-recipient-${index}`}
                      label={
                        index === 0
                          ? "Recipient"
                          : `Additional recipient ${index}`
                      }
                      options={contactOptions(index)}
                      value={recipient}
                      onChange={(event) => {
                        const value = event.target.value;
                        setRecipients((current) =>
                          current.map((item, position) =>
                            position === index ? value : item,
                          ),
                        );
                        setError(null);
                      }}
                    />
                  </div>
                  {index > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mb-1 text-red-700"
                      onClick={() =>
                        setRecipients((current) =>
                          current.filter((_, position) => position !== index),
                        )
                      }
                      aria-label={`Remove recipient ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {recipients.length < contacts.length && (
              <Button
                variant="ghost"
                className="mt-4"
                onClick={() => setRecipients((current) => [...current, ""])}
              >
                <Plus className="h-4 w-4" />
                Add another recipient
              </Button>
            )}

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            <div className="mt-8 flex justify-between gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  resetWizard();
                  setView("inbox");
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to messages
              </Button>
              <Button onClick={continueFromRecipients}>Continue</Button>
            </div>
          </>
        )}

        {view === "topic" && (
          <>
            <div className="mb-7 text-center">
              <h2 className="text-2xl font-semibold text-navy-900">
                Next, tell us what your message is regarding
              </h2>
              <p className="mt-2 text-sm text-muted">
                To: {selectedLabels.join(", ")}
              </p>
            </div>

            <fieldset className="space-y-3">
              <legend className="sr-only">Message topic</legend>
              {MESSAGE_TOPICS.map((option) => (
                <label
                  key={option}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-4 transition-colors",
                    topic === option
                      ? "border-navy-900 bg-navy-900/5"
                      : "border-gray-200 hover:border-navy-700/40",
                  )}
                >
                  <input
                    type="radio"
                    name="matter-message-topic"
                    value={option}
                    checked={topic === option}
                    onChange={() => {
                      setTopic(option);
                      setError(null);
                    }}
                    className="h-4 w-4 accent-navy-900"
                  />
                  <span className="text-sm font-medium text-navy-900">
                    {option}
                  </span>
                </label>
              ))}
            </fieldset>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            <div className="mt-8 flex justify-between gap-3">
              <Button variant="ghost" onClick={() => setView("recipients")}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={continueFromTopic}>Continue</Button>
            </div>
          </>
        )}

        {view === "compose" && (
          <form onSubmit={sendMessage}>
            <div className="mb-7 text-center">
              <h2 className="text-2xl font-semibold text-navy-900">
                New Message
              </h2>
              <p className="mt-2 text-sm text-muted">
                To: {selectedLabels.join(", ")}
              </p>
              <p className="mt-1 text-sm text-muted">
                {matter.title} · Case # {matter.matterNumber}
              </p>
            </div>

            <div className="space-y-5">
              <Input
                label="Subject"
                value={subject}
                onChange={(event) => {
                  setSubject(event.target.value);
                  setError(null);
                }}
              />
              <Textarea
                label="Message"
                className="min-h-48"
                value={body}
                onChange={(event) => {
                  setBody(event.target.value);
                  setError(null);
                }}
                placeholder="Type your message here"
              />

              <div>
                <p className="mb-2 text-sm font-medium text-navy-900">
                  Attachment
                </p>
                <input
                  ref={attachmentInput}
                  type="file"
                  className="hidden"
                  onChange={(event) =>
                    setAttachment(event.target.files?.[0] ?? null)
                  }
                />
                {attachment ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText className="h-5 w-5 shrink-0 text-navy-900" />
                      <span className="truncate text-sm text-navy-900">
                        {attachment.name}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAttachment(null);
                        if (attachmentInput.current) {
                          attachmentInput.current.value = "";
                        }
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => attachmentInput.current?.click()}
                  >
                    <Paperclip className="h-4 w-4" />
                    Add an attachment
                  </Button>
                )}
              </div>
            </div>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            <div className="mt-8 flex flex-col-reverse justify-between gap-3 sm:flex-row">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setView("topic")}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button type="submit">
                <Send className="h-4 w-4" />
                Review and send
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
