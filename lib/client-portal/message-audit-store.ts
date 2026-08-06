/**
 * Portal message soft-delete with required audit logging.
 * Hard deletes without a prior "deleted" audit entry are rejected.
 */

export const PORTAL_MESSAGES_KEY = "counselflow-portal-messages";
export const MESSAGE_AUDIT_KEY = "counselflow-message-audit-log";
export const PORTAL_MESSAGES_EVENT = "client-portal-messages-updated";

export interface PortalStoredMessage {
  id: string;
  subject: string;
  body: string;
  topic: string | null;
  senderName: string;
  recipientNames: string[];
  matterTitles: string[];
  createdAt: string;
  deletedAt: string | null;
  deletedByName: string | null;
  deletionReason: string | null;
}

export interface MessageAuditEntry {
  id: string;
  messageId: string;
  action: "created" | "deleted" | "restored";
  actorName: string;
  reason: string | null;
  createdAt: string;
}

function readMessages(): PortalStoredMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(localStorage.getItem(PORTAL_MESSAGES_KEY) ?? "[]");
    return Array.isArray(stored) ? (stored as PortalStoredMessage[]) : [];
  } catch {
    return [];
  }
}

function writeMessages(messages: PortalStoredMessage[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PORTAL_MESSAGES_KEY, JSON.stringify(messages));
  window.dispatchEvent(new CustomEvent(PORTAL_MESSAGES_EVENT));
}

function readAuditLog(): MessageAuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(localStorage.getItem(MESSAGE_AUDIT_KEY) ?? "[]");
    return Array.isArray(stored) ? (stored as MessageAuditEntry[]) : [];
  } catch {
    return [];
  }
}

function writeAuditLog(entries: MessageAuditEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MESSAGE_AUDIT_KEY, JSON.stringify(entries));
}

function appendAudit(entry: Omit<MessageAuditEntry, "id" | "createdAt">) {
  const full: MessageAuditEntry = {
    ...entry,
    id: `msg-audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  writeAuditLog([full, ...readAuditLog()]);
  return full;
}

export function getActivePortalMessages(): PortalStoredMessage[] {
  return readMessages().filter((message) => !message.deletedAt);
}

export function getMessageAuditLog(): MessageAuditEntry[] {
  return readAuditLog();
}

export function savePortalMessage(input: {
  subject: string;
  body: string;
  topic?: string | null;
  senderName: string;
  recipientNames: string[];
  matterTitles: string[];
}): PortalStoredMessage {
  const message: PortalStoredMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    subject: input.subject.trim(),
    body: input.body.trim(),
    topic: input.topic ?? null,
    senderName: input.senderName,
    recipientNames: input.recipientNames,
    matterTitles: input.matterTitles,
    createdAt: new Date().toISOString(),
    deletedAt: null,
    deletedByName: null,
    deletionReason: null,
  };

  writeMessages([message, ...readMessages()]);
  appendAudit({
    messageId: message.id,
    action: "created",
    actorName: input.senderName,
    reason: null,
  });

  return message;
}

/**
 * Soft-deletes a message only after writing an audit log entry with a reason.
 */
export function deletePortalMessageWithLog(input: {
  messageId: string;
  deletedByName: string;
  reason: string;
}): { ok: true } | { ok: false; error: string } {
  const reason = input.reason.trim();
  if (!reason) {
    return {
      ok: false,
      error: "A deletion reason is required before a message can be removed.",
    };
  }

  const messages = readMessages();
  const target = messages.find((message) => message.id === input.messageId);
  if (!target) {
    return { ok: false, error: "Message not found." };
  }
  if (target.deletedAt) {
    return { ok: false, error: "Message was already deleted." };
  }

  appendAudit({
    messageId: input.messageId,
    action: "deleted",
    actorName: input.deletedByName,
    reason,
  });

  writeMessages(
    messages.map((message) =>
      message.id === input.messageId
        ? {
            ...message,
            deletedAt: new Date().toISOString(),
            deletedByName: input.deletedByName,
            deletionReason: reason,
          }
        : message,
    ),
  );

  return { ok: true };
}

/**
 * Hard-delete guard used by any code path that would remove a message record.
 * Requires a prior "deleted" audit entry for the message.
 */
export function assertMessageDeleteLogged(messageId: string): void {
  const logged = readAuditLog().some(
    (entry) => entry.messageId === messageId && entry.action === "deleted",
  );
  if (!logged) {
    throw new Error(
      "Messages cannot be deleted without logging. Record a deletion audit entry first.",
    );
  }
}
