export const CRM_MESSAGES_STORAGE_KEY = "counselflow-crm-messages";
export const CRM_MESSAGES_UPDATE_EVENT = "crm-messages-updated";

export type MessageParticipantRole =
  | "client"
  | "attorney"
  | "paralegal"
  | "billing";

export type ClientRelatedMessage = {
  id: string;
  direction: "incoming" | "outgoing";
  senderId: string;
  senderName: string;
  senderRole: MessageParticipantRole;
  recipients: Array<{
    id: string;
    name: string;
    role: MessageParticipantRole;
  }>;
  matterIds: string[];
  subject: string;
  body: string;
  sentAt: string;
  readAt: string | null;
  attachmentName?: string;
};

const SEED_CLIENT_MESSAGES: ClientRelatedMessage[] = [
  {
    id: "crm-message-client-1",
    direction: "incoming",
    senderId: "gc-1",
    senderName: "Northline Capital",
    senderRole: "client",
    recipients: [],
    matterIds: ["crm-1"],
    subject: "Question about the latest invoice",
    body: "Could you confirm whether the latest invoice includes the filing fees discussed on our last call?",
    sentAt: "2026-08-05T14:20:00.000Z",
    readAt: null,
  },
  {
    id: "crm-message-client-2",
    direction: "incoming",
    senderId: "gc-3",
    senderName: "Ridgecrest Properties",
    senderRole: "client",
    recipients: [],
    matterIds: ["crm-4"],
    subject: "Payment confirmation",
    body: "We submitted payment for the Commercial Lease Portfolio invoice today. Please let us know when it posts.",
    sentAt: "2026-08-04T17:45:00.000Z",
    readAt: null,
  },
  {
    id: "crm-message-client-3",
    direction: "incoming",
    senderId: "gc-2",
    senderName: "Harborview Medical",
    senderRole: "client",
    recipients: [],
    matterIds: ["crm-3"],
    subject: "Request to discuss payment timing",
    body: "Can someone contact our accounts-payable team about adjusting the timing of the next installment?",
    sentAt: "2026-08-02T15:05:00.000Z",
    readAt: "2026-08-02T16:10:00.000Z",
  },
];

function readStoredMessages(): ClientRelatedMessage[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(CRM_MESSAGES_STORAGE_KEY) ?? "[]",
    );
    return Array.isArray(parsed) ? (parsed as ClientRelatedMessage[]) : [];
  } catch {
    return [];
  }
}

export function getClientRelatedMessages(): ClientRelatedMessage[] {
  const stored = readStoredMessages();
  const overrides = new Map(stored.map((message) => [message.id, message]));
  const seedIds = new Set(SEED_CLIENT_MESSAGES.map((message) => message.id));

  return [
    ...SEED_CLIENT_MESSAGES.map(
      (message) => overrides.get(message.id) ?? message,
    ),
    ...stored.filter((message) => !seedIds.has(message.id)),
  ].sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

function persistMessage(message: ClientRelatedMessage) {
  if (typeof window === "undefined") return;

  const next = [
    message,
    ...readStoredMessages().filter((item) => item.id !== message.id),
  ];
  window.localStorage.setItem(
    CRM_MESSAGES_STORAGE_KEY,
    JSON.stringify(next),
  );
  window.dispatchEvent(new CustomEvent(CRM_MESSAGES_UPDATE_EVENT));
}

export function addOutgoingMessage(
  input: Omit<
    ClientRelatedMessage,
    "id" | "direction" | "senderId" | "senderName" | "senderRole" | "sentAt" | "readAt"
  >,
) {
  const now = new Date();
  persistMessage({
    ...input,
    id: `crm-message-billing-${now.getTime()}`,
    direction: "outgoing",
    senderId: "billing-department",
    senderName: "Billing Department",
    senderRole: "billing",
    sentAt: now.toISOString(),
    readAt: now.toISOString(),
  });
}

export function markClientMessageRead(id: string) {
  const message = getClientRelatedMessages().find((item) => item.id === id);
  if (!message || message.readAt) return;
  persistMessage({ ...message, readAt: new Date().toISOString() });
}
