"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  MATTER_BILLING_TYPE_LABELS,
  type MatterCreationFormValues,
  type MatterCreationLookupOption,
} from "@/lib/matters/matter-creation-types";

interface MatterCreationFormProps {
  initialValues: MatterCreationFormValues;
  clients: MatterCreationLookupOption[];
  practiceAreas: MatterCreationLookupOption[];
  attorneys: MatterCreationLookupOption[];
  submitLabel: string;
  busy?: boolean;
  onSubmit: (values: MatterCreationFormValues) => Promise<void>;
}

export function MatterCreationForm({
  initialValues,
  clients,
  practiceAreas,
  attorneys,
  submitLabel,
  busy,
  onSubmit,
}: MatterCreationFormProps) {
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);

  const clientOptions = useMemo(
    () => [
      { value: "", label: "Select client…" },
      ...clients.map((client) => ({
        value: client.value,
        label: client.meta ? `${client.label} · ${client.meta}` : client.label,
      })),
    ],
    [clients],
  );
  const practiceAreaOptions = useMemo(
    () => [{ value: "", label: "Select practice area…" }, ...practiceAreas],
    [practiceAreas],
  );
  const attorneyOptions = useMemo(
    () => [{ value: "", label: "Unassigned (admin can staff later)" }, ...attorneys],
    [attorneys],
  );

  function update<K extends keyof MatterCreationFormValues>(
    key: K,
    value: MatterCreationFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!values.client_id) {
      setError("Select a client for this matter.");
      return;
    }
    if (!values.title.trim()) {
      setError("Matter title is required.");
      return;
    }
    if (!values.practice_area_id) {
      setError("Select a practice area.");
      return;
    }
    if (values.billing_type === "hourly" && !values.hourly_rate.trim()) {
      setError("Enter an hourly rate for hourly matters.");
      return;
    }
    if (values.billing_type === "fixed_fee" && !values.fixed_fee_amount.trim()) {
      setError("Enter a flat fee amount.");
      return;
    }
    if (values.billing_type === "retainer" && !values.retainer_amount.trim()) {
      setError("Enter a retainer amount.");
      return;
    }

    await onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Client & matter details</CardTitle>
          <CardDescription>
            Submissions are routed to the Firm Administrator for approval before the matter is opened.
          </CardDescription>
        </CardHeader>
        <div className="space-y-4 px-6 pb-6">
          <Select
            label="Client"
            value={values.client_id}
            onChange={(e) => update("client_id", e.target.value)}
            options={clientOptions}
          />
          <Input
            label="Matter title"
            value={values.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="e.g. Vendor contract dispute"
          />
          <Select
            label="Practice area"
            value={values.practice_area_id}
            onChange={(e) => update("practice_area_id", e.target.value)}
            options={practiceAreaOptions}
          />
          <Textarea
            label="Description"
            value={values.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Brief engagement summary for firm admin review…"
          />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fee arrangement</CardTitle>
          <CardDescription>Billing terms for the proposed engagement.</CardDescription>
        </CardHeader>
        <div className="space-y-4 px-6 pb-6">
          <Select
            label="Billing type"
            value={values.billing_type}
            onChange={(e) =>
              update("billing_type", e.target.value as MatterCreationFormValues["billing_type"])
            }
            options={Object.entries(MATTER_BILLING_TYPE_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          {values.billing_type === "hourly" ? (
            <Input
              label="Hourly rate"
              type="number"
              min="0"
              step="0.01"
              value={values.hourly_rate}
              onChange={(e) => update("hourly_rate", e.target.value)}
              placeholder="350"
            />
          ) : null}
          {values.billing_type === "fixed_fee" ? (
            <Input
              label="Flat fee amount"
              type="number"
              min="0"
              step="0.01"
              value={values.fixed_fee_amount}
              onChange={(e) => update("fixed_fee_amount", e.target.value)}
              placeholder="5000"
            />
          ) : null}
          {values.billing_type === "retainer" ? (
            <Input
              label="Retainer amount"
              type="number"
              min="0"
              step="0.01"
              value={values.retainer_amount}
              onChange={(e) => update("retainer_amount", e.target.value)}
              placeholder="15000"
            />
          ) : null}
          <Textarea
            label="Expense terms"
            value={values.expense_terms}
            onChange={(e) => update("expense_terms", e.target.value)}
            placeholder="Filing fees, experts, travel, etc."
          />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Staffing proposal</CardTitle>
          <CardDescription>Optional responsible attorney recommendation.</CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          <Select
            label="Proposed responsible attorney"
            value={values.proposed_attorney_name}
            onChange={(e) => update("proposed_attorney_name", e.target.value)}
            options={attorneyOptions}
          />
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Submitting…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
