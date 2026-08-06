"use client";

import { useEffect, useRef, useState } from "react";
import {
  Briefcase,
  FileSignature,
  Layers,
  Paperclip,
  Ticket,
  Upload,
  Users,
} from "lucide-react";
import { CaseImportantDatesCalendar } from "@/components/client-portal/CaseImportantDatesCalendar";
import { useCaseSelection } from "@/components/client-portal/CaseSelectionProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CASE_TYPE_LABELS } from "@/lib/client-portal/case-task-lists";
import { recordClientBadgeEvent } from "@/lib/client-portal/badges";
import { caseInformation as initialCaseInformation } from "@/lib/mock-data/client-portal";
import { formatCurrency, cn } from "@/lib/utils/cn";

type CaseContract = {
  id: string;
  name: string;
  signedAt: string;
  signedBy: string;
} | null;

export function CaseInformation() {
  useEffect(() => {
    recordClientBadgeEvent("case_info_viewed");
    recordClientBadgeEvent("engagement_reviewed");
  }, []);
  const { selectedCases, isMultipleCases, matchesCase } = useCaseSelection();
  const contractInputRef = useRef<HTMLInputElement>(null);
  const [contract, setContract] = useState<CaseContract>(
    initialCaseInformation.contract,
  );
  const [contractMessage, setContractMessage] = useState<string | null>(null);

  const primaryCase = selectedCases[0];
  const matter = primaryCase
    ? {
        caseNumber: isMultipleCases
          ? selectedCases.map((item) => item.caseNumber).join(", ")
          : primaryCase.caseNumber,
        title: isMultipleCases
          ? `${selectedCases.length} active matters`
          : primaryCase.title,
        practiceArea: isMultipleCases
          ? "Multiple practice areas"
          : CASE_TYPE_LABELS[primaryCase.caseType],
        openDate: isMultipleCases
          ? selectedCases.map((item) => item.openDate).join(", ")
          : primaryCase.openDate,
        status: primaryCase.status,
      }
    : null;

  const visibleTickets = initialCaseInformation.associatedTickets.filter(
    (ticket) => matchesCase(ticket.caseNumber),
  );

  function handleContractAttach(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    setContract({
      id: `contract-${Date.now()}`,
      name: file.name,
      signedAt: new Date().toISOString().slice(0, 10),
      signedBy: "Jordan Hale",
    });
    setContractMessage(`Contract attached: ${file.name}`);
    if (contractInputRef.current) contractInputRef.current.value = "";
  }

  if (!matter) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Case Information</CardTitle>
          <CardDescription>
            No active matters are linked to this client account.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-gold-500/30 bg-gradient-to-r from-navy-900 to-navy-800 text-white">
        <div className="flex flex-col gap-4 p-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-gold-500">
              {isMultipleCases ? "Matter names" : "Matter name"}
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {isMultipleCases
                ? selectedCases.map((item) => item.title).join(", ")
                : selectedCases[0]?.title}
            </p>
            <p className="mt-2 text-sm text-gray-200">{matter.title}</p>
            <p className="mt-1 text-xs text-gray-400">
              {matter.practiceArea} · Opened {matter.openDate}
            </p>
          </div>
          {!isMultipleCases && <StatusBadge status={matter.status} />}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Case type(s)</CardTitle>
              <CardDescription>
                {isMultipleCases
                  ? "Types of cases for the selected matters."
                  : "Case type for the selected matter."}
              </CardDescription>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-gold-500">
              <Layers className="h-5 w-5" />
            </div>
          </div>
        </CardHeader>

        <ul className="space-y-3">
          {selectedCases.map((engagedCase) => (
            <li
              key={engagedCase.id}
              className="rounded-xl border border-gray-200 px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-navy-900">
                    {CASE_TYPE_LABELS[engagedCase.caseType]}
                  </p>
                  <p className="mt-1 text-sm text-navy-900">{engagedCase.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    Opened {engagedCase.openDate}
                  </p>
                </div>
                <StatusBadge status={engagedCase.status} />
              </div>
              <p className="mt-2 text-sm text-muted">{engagedCase.description}</p>
            </li>
          ))}
        </ul>
      </Card>

      <CaseImportantDatesCalendar />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Signed contract</CardTitle>
                <CardDescription>
                  Engagement agreement between the law firm and the client.
                </CardDescription>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-gold-500">
                <FileSignature className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>

          {contract ? (
            <div className="rounded-xl border border-gray-200 bg-surface px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-900/5 text-navy-900">
                  <Paperclip className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-navy-900">
                    {contract.name}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Signed by {contract.signedBy} on {contract.signedAt}
                  </p>
                  <div className="mt-3">
                    <Badge variant="success">Signed contract on file</Badge>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => contractInputRef.current?.click()}
                >
                  Replace contract
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => contractInputRef.current?.click()}
              className={cn(
                "flex min-h-40 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-surface px-6 py-8 text-center transition-colors hover:border-navy-700 hover:bg-white",
              )}
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-900 text-gold-500">
                <Upload className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-navy-900">
                Attach contract here
              </p>
              <p className="mt-1 text-sm text-muted">
                Upload the signed agreement between the firm and client
              </p>
            </button>
          )}

          <input
            ref={contractInputRef}
            type="file"
            accept=".pdf,.doc,.docx,image/*"
            className="hidden"
            onChange={(event) => handleContractAttach(event.target.files)}
          />

          {contractMessage && (
            <p className="mt-4 rounded-lg bg-gold-100 px-3 py-2 text-sm text-navy-900">
              {contractMessage}
            </p>
          )}
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Assigned team</CardTitle>
                <CardDescription>
                  Attorneys and paralegals working on this case.
                </CardDescription>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-gold-500">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>

          <div className="space-y-5">
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
                Attorney(s)
              </p>
              <ul className="space-y-3">
                {initialCaseInformation.attorneys.map((attorney) => (
                  <li
                    key={attorney.id}
                    className="rounded-xl border border-gray-200 px-3 py-3"
                  >
                    <p className="text-sm font-medium text-navy-900">
                      {attorney.name}
                    </p>
                    <p className="mt-1 text-xs text-muted">{attorney.title}</p>
                    <p className="mt-1 text-xs text-navy-900">{attorney.email}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
                Paralegal(s)
              </p>
              <ul className="space-y-3">
                {initialCaseInformation.paralegals.map((paralegal) => (
                  <li
                    key={paralegal.id}
                    className="rounded-xl border border-gray-200 px-3 py-3"
                  >
                    <p className="text-sm font-medium text-navy-900">
                      {paralegal.name}
                    </p>
                    <p className="mt-1 text-xs text-muted">{paralegal.title}</p>
                    <p className="mt-1 text-xs text-navy-900">{paralegal.email}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Associated tickets</CardTitle>
              <CardDescription>
                Citations or tickets tied to this case, such as a speeding
                ticket.
              </CardDescription>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-gold-500">
              <Ticket className="h-5 w-5" />
            </div>
          </div>
        </CardHeader>

        {visibleTickets.length === 0 ? (
          <p className="text-sm text-muted">
            No associated tickets for the selected matter view.
          </p>
        ) : (
          <ul className="space-y-4">
            {visibleTickets.map((ticket) => (
              <li
                key={ticket.id}
                className="rounded-xl border border-gray-200 px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-900/5 text-navy-900">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy-900">
                        {ticket.type}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Ticket #{ticket.ticketNumber} · Issued by{" "}
                        {ticket.issuedBy}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={ticket.status} />
                </div>

                <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                      Issue date
                    </dt>
                    <dd className="mt-1 text-sm text-navy-900">
                      {ticket.issueDate}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                      Location
                    </dt>
                    <dd className="mt-1 text-sm text-navy-900">
                      {ticket.location}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                      Amount
                    </dt>
                    <dd className="mt-1 text-sm text-navy-900">
                      {formatCurrency(ticket.amount)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                      Description
                    </dt>
                    <dd className="mt-1 text-sm text-navy-900">
                      {ticket.description}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
