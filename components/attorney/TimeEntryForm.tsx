"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClientSafe } from "@/lib/supabase/client";
import {
  getDemoSubmitterContext,
  notifyApprovalWorkflowChange,
  submitDemoTimeEntry,
} from "@/lib/demo/time-workflow-store";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { checkMatterBillable } from "@/lib/matters/matter-activation-gates";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { UserRole } from "@/lib/types";
import type { Matter, TimeEntry } from "@/types/database";
import { buildTimeApprovalUrl } from "@/lib/pipeline/contract-to-cash";
import {
  PipelineHandoffBanner,
  PipelineHandoffLink,
} from "@/components/pipeline/PipelineHandoffBanner";

const APPROVAL_SUCCESS_MESSAGE =
  "Time entry submitted for manager approval. Switch to Managing Partner or Firm Administrator on the dashboard to review.";

type Props = {
  matters: Matter[];
  mattersLoading?: boolean;
  submitterRole?: UserRole;
  onCreated: () => void;
};

export function TimeEntryForm({
  matters,
  mattersLoading = false,
  submitterRole = "attorney",
  onCreated,
}: Props) {
  const { selectedRole, attorneySpecialty } = useDemoRole();
  const effectiveRole = submitterRole ?? selectedRole;
  const [matterId, setMatterId] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState("1.0");
  const [description, setDescription] = useState("");
  const [isBillable, setIsBillable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setMatterId((current) => {
      if (current && matters.some((matter) => matter.id === current)) return current;
      return matters[0]?.id ?? "";
    });
  }, [matters]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const parsedHours = Number(hours);
    if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
      setError("Hours must be greater than zero.");
      return;
    }

    if (!description.trim()) {
      setError("Description is required.");
      return;
    }

    const gate = await checkMatterBillable(matterId);
    if (!gate.allowed) {
      setError(gate.reason ?? "Time entry is blocked for this matter.");
      return;
    }

    setLoading(true);

    const matterTitle =
      matters.find((matter) => matter.id === matterId)?.title ?? undefined;
    const submitter = getDemoSubmitterContext(
      effectiveRole,
      effectiveRole === "attorney" ? attorneySpecialty : null,
    );

    submitDemoTimeEntry({
      profileId: submitter.profileId,
      submitterName: submitter.submitterName,
      submitterRole: effectiveRole,
      employeeId: submitter.employeeId,
      matterId,
      matterTitle,
      entryDate,
      hours: parsedHours,
      description: description.trim(),
      isBillable,
    });

    const supabase = createClientSafe();
    if (supabase) {
      const { error: insertError } = await supabase.from("time_entries").insert({
        matter_id: matterId,
        profile_id: submitter.profileId,
        entry_date: entryDate,
        hours: parsedHours,
        description: description.trim(),
        is_billable: isBillable,
        status: "pending",
      });
      if (insertError) {
        console.warn("Supabase time entry insert skipped:", insertError.message);
      } else {
        notifyApprovalWorkflowChange();
      }
    }

    setLoading(false);
    setDescription("");
    setHours("1.0");
    setSuccess(APPROVAL_SUCCESS_MESSAGE);
    onCreated();
  }

  return (
    <Card padding="md">
      <CardTitle className="mb-4">Manual Time Entry</CardTitle>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Matter"
            value={matterId}
            onChange={(e) => setMatterId(e.target.value)}
            options={matters.map((matter) => ({ value: matter.id, label: matter.title }))}
            required
            disabled={mattersLoading || matters.length === 0}
          />
          <Input
            label="Date"
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            required
          />
          <Input
            label="Hours"
            type="number"
            min="0.1"
            max="24"
            step="0.1"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            required
          />
          <label className="flex items-center gap-2 self-end text-sm text-navy-900">
            <input
              type="checkbox"
              checked={isBillable}
              onChange={(e) => setIsBillable(e.target.checked)}
            />
            {isBillable ? "Billable hours" : "Pro bono (non-billable)"}
          </label>
          <div className="md:col-span-2">
            <Textarea
              label="Description of work"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Drafted motion, client call, research..."
              required
            />
          </div>
        </div>
        {matters.length === 0 && !mattersLoading ? (
          <p className="text-sm text-muted">
            No matters are assigned to you yet. Ask the managing partner to assign a
            matter before logging time.
          </p>
        ) : null}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success ? (
          <PipelineHandoffBanner stage="work_completed" title={success}>
            <p>
              Switch to the Managing Partner role and open{" "}
              <PipelineHandoffLink href={buildTimeApprovalUrl(matterId)}>
                Time approvals
              </PipelineHandoffLink>{" "}
              to approve billable work before invoicing.
            </p>
          </PipelineHandoffBanner>
        ) : null}
        <Button type="submit" disabled={loading || mattersLoading || matters.length === 0}>
          {loading ? "Submitting..." : "Submit for Manager Approval"}
        </Button>
      </form>
    </Card>
  );
}

type EditProps = {
  entry: TimeEntry;
  isOpen: boolean;
  onClose: () => void;
};

export function TimeEntryEditModal({ entry, isOpen, onClose }: EditProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-navy-900">Time entry details</h2>
        <p className="mt-1 text-sm text-muted">
          {entry.status === "pending"
            ? "This entry is awaiting manager approval on the dashboard approval queue."
            : `Status: ${entry.status}`}
        </p>
        <dl className="mt-4 space-y-2 text-sm">
          <div>
            <dt className="font-medium text-navy-900">Date</dt>
            <dd>{entry.entry_date}</dd>
          </div>
          <div>
            <dt className="font-medium text-navy-900">Hours</dt>
            <dd>{entry.hours}</dd>
          </div>
          <div>
            <dt className="font-medium text-navy-900">Description</dt>
            <dd>{entry.description}</dd>
          </div>
        </dl>
        <Button type="button" className="mt-4" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
