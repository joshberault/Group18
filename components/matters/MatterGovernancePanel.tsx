"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CONFLICT_STATUS_LABELS } from "@/lib/clients/types";
import { BILLING_ROUTES, invoicesHref, receivablesHref } from "@/lib/billing/routes";
import {
  ACTIVATION_LABELS,
  ENGAGEMENT_STATUS_LABELS,
  FEE_TYPE_LABELS,
  formatFeeSummary,
  isAttorneyOverloaded,
  LIFECYCLE_LABELS,
  type EngagementFeeType,
  type FirmPortfolioMatter,
  type MatterEngagementStatus,
  type MatterLifecycleStatus,
} from "@/lib/matters/firm-portfolio";
import { EngagementTermsPanel } from "@/components/matters/EngagementTermsPanel";
import {
  assignResponsibleAttorney,
  markPartnerReviewed,
  setMatterEngagementStatus,
  setMatterFeeTerms,
  setMatterLifecycle,
} from "@/lib/matters/firm-portfolio-store";

function conflictBadgeVariant(
  status: FirmPortfolioMatter["conflictStatus"],
): "success" | "warning" | "danger" | "default" {
  if (status === "cleared") return "success";
  if (status === "possible_conflict") return "danger";
  if (status === "pending" || status === "not_reviewed") return "warning";
  return "default";
}

interface MatterGovernancePanelProps {
  matter: FirmPortfolioMatter;
  allMatters: FirmPortfolioMatter[];
  attorneys: string[];
  onMatterChange: () => void;
  onToast?: (message: string) => void;
}

export function MatterGovernancePanel({
  matter,
  allMatters,
  attorneys,
  onMatterChange,
  onToast,
}: MatterGovernancePanelProps) {
  const [feeDraft, setFeeDraft] = useState({
    feeType: matter.feeType,
    hourlyRate: matter.hourlyRate?.toString() ?? "",
    flatFeeAmount: matter.flatFeeAmount?.toString() ?? "",
    budgetCap: matter.budgetCap?.toString() ?? "",
    billingHold: matter.billingHold,
  });

  useEffect(() => {
    setFeeDraft({
      feeType: matter.feeType,
      hourlyRate: matter.hourlyRate?.toString() ?? "",
      flatFeeAmount: matter.flatFeeAmount?.toString() ?? "",
      budgetCap: matter.budgetCap?.toString() ?? "",
      billingHold: matter.billingHold,
    });
  }, [matter]);

  const notify = (message: string) => onToast?.(message);

  const handleLifecycle = (status: MatterLifecycleStatus) => {
    setMatterLifecycle(matter.id, status);
    onMatterChange();
    notify(`Matter marked ${LIFECYCLE_LABELS[status].toLowerCase()}.`);
  };

  const handleAssign = (attorney: string) => {
    const value = attorney === "" ? null : attorney;
    assignResponsibleAttorney(matter.id, value);
    onMatterChange();
    notify(
      value
        ? `Responsible attorney set to ${value}.`
        : "Responsible attorney cleared (unassigned).",
    );
  };

  const handleSaveFees = () => {
    const hourlyRate = feeDraft.hourlyRate ? Number(feeDraft.hourlyRate) : null;
    const flatFeeAmount = feeDraft.flatFeeAmount
      ? Number(feeDraft.flatFeeAmount)
      : null;
    const budgetCap = feeDraft.budgetCap ? Number(feeDraft.budgetCap) : null;
    setMatterFeeTerms(matter.id, {
      feeType: feeDraft.feeType,
      hourlyRate: Number.isFinite(hourlyRate) ? hourlyRate : null,
      flatFeeAmount: Number.isFinite(flatFeeAmount) ? flatFeeAmount : null,
      budgetCap: Number.isFinite(budgetCap) ? budgetCap : null,
      billingHold: feeDraft.billingHold,
    });
    onMatterChange();
    notify("Engagement fee terms updated.");
  };

  const handleReview = (reviewed: boolean) => {
    markPartnerReviewed(matter.id, reviewed);
    onMatterChange();
    notify(
      reviewed
        ? "Marked as reviewed by Managing Partner."
        : "Returned to partner review queue.",
    );
  };

  const handleEngagementStatus = (engagementStatus: MatterEngagementStatus) => {
    setMatterEngagementStatus(matter.id, engagementStatus);
    onMatterChange();
    notify(
      `Engagement status set to ${ENGAGEMENT_STATUS_LABELS[engagementStatus].toLowerCase()}.`,
    );
  };

  return (
    <div className="space-y-6">
      {matter.needsPartnerReview && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Partner review required</p>
          <p className="mt-1">
            {matter.partnerReviewReason ??
              "This matter is in the managing partner review queue."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => handleReview(true)}>
              Mark reviewed
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleReview(false)}
            >
              Keep in queue
            </Button>
          </div>
        </div>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-navy-900">Engagement</h3>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Practice area</dt>
            <dd className="font-medium text-navy-900">{matter.practiceArea}</dd>
          </div>
          <div>
            <dt className="text-muted">Opened</dt>
            <dd className="font-medium text-navy-900">{matter.openDate}</dd>
          </div>
          <div>
            <dt className="text-muted">Originating attorney</dt>
            <dd className="font-medium text-navy-900">
              {matter.originatingAttorney ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Current fee summary</dt>
            <dd className="font-medium text-navy-900">
              {formatFeeSummary(matter)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Activation</dt>
            <dd>
              <Badge variant={matter.activationStatus === "active" ? "success" : "warning"}>
                {ACTIVATION_LABELS[matter.activationStatus]}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-muted">Engagement letter</dt>
            <dd>
              <Badge variant={matter.engagementStatus === "signed" ? "success" : "default"}>
                {ENGAGEMENT_STATUS_LABELS[matter.engagementStatus]}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-muted">Conflict</dt>
            <dd>
              <Badge variant={conflictBadgeVariant(matter.conflictStatus)}>
                {CONFLICT_STATUS_LABELS[matter.conflictStatus]}
              </Badge>
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted">Scope</dt>
            <dd className="mt-1 text-navy-900">{matter.engagementScope}</dd>
          </div>
        </dl>
      </section>

      <EngagementTermsPanel
        matter={matter}
        onMatterChange={onMatterChange}
        onToast={notify}
      />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-navy-900">
          Engagement letter status
        </h3>
        <Select
          label="Engagement status"
          value={matter.engagementStatus}
          onChange={(e) =>
            handleEngagementStatus(e.target.value as MatterEngagementStatus)
          }
          options={Object.entries(ENGAGEMENT_STATUS_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-navy-900">
          Lifecycle controls
        </h3>
        <Select
          label="Matter status"
          value={matter.status}
          onChange={(e) =>
            handleLifecycle(e.target.value as MatterLifecycleStatus)
          }
          options={Object.entries(LIFECYCLE_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["open", "Reopen"],
              ["on_hold", "Hold"],
              ["closed", "Close"],
              ["archived", "Archive"],
            ] as const
          ).map(([status, label]) => (
            <Button
              key={status}
              size="sm"
              variant={matter.status === status ? "primary" : "secondary"}
              onClick={() => handleLifecycle(status)}
            >
              {label}
            </Button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-navy-900">
          Responsible attorney
        </h3>
        <Select
          label="Assign responsible attorney"
          value={matter.responsibleAttorney ?? ""}
          onChange={(e) => handleAssign(e.target.value)}
          options={[
            { value: "", label: "Unassigned" },
            ...attorneys.map((name) => ({
              value: name,
              label: isAttorneyOverloaded(allMatters, name)
                ? `${name} (overloaded)`
                : name,
            })),
          ]}
        />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-navy-900">Fee arrangement</h3>
        <Select
          label="Fee type"
          value={feeDraft.feeType}
          onChange={(e) =>
            setFeeDraft((prev) => ({
              ...prev,
              feeType: e.target.value as EngagementFeeType,
            }))
          }
          options={Object.entries(FEE_TYPE_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label="Hourly rate"
            type="number"
            min={0}
            value={feeDraft.hourlyRate}
            onChange={(e) =>
              setFeeDraft((prev) => ({ ...prev, hourlyRate: e.target.value }))
            }
          />
          <Input
            label="Flat / retainer"
            type="number"
            min={0}
            value={feeDraft.flatFeeAmount}
            onChange={(e) =>
              setFeeDraft((prev) => ({
                ...prev,
                flatFeeAmount: e.target.value,
              }))
            }
          />
          <Input
            label="Budget cap"
            type="number"
            min={0}
            value={feeDraft.budgetCap}
            onChange={(e) =>
              setFeeDraft((prev) => ({ ...prev, budgetCap: e.target.value }))
            }
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-navy-900">
          <input
            type="checkbox"
            checked={feeDraft.billingHold}
            onChange={(e) =>
              setFeeDraft((prev) => ({
                ...prev,
                billingHold: e.target.checked,
              }))
            }
            className="rounded border-gray-300"
          />
          Billing hold
        </label>
        <Button onClick={handleSaveFees}>Save fee terms</Button>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-navy-900">
          Open related modules
        </h3>
        <div className="flex flex-wrap gap-2">
          <Link href="/clients">
            <Button size="sm" variant="secondary">
              Clients
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link href="/attorney/matters">
            <Button size="sm" variant="secondary">
              Attorney Hub
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link href={BILLING_ROUTES.dashboard}>
            <Button size="sm" variant="secondary">
              Billing
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link href={receivablesHref({ client: matter.clientName })}>
            <Button size="sm" variant="secondary">
              Receivables
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link href={invoicesHref({ matterId: matter.id })}>
            <Button size="sm" variant="secondary">
              Invoices
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link href="/attorney/tasks">
            <Button size="sm" variant="secondary">
              Tasks & Deadlines
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </section>

      {!matter.needsPartnerReview && (
        <Button size="sm" variant="ghost" onClick={() => handleReview(false)}>
          Flag for partner review
        </Button>
      )}
    </div>
  );
}
