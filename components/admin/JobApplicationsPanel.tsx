"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileUser } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Modal } from "@/components/ui/Modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { useAdminData } from "@/components/admin/AdminDataProvider";
import type {
  AdminJobApplication,
  JobApplicationStatus,
} from "@/lib/admin/types";

function applicationStatusBadge(status: JobApplicationStatus) {
  if (status === "pending") return <Badge variant="gold">Pending review</Badge>;
  if (status === "interview") return <Badge variant="warning">Interview</Badge>;
  if (status === "hired") return <Badge variant="success">Hired</Badge>;
  return <Badge variant="neutral">Rejected</Badge>;
}

/** Pending career applications / interviews for Firm Administrator review. */
export function JobApplicationsPanel({ className }: { className?: string }) {
  const { data, loading, error, refresh } = useAdminData();
  const [applications, setApplications] = useState<AdminJobApplication[]>([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState<
    string | null
  >(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (data) setApplications(data.jobApplications.map((row) => ({ ...row })));
  }, [data]);

  const openApplications = useMemo(
    () =>
      applications
        .filter((a) => a.status === "pending" || a.status === "interview")
        .sort(
          (a, b) =>
            new Date(a.submittedAt).getTime() -
            new Date(b.submittedAt).getTime(),
        ),
    [applications],
  );

  const selectedApplication = useMemo(
    () => applications.find((a) => a.id === selectedApplicationId) ?? null,
    [applications, selectedApplicationId],
  );

  function updateStatus(
    id: string,
    status: JobApplicationStatus,
    label: string,
  ) {
    setApplications((prev) =>
      prev.map((row) => (row.id === id ? { ...row, status } : row)),
    );
    setMessage(`${label} (local page state only).`);
    setSelectedApplicationId(null);
  }

  return (
    <div className={className}>
      {loading ? (
        <LoadingState message="Loading job applications..." />
      ) : error || !data ? (
        <Card className="border-red-200 bg-red-50" padding="lg">
          <CardHeader>
            <CardTitle className="text-red-800">
              Unable to load job applications
            </CardTitle>
            <CardDescription className="text-red-700">
              {error ?? "Live firm data could not be loaded."}
            </CardDescription>
          </CardHeader>
          <Button variant="secondary" onClick={() => void refresh()}>
            Retry
          </Button>
        </Card>
      ) : (
        <>
      {message && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
          <button
            type="button"
            className="ml-3 font-medium underline"
            onClick={() => setMessage(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <Card padding="md">
        <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileUser className="h-5 w-5 text-gold-500" aria-hidden />
              Pending Job Applications & Interviews
            </CardTitle>
            <CardDescription>
              People who applied to work at the firm. Review applications and
              advance candidates to interview.{" "}
              {openApplications.length} open application
              {openApplications.length === 1 ? "" : "s"}.
            </CardDescription>
          </div>
          <Badge variant="gold">
            {applications.filter((a) => a.status === "pending").length} awaiting
            first review
          </Badge>
        </CardHeader>

        {openApplications.length === 0 ? (
          <EmptyState
            title="No pending applications"
            description="New career applications will appear here for Firm Administrator review."
            moduleLabel="Dashboard · Hiring"
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Role applied for</TableHead>
                  <TableHead>Practice area</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Resume</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openApplications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <div className="font-medium text-navy-900">
                        {app.applicantName}
                      </div>
                      <div className="text-xs text-muted">{app.email}</div>
                    </TableCell>
                    <TableCell>{app.appliedRole}</TableCell>
                    <TableCell>{app.practiceArea}</TableCell>
                    <TableCell>{app.yearsExperience} yrs</TableCell>
                    <TableCell>
                      {new Date(app.submittedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {applicationStatusBadge(app.status)}
                    </TableCell>
                    <TableCell>
                      {app.resumeOnFile ? (
                        <Badge variant="success">On file</Badge>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-800">
                          <AlertTriangle className="h-3 w-3" aria-hidden />
                          Missing
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedApplicationId(app.id)}
                      >
                        Review application
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={!!selectedApplication}
        onClose={() => setSelectedApplicationId(null)}
        title={
          selectedApplication
            ? `Application — ${selectedApplication.applicantName}`
            : "Application"
        }
        description="Hiring decisions update local page state only."
        className="max-w-lg"
      >
        {selectedApplication && (
          <div className="space-y-4 text-sm">
            <dl className="space-y-2">
              {[
                ["Email", selectedApplication.email],
                ["Phone", selectedApplication.phone],
                ["Role applied for", selectedApplication.appliedRole],
                ["Practice area", selectedApplication.practiceArea],
                [
                  "Experience",
                  `${selectedApplication.yearsExperience} years`,
                ],
                [
                  "Submitted",
                  new Date(selectedApplication.submittedAt).toLocaleString(),
                ],
                [
                  "Resume",
                  selectedApplication.resumeOnFile
                    ? "On file"
                    : "Missing — request before interview",
                ],
                ["Notes", selectedApplication.notes],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex flex-col gap-0.5 border-b border-gray-100 pb-2 sm:flex-row sm:justify-between sm:gap-4"
                >
                  <dt className="text-muted">{label}</dt>
                  <dd className="font-medium text-navy-900 sm:max-w-[60%] sm:text-right">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            {!selectedApplication.resumeOnFile && (
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>Supporting resume is missing for this applicant.</span>
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setSelectedApplicationId(null)}
              >
                Close
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  updateStatus(
                    selectedApplication.id,
                    "interview",
                    `Moved ${selectedApplication.applicantName} to interview`,
                  )
                }
              >
                Advance to interview
              </Button>
              <Button
                variant="danger"
                onClick={() =>
                  updateStatus(
                    selectedApplication.id,
                    "rejected",
                    `Rejected application from ${selectedApplication.applicantName}`,
                  )
                }
              >
                Reject
              </Button>
              <Button
                onClick={() =>
                  updateStatus(
                    selectedApplication.id,
                    "hired",
                    `Marked ${selectedApplication.applicantName} as hired — add to Employees when ready`,
                  )
                }
              >
                Mark hired
              </Button>
            </div>
            <p className="text-xs text-muted">
              After hiring, create the employee record under Admin → Employee
              Profiles. This panel only updates local application status.
            </p>
          </div>
        )}
      </Modal>
        </>
      )}
    </div>
  );
}
