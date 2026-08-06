import type { TaskOwner } from "@/lib/client-portal/case-task-lists";
import { CASE_TYPE_TASK_LISTS } from "@/lib/client-portal/case-task-lists";
import type { CaseTypeId } from "@/lib/client-portal/case-task-lists";
import { PARALEGAL_ASSIGNED_MATTERS } from "@/lib/paralegal/demo-data";

export const MATTER_WORKSPACE_UPDATE_EVENT = "matter-workspace-updated";

const STATUS_KEY = "counselflow-matter-status-overrides";
const DOCUMENTS_KEY = "counselflow-matter-documents";
const DOCUMENTS_DELETED_KEY = "counselflow-matter-documents-deleted";
const DOCUMENT_DELETION_REQUESTS_KEY =
  "counselflow-document-deletion-requests";
const REQUESTS_KEY = "counselflow-matter-requests";
const MESSAGES_KEY = "counselflow-matter-messages";

export type MatterStatusTask = {
  id: string;
  title: string;
  description: string;
  owner: TaskOwner;
  completed: boolean;
};

export type MatterCaseStatus = {
  matterId: string;
  phase: string;
  nextDeadline: string;
  summary: string;
  tasks: MatterStatusTask[];
};

export type MatterDocument = {
  id: string;
  matterId: string;
  name: string;
  documentType: string;
  uploadedBy: string;
  uploadedAt: string;
  sizeLabel: string;
};

export type ClientDocumentDeletionRequest = {
  id: string;
  documentId: string;
  documentName: string;
  documentType: string;
  uploadedBy: string;
  uploadedAt: string;
  sizeLabel: string;
  matterName: string;
  matterNumber: string;
  requestedBy: string;
  reason: string;
  requestedAt: string;
  status: "pending" | "approved" | "denied";
  resolvedBy?: string;
  resolvedAt?: string;
};

export type MatterRequestFulfillment = {
  details: string;
  sentTo: string;
  fulfilledBy: string;
  fulfilledAt: string;
};

export type MatterRequest = {
  id: string;
  matterId: string;
  requestType: string;
  subject: string;
  details: string;
  requestedBy: string;
  assignedTo: string;
  status: "pending" | "in_progress" | "completed";
  createdAt: string;
  fulfillment?: MatterRequestFulfillment;
};

export type MatterMessage = {
  id: string;
  matterId: string;
  sender: string;
  senderRole: string;
  recipients?: string[];
  subject?: string;
  body: string;
  sentAt: string;
};

function buildStatusFromCaseType(
  matterId: string,
  caseType: CaseTypeId,
  meta: {
    phase: string;
    nextDeadline: string;
    summary: string;
    completedCount: number;
  },
): MatterCaseStatus {
  const templates = CASE_TYPE_TASK_LISTS[caseType];
  return {
    matterId,
    phase: meta.phase,
    nextDeadline: meta.nextDeadline,
    summary: meta.summary,
    tasks: templates.map((task, index) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      owner: task.owner,
      completed: index < meta.completedCount,
    })),
  };
}

const STATUS_META_BY_MATTER: Record<
  string,
  {
    phase: string;
    nextDeadline: string;
    summary: string;
    completedCount: number;
  }
> = {
  "matter-1": {
    phase: "Discovery",
    nextDeadline: "2026-08-10",
    summary:
      "Written discovery is underway. The answer and supporting exhibits are being finalized.",
    completedCount: 3,
  },
  "matter-2": {
    phase: "Pre-suit negotiation",
    nextDeadline: "2026-08-14",
    summary:
      "The demand package is under attorney review before it is sent to opposing counsel.",
    completedCount: 2,
  },
  "matter-3": {
    phase: "Conflict review hold",
    nextDeadline: "2026-08-12",
    summary:
      "Substantive work is paused while the possible conflict is reviewed and cleared.",
    completedCount: 1,
  },
  "matter-4": {
    phase: "Contract review",
    nextDeadline: "2026-08-13",
    summary:
      "The first round of vendor-agreement comments is ready for client discussion.",
    completedCount: 2,
  },
};

const SEED_STATUSES: MatterCaseStatus[] = PARALEGAL_ASSIGNED_MATTERS.map(
  (matter) => {
    const meta = STATUS_META_BY_MATTER[matter.id] ?? {
      phase: "Active",
      nextDeadline: matter.openDate,
      summary: matter.engagementScope,
      completedCount: 0,
    };
    return buildStatusFromCaseType(matter.id, matter.caseType, meta);
  },
);

const SEED_DOCUMENTS: MatterDocument[] = [
  {
    id: "matter-doc-1",
    matterId: "matter-1",
    name: "Apex_Answer_Draft_v3.pdf",
    documentType: "Pleading",
    uploadedBy: "Parker Legal",
    uploadedAt: "Aug 5, 2026, 2:20 PM",
    sizeLabel: "842 KB",
  },
  {
    id: "matter-doc-2",
    matterId: "matter-1",
    name: "Discovery_Document_Index.xlsx",
    documentType: "Discovery",
    uploadedBy: "Parker Legal",
    uploadedAt: "Aug 4, 2026, 11:05 AM",
    sizeLabel: "126 KB",
  },
  {
    id: "matter-doc-3",
    matterId: "matter-2",
    name: "Santos_Demand_Package_v2.pdf",
    documentType: "Correspondence",
    uploadedBy: "Avery Counsel",
    uploadedAt: "Aug 5, 2026, 9:30 AM",
    sizeLabel: "2.1 MB",
  },
  {
    id: "matter-doc-4",
    matterId: "matter-3",
    name: "Northside_Diligence_Checklist.docx",
    documentType: "Due diligence",
    uploadedBy: "Parker Legal",
    uploadedAt: "Aug 3, 2026, 4:15 PM",
    sizeLabel: "94 KB",
  },
  {
    id: "matter-doc-5",
    matterId: "matter-4",
    name: "Vendor_Agreement_Redline.docx",
    documentType: "Contract",
    uploadedBy: "Avery Counsel",
    uploadedAt: "Aug 5, 2026, 1:10 PM",
    sizeLabel: "318 KB",
  },
];

const SEED_REQUESTS: MatterRequest[] = [
  {
    id: "matter-request-1",
    matterId: "matter-1",
    requestType: "Client information",
    subject: "Confirm custodians for discovery",
    details: "Please identify the employees who maintained the relevant supply records.",
    requestedBy: "Avery Counsel",
    assignedTo: "Chen Manufacturing LLC",
    status: "pending",
    createdAt: "2026-08-05",
  },
  {
    id: "matter-request-2",
    matterId: "matter-2",
    requestType: "Attorney review",
    subject: "Review revised demand package",
    details: "Confirm the revised damages section and settlement range.",
    requestedBy: "Parker Legal",
    assignedTo: "Avery Counsel",
    status: "in_progress",
    createdAt: "2026-08-04",
  },
  {
    id: "matter-request-3",
    matterId: "matter-4",
    requestType: "Client decision",
    subject: "Approve limitation-of-liability position",
    details: "Choose whether to accept the vendor's proposed liability cap.",
    requestedBy: "Avery Counsel",
    assignedTo: "Thomas Hale",
    status: "pending",
    createdAt: "2026-08-05",
  },
];

const SEED_MESSAGES: MatterMessage[] = [
  {
    id: "matter-message-1",
    matterId: "matter-1",
    sender: "Parker Legal",
    senderRole: "Paralegal",
    body: "The discovery index and draft exhibits are uploaded for your review.",
    sentAt: "2026-08-05T14:10:00.000Z",
  },
  {
    id: "matter-message-2",
    matterId: "matter-1",
    sender: "Avery Counsel",
    senderRole: "Attorney",
    body: "Thank you. I will review them before the filing conference.",
    sentAt: "2026-08-05T14:24:00.000Z",
  },
  {
    id: "matter-message-3",
    matterId: "matter-2",
    sender: "Maria Santos",
    senderRole: "Client",
    body: "I am available Friday morning to discuss the settlement range.",
    sentAt: "2026-08-05T13:35:00.000Z",
  },
  {
    id: "matter-message-4",
    matterId: "matter-4",
    sender: "Parker Legal",
    senderRole: "Paralegal",
    body: "The vendor redline is ready and the Thursday appointment is on the calendar.",
    sentAt: "2026-08-05T12:20:00.000Z",
  },
];

function readArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function mergeById<T extends { id: string }>(seed: T[], stored: T[]) {
  const records = new Map(seed.map((item) => [item.id, item]));
  for (const item of stored) records.set(item.id, item);
  return [...records.values()];
}

function persist<T>(key: string, items: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(MATTER_WORKSPACE_UPDATE_EVENT));
}

export function getMatterStatuses(): MatterCaseStatus[] {
  const overrides = readArray<MatterCaseStatus>(STATUS_KEY);
  const overrideByMatter = new Map(
    overrides.map((item) => [item.matterId, item]),
  );

  return SEED_STATUSES.map((seed) => {
    const override = overrideByMatter.get(seed.matterId);
    if (!override) return seed;

    const hasMatchingTasks = override.tasks.some((task) =>
      seed.tasks.some((seedTask) => seedTask.id === task.id),
    );

    return {
      ...seed,
      phase: override.phase || seed.phase,
      nextDeadline: override.nextDeadline || seed.nextDeadline,
      summary: override.summary || seed.summary,
      tasks: seed.tasks.map((task) => {
        if (!hasMatchingTasks) return task;
        const overridden = override.tasks.find((item) => item.id === task.id);
        return overridden
          ? { ...task, completed: overridden.completed }
          : task;
      }),
    };
  });
}

export function saveMatterStatus(status: MatterCaseStatus) {
  const stored = readArray<MatterCaseStatus>(STATUS_KEY);
  persist(STATUS_KEY, [
    status,
    ...stored.filter((item) => item.matterId !== status.matterId),
  ]);
}

export function getMatterDocuments() {
  const deleted = new Set(readArray<string>(DOCUMENTS_DELETED_KEY));
  return mergeById(SEED_DOCUMENTS, readArray<MatterDocument>(DOCUMENTS_KEY)).filter(
    (document) => !deleted.has(document.id),
  );
}

export function addMatterDocument(document: MatterDocument) {
  const stored = readArray<MatterDocument>(DOCUMENTS_KEY);
  const deleted = readArray<string>(DOCUMENTS_DELETED_KEY).filter(
    (id) => id !== document.id,
  );
  if (typeof window !== "undefined") {
    window.localStorage.setItem(DOCUMENTS_DELETED_KEY, JSON.stringify(deleted));
  }
  persist(DOCUMENTS_KEY, [
    document,
    ...stored.filter((item) => item.id !== document.id),
  ]);
}

export function removeMatterDocument(documentId: string) {
  if (typeof window === "undefined") return;
  const deleted = new Set(readArray<string>(DOCUMENTS_DELETED_KEY));
  deleted.add(documentId);
  const stored = readArray<MatterDocument>(DOCUMENTS_KEY).filter(
    (item) => item.id !== documentId,
  );
  window.localStorage.setItem(
    DOCUMENTS_DELETED_KEY,
    JSON.stringify([...deleted]),
  );
  persist(DOCUMENTS_KEY, stored);
}

const SEED_DOCUMENT_DELETION_REQUESTS: ClientDocumentDeletionRequest[] = [
  {
    id: "seed-deletion-matter-doc-1",
    documentId: "matter-doc-1",
    documentName: "Apex_Answer_Draft_v3.pdf",
    documentType: "Court documents",
    uploadedBy: "Parker Legal",
    uploadedAt: "Aug 5, 2026, 2:20 PM",
    sizeLabel: "842 KB",
    matterName: "Chen v. Apex Supply Dispute",
    matterNumber: "M-2401",
    requestedBy: "Cameron Client",
    reason: "This draft was replaced by a newer version and should be removed.",
    requestedAt: "2026-08-05T16:40:00.000Z",
    status: "pending",
  },
];

export function getClientDocumentDeletionRequests() {
  const stored = readArray<ClientDocumentDeletionRequest>(
    DOCUMENT_DELETION_REQUESTS_KEY,
  );
  return mergeById(SEED_DOCUMENT_DELETION_REQUESTS, stored).sort((a, b) =>
    b.requestedAt.localeCompare(a.requestedAt),
  );
}

export function addClientDocumentDeletionRequest(
  request: ClientDocumentDeletionRequest,
) {
  const stored = readArray<ClientDocumentDeletionRequest>(
    DOCUMENT_DELETION_REQUESTS_KEY,
  );
  persist(DOCUMENT_DELETION_REQUESTS_KEY, [
    request,
    ...stored.filter(
      (item) => item.id !== request.id && item.documentId !== request.documentId,
    ),
  ]);
}

export function resolveClientDocumentDeletionRequest(
  id: string,
  decision: "approved" | "denied",
  resolvedBy: string,
) {
  const all = getClientDocumentDeletionRequests();
  const request = all.find((item) => item.id === id);
  if (!request) return null;

  const resolved: ClientDocumentDeletionRequest = {
    ...request,
    status: decision,
    resolvedBy,
    resolvedAt: new Date().toISOString(),
  };
  const stored = readArray<ClientDocumentDeletionRequest>(
    DOCUMENT_DELETION_REQUESTS_KEY,
  );
  persist(DOCUMENT_DELETION_REQUESTS_KEY, [
    resolved,
    ...stored.filter((item) => item.id !== id),
  ]);

  if (decision === "approved") {
    removeMatterDocument(request.documentId);
  }

  return resolved;
}

export function getMatterRequests() {
  return mergeById(SEED_REQUESTS, readArray<MatterRequest>(REQUESTS_KEY));
}

export function addMatterRequest(request: MatterRequest) {
  const stored = readArray<MatterRequest>(REQUESTS_KEY);
  persist(REQUESTS_KEY, [
    request,
    ...stored.filter((item) => item.id !== request.id),
  ]);
}

export function fulfillMatterRequest(
  id: string,
  fulfillment: MatterRequestFulfillment,
) {
  const request = getMatterRequests().find((item) => item.id === id);
  if (!request) return null;

  const completed: MatterRequest = {
    ...request,
    status: "completed",
    fulfillment,
  };
  const stored = readArray<MatterRequest>(REQUESTS_KEY);
  persist(REQUESTS_KEY, [
    completed,
    ...stored.filter((item) => item.id !== id),
  ]);
  return completed;
}

export function getMatterMessages() {
  return mergeById(SEED_MESSAGES, readArray<MatterMessage>(MESSAGES_KEY)).sort(
    (a, b) => a.sentAt.localeCompare(b.sentAt),
  );
}

export function addMatterMessage(message: MatterMessage) {
  const stored = readArray<MatterMessage>(MESSAGES_KEY);
  persist(MESSAGES_KEY, [
    message,
    ...stored.filter((item) => item.id !== message.id),
  ]);
}
