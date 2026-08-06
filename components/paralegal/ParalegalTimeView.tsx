"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Toast } from "@/components/ui/Toast";
import { useParalegalWorkflow } from "@/hooks/useParalegalWorkflow";
import { PARALEGAL_ASSIGNED_MATTERS } from "@/lib/paralegal/demo-data";
import { filterTimeByQuery } from "@/lib/paralegal/filters";
import {
  addParalegalTimeEntry,
  updateParalegalTimeEntry,
} from "@/lib/paralegal/workflow-store";

export function ParalegalTimeView() {
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter");
  const action = searchParams.get("action");
  const { timeEntries, refresh } = useParalegalWorkflow();
  const [toast, setToast] = useState<string | null>(null);
  const [matterId, setMatterId] = useState(
    PARALEGAL_ASSIGNED_MATTERS[0]?.id ?? "",
  );
  const [entryDate, setEntryDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [hours, setHours] = useState("");
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState(true);
  const [activityType, setActivityType] = useState("document_prep");

  const visible = useMemo(
    () => filterTimeByQuery(timeEntries, filter),
    [timeEntries, filter],
  );

  useEffect(() => {
    if (action === "add") {
      document.getElementById("paralegal-time-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [action]);

  function handleSubmit(e: React.FormEvent, asDraft: boolean) {
    e.preventDefault();
    const matter = PARALEGAL_ASSIGNED_MATTERS.find((m) => m.id === matterId);
    if (!matter) return;
    if (
      matter.conflictStatus === "possible_conflict" ||
      matter.status === "on_hold"
    ) {
      setToast(
        "Time entry blocked for on-hold / possible-conflict matters until authorized.",
      );
      return;
    }
    const value = Number(hours);
    if (!Number.isFinite(value) || value <= 0) {
      setToast("Enter a valid duration greater than zero.");
      return;
    }
    if (!description.trim() || description.trim().length < 12) {
      setToast("Enter a meaningful work description (at least 12 characters).");
      return;
    }

    const duplicate = timeEntries.some(
      (entry) =>
        entry.matterId === matterId &&
        entry.entryDate === entryDate &&
        entry.description.trim().toLowerCase() ===
          description.trim().toLowerCase() &&
        entry.hours === value,
    );
    if (duplicate) {
      setToast(
        "Possible duplicate entry — change the description or hours before saving.",
      );
      return;
    }

    addParalegalTimeEntry({
      matterId: matter.id,
      matterTitle: matter.title,
      clientName: matter.clientName,
      entryDate,
      hours: value,
      description: `${activityType.replaceAll("_", " ")} — ${description.trim()}`,
      billable,
      status: asDraft ? "draft" : "submitted",
    });
    refresh();
    setHours("");
    setDescription("");
    setToast(
      asDraft
        ? "Draft time entry saved."
        : "Time submitted for attorney/billing review (you cannot approve it).",
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Time Entries"
        description="Log billable and non-billable work on assigned matters only. Invoiced entries stay locked."
      />

      {filter && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="gold">Filter: {filter}</Badge>
          <Link href="/attorney/time">
            <Button size="sm" variant="ghost">
              Clear filter
            </Button>
          </Link>
        </div>
      )}

      <Card padding="md">
        <div id="paralegal-time-form">
          <CardTitle className="mb-4">Add time entry</CardTitle>
          <form className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Assigned matter"
                value={matterId}
                onChange={(e) => setMatterId(e.target.value)}
                options={PARALEGAL_ASSIGNED_MATTERS.map((m) => ({
                  value: m.id,
                  label: `${m.title} (${m.clientName})`,
                }))}
              />
              <Input
                label="Date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
              <Input
                label="Hours"
                type="number"
                min="0.1"
                step="0.1"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
              <Select
                label="Activity type"
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                options={[
                  { value: "document_prep", label: "Document preparation" },
                  { value: "research", label: "Research" },
                  { value: "client_comm", label: "Client communication" },
                  { value: "filing", label: "Filing / court support" },
                  { value: "internal", label: "Internal coordination" },
                ]}
              />
            </div>
            <Textarea
              label="Work description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <label className="flex items-center gap-2 text-sm text-navy-900">
              <input
                type="checkbox"
                checked={billable}
                onChange={(e) => setBillable(e.target.checked)}
                className="rounded border-gray-300"
              />
              Billable
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={(e) => handleSubmit(e, false)}>
                Submit for review
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={(e) => handleSubmit(e, true)}
              >
                Save draft
              </Button>
            </div>
          </form>
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-navy-900">Your entries</h2>
        {visible.map((entry) => {
          const locked = entry.status === "invoiced";
          return (
            <Card key={entry.id} padding="md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-navy-900">
                    {entry.hours}h · {entry.description}
                  </p>
                  <p className="text-sm text-muted">
                    {entry.clientName} · {entry.matterTitle} · {entry.entryDate}
                    {entry.billable ? " · Billable" : " · Nonbillable"}
                  </p>
                  {entry.rejectionReason && (
                    <p className="mt-2 text-sm text-red-700">
                      Rejected: {entry.rejectionReason}
                    </p>
                  )}
                  {locked && (
                    <p className="mt-2 text-xs font-medium text-muted">
                      Invoiced — editing locked.
                    </p>
                  )}
                </div>
                <Badge
                  variant={
                    entry.status === "rejected"
                      ? "danger"
                      : entry.status === "draft"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {entry.status}
                </Badge>
              </div>
              {entry.status === "rejected" && !locked && (
                <Button
                  size="sm"
                  className="mt-3"
                  variant="secondary"
                  onClick={() => {
                    updateParalegalTimeEntry(entry.id, {
                      status: "draft",
                      description:
                        entry.description.length < 20
                          ? `${entry.description} — detailed tasks: [add specifics]`
                          : entry.description,
                      rejectionReason: undefined,
                    });
                    refresh();
                    setToast(
                      "Rejected entry moved to draft for correction. Re-submit when ready.",
                    );
                  }}
                >
                  Correct rejected entry
                </Button>
              )}
              {entry.status === "draft" && entry.hours > 0 && (
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    updateParalegalTimeEntry(entry.id, { status: "submitted" });
                    refresh();
                    setToast("Draft submitted for review.");
                  }}
                >
                  Submit draft
                </Button>
              )}
            </Card>
          );
        })}
      </section>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
