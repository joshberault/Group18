"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  FileText,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { useCaseSelection } from "@/components/client-portal/CaseSelectionProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { caseInformation } from "@/lib/mock-data/client-portal";
import { cn } from "@/lib/utils/cn";

type Step = "recipients" | "cases" | "topic" | "compose" | "sent";

interface RecipientOption {
  value: string;
  label: string;
  role: "attorney" | "paralegal" | "billing";
}

const BILLING_RECIPIENT: RecipientOption = {
  value: "billing",
  label: "Billing Department",
  role: "billing",
};

const BASE_TOPICS = [
  "General case questions",
  "Request documentation",
  "New case updates",
  "Settlement discussion",
  "Other",
];

const MESSAGE_STEPS: Array<Exclude<Step, "sent">> = [
  "recipients",
  "cases",
  "topic",
  "compose",
];

export function Messaging() {
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const { selectedCases: portalCases, isAllCases } = useCaseSelection();
  const caseTeam: RecipientOption[] = [
    ...caseInformation.attorneys.map((attorney) => ({
      value: attorney.id,
      label: `${attorney.name} â€” ${attorney.title}`,
      role: "attorney" as const,
    })),
    ...caseInformation.paralegals.map((paralegal) => ({
      value: paralegal.id,
      label: `${paralegal.name} â€” ${paralegal.title}`,
      role: "paralegal" as const,
    })),
  ];
  const allRecipients = [...caseTeam, BILLING_RECIPIENT];
  const clientCases = portalCases;

  const [step, setStep] = useState<Step>("recipients");
  const [recipients, setRecipients] = useState([""]);
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>(
    isAllCases ? [] : portalCases.map((item) => item.id),
  );
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedCaseIds((current) => {
      const allowed = new Set(portalCases.map((item) => item.id));
      const next = current.filter((id) => allowed.has(id));
      if (!isAllCases && next.length === 0) {
        return portalCases.map((item) => item.id);
      }
      return next;
    });
  }, [portalCases, isAllCases]);

  const selectedRecipientOptions = recipients
    .map((value) => allRecipients.find((option) => option.value === value))
    .filter((option): option is RecipientOption => Boolean(option));

  const relatedCases = clientCases.filter((engagedCase) =>
    selectedCaseIds.includes(engagedCase.id),
  );

  const hasParalegal = selectedRecipientOptions.some(
    (recipient) => recipient.role === "paralegal",
  );
  const hasBilling = selectedRecipientOptions.some(
    (recipient) => recipient.role === "billing",
  );
  const availableTopics = [
    ...(hasParalegal ? ["Appointments and scheduling"] : []),
    ...(hasBilling ? ["Billing questions"] : []),
    ...BASE_TOPICS,
  ];

  function recipientOptions(index: number) {
    const selectedElsewhere = new Set(
      recipients.filter((value, recipientIndex) => recipientIndex !== index && value),
    );
    const source = index === 0 ? allRecipients : caseTeam;

    return [
      { value: "", label: "Select a recipient" },
      ...source
        .filter((option) => !selectedElsewhere.has(option.value))
        .map((option) => ({ value: option.value, label: option.label })),
    ];
  }

  function updateRecipient(index: number, value: string) {
    setRecipients((current) =>
      current.map((recipient, recipientIndex) =>
        recipientIndex === index ? value : recipient,
      ),
    );
    setError(null);
  }

  function toggleCase(caseId: string) {
    setSelectedCaseIds((current) =>
      current.includes(caseId)
        ? current.filter((id) => id !== caseId)
        : [...current, caseId],
    );
    setError(null);
  }

  function continueFromRecipients() {
    if (recipients.some((recipient) => !recipient)) {
      setError("Select a recipient in each field before continuing.");
      return;
    }
    setError(null);
    setStep("cases");
  }

  function continueFromCases() {
    if (selectedCaseIds.length === 0) {
      setError("Select at least one matter this message relates to.");
      return;
    }
    setError(null);
    setStep("topic");
  }

  function continueFromTopic() {
    if (!topic) {
      setError("Select what your message is regarding.");
      return;
    }
    setSubject(topic);
    setError(null);
    setStep("compose");
  }

  function reviewAndSend(event: React.FormEvent) {
    event.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setError("Add a subject and message before sending.");
      return;
    }
    if (selectedCaseIds.length === 0) {
      setError("Select at least one related matter before sending.");
      return;
    }
    setError(null);
    setStep("sent");
  }

  function startAnotherMessage() {
    setRecipients([""]);
    setSelectedCaseIds([]);
    setTopic("");
    setSubject("");
    setMessage("");
    setAttachment(null);
    setError(null);
    setStep("recipients");
  }

  if (step === "sent") {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm sm:px-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
          <Check className="h-7 w-7" />
        </div>
        <h2 className="mt-5 text-2xl font-semibold text-navy-900">
          Your message was sent
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Your case team will receive your message and respond through the
          client portal.
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm text-navy-900">
          Related matter
          {relatedCases.length === 1 ? "" : "s"}:{" "}
          {relatedCases.map((engagedCase) => engagedCase.title).join(", ")}
        </p>
        <Button className="mt-6" onClick={startAnotherMessage}>
          Create another message
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-7 flex items-center justify-center gap-2" aria-label="Message progress">
        {MESSAGE_STEPS.map((item, index) => {
          const currentIndex = MESSAGE_STEPS.indexOf(step as Exclude<Step, "sent">);
          return (
            <div key={item} className="flex items-center">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold",
                  index <= currentIndex
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
                    index < currentIndex ? "bg-navy-900" : "bg-gray-200",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        {step === "recipients" && (
          <>
            <div className="mb-7 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold-100 text-navy-900">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-semibold text-navy-900">
                To whom should we send the message?
              </h2>
              <p className="mt-2 text-sm text-muted">
                Choose people assigned to your cases, or contact the Billing
                Department.
              </p>
            </div>

            <div className="space-y-4">
              {recipients.map((recipient, index) => (
                <div key={index} className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <Select
                      label={index === 0 ? "Recipient" : `Additional recipient ${index}`}
                      options={recipientOptions(index)}
                      value={recipient}
                      onChange={(event) => updateRecipient(index, event.target.value)}
                    />
                  </div>
                  {index > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mb-1 text-red-700"
                      onClick={() =>
                        setRecipients((current) =>
                          current.filter((_, recipientIndex) => recipientIndex !== index),
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

            {recipients.length < caseTeam.length + 1 && (
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

            <div className="mt-8 flex justify-end">
              <Button onClick={continueFromRecipients}>Continue</Button>
            </div>
          </>
        )}

        {step === "cases" && (
          <>
            <div className="mb-7 text-center">
              <h2 className="text-2xl font-semibold text-navy-900">
                Which matter does this message relate to?
              </h2>
              <p className="mt-2 text-sm text-muted">
                Select one or more of your matters. You can choose multiple
                matters if the message applies to more than one.
              </p>
            </div>

            <fieldset className="space-y-3">
              <legend className="sr-only">Related matters</legend>
              {clientCases.map((engagedCase) => {
                const checked = selectedCaseIds.includes(engagedCase.id);

                return (
                  <label
                    key={engagedCase.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-4 transition-colors",
                      checked
                        ? "border-navy-900 bg-navy-900/5"
                        : "border-gray-200 hover:border-navy-700/40",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCase(engagedCase.id)}
                      className="mt-0.5 h-4 w-4 accent-navy-900"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-navy-900">
                        {engagedCase.title}
                      </span>
                      <span className="mt-1 block text-sm text-muted">
                        {engagedCase.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </fieldset>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            <div className="mt-8 flex justify-between gap-3">
              <Button variant="ghost" onClick={() => setStep("recipients")}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={continueFromCases}>Continue</Button>
            </div>
          </>
        )}

        {step === "topic" && (
          <>
            <div className="mb-7 text-center">
              <h2 className="text-2xl font-semibold text-navy-900">
                Next, tell us what your message is regarding
              </h2>
              <p className="mt-2 text-sm text-muted">
                This helps route your message to the right person.
              </p>
            </div>

            <fieldset className="space-y-3">
              <legend className="sr-only">Message topic</legend>
              {availableTopics.map((option) => (
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
                    name="message-topic"
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
              <Button variant="ghost" onClick={() => setStep("cases")}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={continueFromTopic}>Continue</Button>
            </div>
          </>
        )}

        {step === "compose" && (
          <form onSubmit={reviewAndSend}>
            <div className="mb-7 text-center">
              <h2 className="text-2xl font-semibold text-navy-900">
                New Message
              </h2>
              <p className="mt-2 text-sm text-muted">
                To: {selectedRecipientOptions.map((recipient) => recipient.label).join(", ")}
              </p>
              <p className="mt-1 text-sm text-muted">
                Related matter
                {relatedCases.length === 1 ? "" : "s"}:{" "}
                {relatedCases.map((engagedCase) => engagedCase.title).join(", ")}
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
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value);
                  setError(null);
                }}
                placeholder="Type your message here"
              />

              <div>
                <p className="mb-2 text-sm font-medium text-navy-900">
                  Attachment
                </p>
                <input
                  ref={attachmentInputRef}
                  type="file"
                  className="hidden"
                  onChange={(event) => setAttachment(event.target.files?.[0] ?? null)}
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
                      onClick={() => setAttachment(null)}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => attachmentInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4" />
                    Add an attachment
                  </Button>
                )}
              </div>
            </div>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            <div className="mt-8 flex flex-col-reverse justify-between gap-3 sm:flex-row">
              <Button type="button" variant="ghost" onClick={() => setStep("topic")}>
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
      </div>
    </div>
  );
}
