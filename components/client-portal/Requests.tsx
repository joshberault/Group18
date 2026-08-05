"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Check,
  ClipboardList,
  CreditCard,
  FileText,
  Inbox,
  Paperclip,
  Plus,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Textarea } from "@/components/ui/Textarea";
import { caseInformation, clientRequests } from "@/lib/mock-data/client-portal";
import { cn } from "@/lib/utils/cn";

type RequestOptionId =
  | "appointment"
  | "payment-schedule"
  | "documentation";

type Step =
  | "home"
  | "options"
  | "form"
  | "submitted"
  | "fulfill-list"
  | "fulfill-form"
  | "fulfilled";

interface RecipientOption {
  value: string;
  label: string;
}

interface SubmittedRequest {
  id: string;
  type: string;
  description: string;
  recipients: string[];
  status: "pending" | "in_progress" | "completed";
  submittedAt: string;
}

interface IncomingRequest {
  id: string;
  from: string;
  role: "Attorney" | "Paralegal" | "Billing Department";
  title: string;
  description: string;
  requestedAt: string;
  documentationRequired: boolean;
}

const REQUEST_OPTIONS = [
  {
    id: "appointment" as const,
    title: "Request an appointment with an attorney",
    description:
      "Ask a paralegal to schedule a meeting with your attorney.",
    icon: Calendar,
  },
  {
    id: "payment-schedule" as const,
    title: "Request to change payment schedules and due dates",
    description:
      "Contact the Billing Department about payment timing changes.",
    icon: CreditCard,
  },
  {
    id: "documentation" as const,
    title: "Request documentation and information from your legal team",
    description:
      "Ask one or more attorneys or paralegals for case documents or information.",
    icon: FileText,
  },
];

const BILLING_RECIPIENT: RecipientOption = {
  value: "billing",
  label: "Billing Department",
};

const INCOMING_REQUESTS: IncomingRequest[] = [
  {
    id: "incoming-1",
    from: "A. Counsel",
    role: "Attorney",
    title: "Upload current auto insurance card",
    description:
      "Please attach the front and back of your current auto insurance card for the traffic-citation case file.",
    requestedAt: "2026-08-05",
    documentationRequired: true,
  },
  {
    id: "incoming-2",
    from: "M. Rivera",
    role: "Paralegal",
    title: "Confirm availability for attorney meeting",
    description:
      "Provide your availability for a 30-minute case preparation call next week.",
    requestedAt: "2026-08-04",
    documentationRequired: false,
  },
  {
    id: "incoming-3",
    from: "Billing Department",
    role: "Billing Department",
    title: "Provide updated payment information",
    description:
      "Please provide any information needed to update the payment schedule for invoice INV-2841.",
    requestedAt: "2026-08-03",
    documentationRequired: false,
  },
];

export function Requests() {
  const fulfillmentInputRef = useRef<HTMLInputElement>(null);
  const paralegals: RecipientOption[] = caseInformation.paralegals.map(
    (paralegal) => ({
      value: paralegal.id,
      label: `${paralegal.name} — ${paralegal.title}`,
    }),
  );

  const attorneysAndParalegals: RecipientOption[] = [
    ...caseInformation.attorneys.map((attorney) => ({
      value: attorney.id,
      label: `${attorney.name} — ${attorney.title}`,
    })),
    ...paralegals,
  ];

  const [step, setStep] = useState<Step>("home");
  const [selectedOption, setSelectedOption] = useState<RequestOptionId | null>(
    null,
  );
  const [description, setDescription] = useState("");
  const [recipients, setRecipients] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);
  const [submittedRequests, setSubmittedRequests] = useState<SubmittedRequest[]>(
    clientRequests.map((request) => ({
      id: request.id,
      type: request.type,
      description: request.subject,
      recipients: ["Legal team"],
      status: request.status,
      submittedAt: request.submittedAt,
    })),
  );
  const [selectedIncomingRequest, setSelectedIncomingRequest] =
    useState<IncomingRequest | null>(null);
  const [fulfillmentDetails, setFulfillmentDetails] = useState("");
  const [fulfillmentFiles, setFulfillmentFiles] = useState<File[]>([]);
  const [fulfilledRequestIds, setFulfilledRequestIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    const requestedOption = new URLSearchParams(window.location.search).get(
      "request",
    );

    if (requestedOption === "payment-schedule") {
      setSelectedOption("payment-schedule");
      setDescription("");
      setRecipients([BILLING_RECIPIENT.value]);
      setError(null);
      setStep("form");
    }
  }, []);

  const selectedRequest = REQUEST_OPTIONS.find(
    (option) => option.id === selectedOption,
  );

  function availableRecipients(): RecipientOption[] {
    if (selectedOption === "appointment") return paralegals;
    if (selectedOption === "payment-schedule") return [BILLING_RECIPIENT];
    return attorneysAndParalegals;
  }

  function recipientSelectOptions(index: number) {
    const selectedElsewhere = new Set(
      recipients.filter(
        (value, recipientIndex) => recipientIndex !== index && value,
      ),
    );

    return [
      { value: "", label: "Select who to send this to" },
      ...availableRecipients()
        .filter((option) => !selectedElsewhere.has(option.value))
        .map((option) => ({ value: option.value, label: option.label })),
    ];
  }

  function openRequestForm(optionId: RequestOptionId) {
    setSelectedOption(optionId);
    setDescription("");
    setError(null);

    if (optionId === "payment-schedule") {
      setRecipients([BILLING_RECIPIENT.value]);
    } else {
      setRecipients([""]);
    }

    setStep("form");
  }

  function updateRecipient(index: number, value: string) {
    setRecipients((current) =>
      current.map((recipient, recipientIndex) =>
        recipientIndex === index ? value : recipient,
      ),
    );
    setError(null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!description.trim()) {
      setError("Describe your request before submitting.");
      return;
    }

    if (recipients.some((recipient) => !recipient)) {
      setError("Select who this request should be sent to.");
      return;
    }

    const recipientLabels = recipients.map(
      (value) =>
        availableRecipients().find((option) => option.value === value)?.label ??
        value,
    );

    setSubmittedRequests((current) => [
      {
        id: `req-${Date.now()}`,
        type: selectedRequest?.title ?? "Request",
        description: description.trim(),
        recipients: recipientLabels,
        status: "pending",
        submittedAt: new Date().toISOString().slice(0, 10),
      },
      ...current,
    ]);
    setStep("submitted");
  }

  function startAnotherRequest() {
    setSelectedOption(null);
    setDescription("");
    setRecipients([""]);
    setError(null);
    setStep("options");
  }

  function openIncomingRequest(request: IncomingRequest) {
    setSelectedIncomingRequest(request);
    setFulfillmentDetails("");
    setFulfillmentFiles([]);
    setError(null);
    setStep("fulfill-form");
  }

  function addFulfillmentFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setFulfillmentFiles((current) => {
      const existing = new Set(
        current.map((file) => `${file.name}-${file.size}`),
      );
      return [
        ...current,
        ...Array.from(fileList).filter(
          (file) => !existing.has(`${file.name}-${file.size}`),
        ),
      ];
    });
    setError(null);
    if (fulfillmentInputRef.current) {
      fulfillmentInputRef.current.value = "";
    }
  }

  function submitFulfillment(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedIncomingRequest) return;

    if (!fulfillmentDetails.trim()) {
      setError("Add the requested information before submitting.");
      return;
    }

    if (
      selectedIncomingRequest.documentationRequired &&
      fulfillmentFiles.length === 0
    ) {
      setError("Attach the requested documentation before submitting.");
      return;
    }

    setFulfilledRequestIds((current) => {
      const next = new Set(current);
      next.add(selectedIncomingRequest.id);
      return next;
    });
    setError(null);
    setStep("fulfilled");
  }

  function returnToRequestHome() {
    setSelectedOption(null);
    setSelectedIncomingRequest(null);
    setDescription("");
    setFulfillmentDetails("");
    setFulfillmentFiles([]);
    setError(null);
    setStep("home");
  }

  if (step === "home") {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold-100 text-navy-900">
              <ClipboardList className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-semibold text-navy-900">
              What would you like to do?
            </h2>
            <p className="mt-2 text-sm text-muted">
              Submit something to your legal team or respond to a request they
              sent you.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setStep("options")}
              className="flex flex-col items-start rounded-2xl border border-gray-200 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-navy-700/40 hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-gold-500">
                <Send className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-navy-900">
                Submit a request
              </h3>
              <p className="mt-1 text-sm text-muted">
                Request an appointment, billing change, documentation, or
                information.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setStep("fulfill-list")}
              className="relative flex flex-col items-start rounded-2xl border border-gray-200 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-navy-700/40 hover:shadow-md"
            >
              {INCOMING_REQUESTS.filter(
                (request) => !fulfilledRequestIds.has(request.id),
              ).length > 0 && (
                <span className="absolute right-4 top-4 flex h-7 min-w-7 items-center justify-center rounded-full bg-red-100 px-1.5 text-xs font-bold text-red-700">
                  {
                    INCOMING_REQUESTS.filter(
                      (request) => !fulfilledRequestIds.has(request.id),
                    ).length
                  }
                </span>
              )}
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-gold-500">
                <Inbox className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-navy-900">
                Fulfill a request
              </h3>
              <p className="mt-1 text-sm text-muted">
                Respond to requests from attorneys, paralegals, or Billing.
              </p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "fulfill-list") {
    const activeRequests = INCOMING_REQUESTS.filter(
      (request) => !fulfilledRequestIds.has(request.id),
    );

    return (
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={returnToRequestHome}
          className="mb-4 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-navy-900 transition-colors hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-navy-900">
              Requests to fulfill
            </h2>
            <p className="mt-2 text-sm text-muted">
              Open a request to provide documentation and any other requested
              information.
            </p>
          </div>

          {activeRequests.length === 0 ? (
            <div className="rounded-xl bg-surface px-5 py-10 text-center">
              <Check className="mx-auto h-7 w-7 text-green-700" />
              <p className="mt-3 text-sm font-semibold text-navy-900">
                All requests are fulfilled
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {activeRequests.map((request) => (
                <li key={request.id}>
                  <button
                    type="button"
                    onClick={() => openIncomingRequest(request)}
                    className="flex w-full items-start justify-between gap-4 rounded-xl border border-gray-200 px-4 py-4 text-left transition-colors hover:border-navy-700/40 hover:bg-surface"
                  >
                    <div>
                      <p className="text-sm font-semibold text-navy-900">
                        {request.title}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        From {request.from} · {request.role}
                      </p>
                      <p className="mt-2 text-xs text-muted">
                        Requested {request.requestedAt}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-navy-700">
                      Open →
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  if (step === "fulfill-form" && selectedIncomingRequest) {
    return (
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() => setStep("fulfill-list")}
          className="mb-4 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-navy-900 transition-colors hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to requests
        </button>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <p className="text-sm font-medium text-gold-500">
              From {selectedIncomingRequest.from} ·{" "}
              {selectedIncomingRequest.role}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-navy-900">
              {selectedIncomingRequest.title}
            </h2>
            <p className="mt-3 rounded-xl bg-surface px-4 py-3 text-sm text-navy-900">
              {selectedIncomingRequest.description}
            </p>
          </div>

          <form onSubmit={submitFulfillment} className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium text-navy-900">
                Attach documentation
                {selectedIncomingRequest.documentationRequired && (
                  <span className="text-red-600"> *</span>
                )}
              </p>
              <input
                ref={fulfillmentInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(event) => addFulfillmentFiles(event.target.files)}
              />
              <button
                type="button"
                onClick={() => fulfillmentInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-surface px-5 py-7 text-center transition-colors hover:border-navy-700 hover:bg-white"
              >
                <Upload className="h-6 w-6 text-navy-900" />
                <span className="mt-2 text-sm font-medium text-navy-900">
                  Choose files to attach
                </span>
              </button>

              {fulfillmentFiles.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {fulfillmentFiles.map((file, index) => (
                    <li
                      key={`${file.name}-${file.size}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Paperclip className="h-4 w-4 shrink-0 text-muted" />
                        <span className="truncate text-sm text-navy-900">
                          {file.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setFulfillmentFiles((current) =>
                            current.filter(
                              (_, fileIndex) => fileIndex !== index,
                            ),
                          )
                        }
                        className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-700"
                        aria-label={`Remove ${file.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Textarea
              label="Additional information"
              className="min-h-36"
              value={fulfillmentDetails}
              onChange={(event) => {
                setFulfillmentDetails(event.target.value);
                setError(null);
              }}
              placeholder="Provide the requested information or any helpful context"
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end">
              <Button type="submit">Submit fulfillment</Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (step === "fulfilled") {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm sm:px-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
          <Check className="h-7 w-7" />
        </div>
        <h2 className="mt-5 text-2xl font-semibold text-navy-900">
          Fulfillment sent
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Your attachments and response were sent to the requestor.
        </p>
        <Button className="mt-6" onClick={() => setStep("fulfill-list")}>
          View remaining requests
        </Button>
      </div>
    );
  }

  if (step === "submitted") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm sm:px-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
            <Check className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-navy-900">
            Your request was submitted
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Your legal team will review the request and follow up through the
            client portal.
          </p>
          <Button className="mt-6" onClick={startAnotherRequest}>
            Submit another request
          </Button>
        </div>

        <SubmittedRequestList requests={submittedRequests} />
      </div>
    );
  }

  if (step === "form" && selectedRequest) {
    const allowsMultiple = selectedOption === "documentation";
    const maxRecipients = availableRecipients().length;

    return (
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={startAnotherRequest}
          className="mb-4 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-navy-900 transition-colors hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to request options
        </button>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold-100 text-navy-900">
              <selectedRequest.icon className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-semibold text-navy-900">
              {selectedRequest.title}
            </h2>
            <p className="mt-2 text-sm text-muted">
              Describe your request and choose who should receive it.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Textarea
              label="Describe your request"
              className="min-h-36"
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                setError(null);
              }}
              placeholder="Explain what you need and any useful details"
            />

            <div className="space-y-3">
              {recipients.map((recipient, index) => (
                <div key={index} className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <Select
                      label={
                        index === 0
                          ? "Who should this be sent to?"
                          : `Additional recipient ${index}`
                      }
                      options={recipientSelectOptions(index)}
                      value={recipient}
                      onChange={(event) =>
                        updateRecipient(index, event.target.value)
                      }
                      disabled={selectedOption === "payment-schedule"}
                    />
                  </div>
                  {allowsMultiple && index > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mb-1 text-red-700"
                      onClick={() =>
                        setRecipients((current) =>
                          current.filter(
                            (_, recipientIndex) => recipientIndex !== index,
                          ),
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

            {allowsMultiple && recipients.length < maxRecipients && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRecipients((current) => [...current, ""])}
              >
                <Plus className="h-4 w-4" />
                Add another recipient
              </Button>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end pt-2">
              <Button type="submit">Submit request</Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button
        type="button"
        onClick={returnToRequestHome}
        className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-navy-900 transition-colors hover:bg-gray-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold-100 text-navy-900">
            <ClipboardList className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-semibold text-navy-900">
            What would you like to request?
          </h2>
          <p className="mt-2 text-sm text-muted">
            Choose one of the request types below to get started.
          </p>
        </div>

        <div className="space-y-3">
          {REQUEST_OPTIONS.map((option) => {
            const Icon = option.icon;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => openRequestForm(option.id)}
                className={cn(
                  "flex w-full items-start gap-4 rounded-xl border border-gray-200 px-4 py-4 text-left transition-colors hover:border-navy-700/40 hover:bg-surface",
                )}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-gold-500">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy-900">
                    {option.title}
                  </p>
                  <p className="mt-1 text-sm text-muted">{option.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <SubmittedRequestList requests={submittedRequests} />
    </div>
  );
}

function SubmittedRequestList({
  requests,
}: {
  requests: SubmittedRequest[];
}) {
  if (requests.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold text-navy-900">
        Submitted requests
      </h3>
      <ul className="mt-4 space-y-3">
        {requests.map((request) => (
          <li
            key={request.id}
            className="rounded-xl border border-gray-200 px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-navy-900">
                  {request.type}
                </p>
                <p className="mt-1 text-sm text-navy-900">
                  {request.description}
                </p>
                <p className="mt-2 text-xs text-muted">
                  To: {request.recipients.join(", ")} · Submitted{" "}
                  {request.submittedAt}
                </p>
              </div>
              <StatusBadge status={request.status} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
