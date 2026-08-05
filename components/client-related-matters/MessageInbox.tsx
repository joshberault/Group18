"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  ChevronRight,
  Inbox,
  MessageSquare,
  Paperclip,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ResolvedMatter } from "@/lib/client-related-matters/data";
import {
  CRM_MESSAGES_UPDATE_EVENT,
  getClientRelatedMessages,
  markClientMessageRead,
  type ClientRelatedMessage,
} from "@/lib/client-related-matters/messages-store";
import { cn } from "@/lib/utils/cn";

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function MessageInbox({
  matters,
  onNewMessage,
}: {
  matters: ResolvedMatter[];
  onNewMessage: () => void;
}) {
  const [messages, setMessages] = useState<ClientRelatedMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const matterKey = matters.map((matter) => matter.id).join("|");

  const refresh = useCallback(() => {
    const allowed = new Set(matterKey ? matterKey.split("|") : []);
    setMessages(
      getClientRelatedMessages().filter(
        (message) =>
          message.direction === "incoming" &&
          message.senderRole === "client" &&
          message.matterIds.some((id) => allowed.has(id)),
      ),
    );
  }, [matterKey]);

  useEffect(() => {
    refresh();
    window.addEventListener(CRM_MESSAGES_UPDATE_EVENT, refresh);
    return () =>
      window.removeEventListener(CRM_MESSAGES_UPDATE_EVENT, refresh);
  }, [refresh]);

  const selected =
    messages.find((message) => message.id === selectedId) ?? null;

  function openMessage(message: ClientRelatedMessage) {
    setSelectedId(message.id);
    markClientMessageRead(message.id);
    refresh();
  }

  if (selected) {
    const relatedMatters = matters.filter((matter) =>
      selected.matterIds.includes(matter.id),
    );

    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-900/5 text-navy-900">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-navy-900">
                {selected.senderName}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Client · {formatMessageTime(selected.sentAt)}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
            Back to inbox
          </Button>
        </div>

        <h3 className="mt-6 text-xl font-semibold text-navy-900">
          {selected.subject}
        </h3>
        <p className="mt-2 text-sm text-muted">
          Related matter{relatedMatters.length === 1 ? "" : "s"}:{" "}
          {relatedMatters.map((matter) => matter.matterName).join(", ")}
        </p>
        <p className="mt-6 whitespace-pre-wrap text-sm leading-6 text-navy-900">
          {selected.body}
        </p>
        {selected.attachmentName && (
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm text-navy-900">
            <Paperclip className="h-4 w-4" />
            {selected.attachmentName}
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <Button onClick={onNewMessage}>
            <MessageSquare className="h-4 w-4" />
            Send a new message
          </Button>
        </div>
      </div>
    );
  }

  const unreadCount = messages.filter((message) => !message.readAt).length;

  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-navy-900">
            Client messages
          </h2>
          <p className="mt-1 text-sm text-muted">
            Messages clients sent to the Billing Department.
          </p>
        </div>
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-gold-500">
          <Inbox className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -right-2 -top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-red-100 px-1.5 text-xs font-bold text-red-700 ring-2 ring-white">
              {unreadCount}
            </span>
          )}
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-surface px-5 py-10 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-green-700">
            <Check className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-semibold text-navy-900">
            No client messages
          </p>
          <p className="mt-1 text-sm text-muted">
            No messages match the selected client.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {messages.map((message) => {
            const related = matters
              .filter((matter) => message.matterIds.includes(matter.id))
              .map((matter) => matter.matterName)
              .join(", ");

            return (
              <li key={message.id}>
                <button
                  type="button"
                  onClick={() => openMessage(message)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-2xl border px-4 py-4 text-left shadow-sm transition-colors hover:border-navy-700/40",
                    message.readAt
                      ? "border-gray-200 bg-white"
                      : "border-gold-500/40 bg-gold-100/30",
                  )}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-900/5 text-navy-900">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-navy-900">
                        {message.senderName}
                      </p>
                      {!message.readAt && (
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-red-400" />
                      )}
                    </div>
                    <p className="mt-1 text-sm font-medium text-navy-900">
                      {message.subject}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">
                      {message.body}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      <span>{formatMessageTime(message.sentAt)}</span>
                      <span>{related}</span>
                    </div>
                  </div>
                  <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-muted" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
