"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  createAmendment,
  listAmendments,
  type EngagementAmendment,
} from "@/lib/engagement/amendments";
import {
  fetchTemplates,
  type EngagementTemplate,
  type ScopeChecklistItem,
} from "@/lib/engagement/templates";
import { PRACTICE_AREA_OPTIONS } from "@/lib/intake/practice-area-map";
import {
  ENGAGEMENT_STATUS_LABELS,
  FEE_TYPE_LABELS,
  formatFeeSummary,
  type EngagementFeeType,
  type FirmPortfolioMatter,
} from "@/lib/matters/firm-portfolio";
import {
  setMatterEngagementStatus,
  setMatterFeeTerms,
} from "@/lib/matters/firm-portfolio-store";
import { cn } from "@/lib/utils/cn";

const WIZARD_STEPS = ["Choose template", "Structured terms", "Review & apply"] as const;

type AppliedTerms = {
  templateId: string | null;
  templateName: string | null;
  feeType: EngagementFeeType;
  hourlyRate: number | null;
  flatFeeAmount: number | null;
  scopeChecklist: Array<ScopeChecklistItem & { included: boolean }>;
  letterBody: string;
};

function resolvePracticeAreaId(practiceAreaName: string): string | undefined {
  const match = PRACTICE_AREA_OPTIONS.find(
    (row) => row.name.toLowerCase() === practiceAreaName.trim().toLowerCase(),
  );
  return match?.id;
}

function buildAppliedTerms(
  template: EngagementTemplate | null,
  overrides?: Partial<AppliedTerms>,
): AppliedTerms {
  return {
    templateId: template?.id ?? null,
    templateName: template?.name ?? null,
    feeType: overrides?.feeType ?? template?.feeType ?? "hourly",
    hourlyRate:
      overrides?.hourlyRate !== undefined
        ? overrides.hourlyRate
        : (template?.hourlyRate ?? null),
    flatFeeAmount:
      overrides?.flatFeeAmount !== undefined
        ? overrides.flatFeeAmount
        : (template?.flatFeeAmount ?? null),
    scopeChecklist:
      overrides?.scopeChecklist ??
      (template?.scopeChecklist ?? []).map((item) => ({
        ...item,
        included: item.default !== false,
      })),
    letterBody: overrides?.letterBody ?? template?.letterBody ?? "",
  };
}

function termsFromMatter(matter: FirmPortfolioMatter): AppliedTerms {
  return {
    templateId: null,
    templateName: null,
    feeType: matter.feeType,
    hourlyRate: matter.hourlyRate,
    flatFeeAmount: matter.flatFeeAmount,
    scopeChecklist: [
      {
        id: "matter_scope",
        label: matter.engagementScope,
        included: true,
      },
    ],
    letterBody: "",
  };
}

function renderLetterPreview(
  body: string,
  matter: FirmPortfolioMatter,
  terms: AppliedTerms,
): string {
  const rateLabel =
    terms.feeType === "hourly" && terms.hourlyRate != null
      ? `$${terms.hourlyRate}/hr`
      : terms.flatFeeAmount != null
        ? `$${terms.flatFeeAmount.toLocaleString()}`
        : "as agreed";

  return body
    .replaceAll("{{client_name}}", matter.clientName)
    .replaceAll("{{matter_title}}", matter.title)
    .replaceAll("{{hourly_rate}}", rateLabel)
    .replaceAll(
      "{{flat_fee_amount}}",
      terms.flatFeeAmount != null
        ? `$${terms.flatFeeAmount.toLocaleString()}`
        : "as agreed",
    );
}

function formatAmendmentDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

interface EngagementTermsPanelProps {
  matter: FirmPortfolioMatter;
  onMatterChange: () => void;
  onToast?: (message: string) => void;
}

export function EngagementTermsPanel({
  matter,
  onMatterChange,
  onToast,
}: EngagementTermsPanelProps) {
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState<EngagementTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [termsDraft, setTermsDraft] = useState<AppliedTerms>(() =>
    termsFromMatter(matter),
  );
  const [appliedTerms, setAppliedTerms] = useState<AppliedTerms | null>(null);
  const [amendments, setAmendments] = useState<EngagementAmendment[]>([]);
  const [amendmentsLoading, setAmendmentsLoading] = useState(true);
  const [amendmentReason, setAmendmentReason] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  const practiceAreaId = resolvePracticeAreaId(matter.practiceArea);

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    const result = await fetchTemplates({
      practiceAreaId,
      practiceAreaName: practiceAreaId ? undefined : matter.practiceArea,
    });
    setTemplates(result.templates);
    setTemplatesError(result.error);
    setTemplatesLoading(false);
  }, [matter.practiceArea, practiceAreaId]);

  const loadAmendmentHistory = useCallback(async () => {
    setAmendmentsLoading(true);
    const result = await listAmendments(matter.id);
    setAmendments(result.amendments);
    setAmendmentsLoading(false);
    if (result.error) {
      onToast?.(`Could not load amendments: ${result.error}`);
    }
  }, [matter.id, onToast]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    void loadAmendmentHistory();
  }, [loadAmendmentHistory]);

  useEffect(() => {
    setTermsDraft(termsFromMatter(matter));
  }, [matter]);

  const hasTermChanges = useMemo(() => {
    if (!appliedTerms) return false;
    if (appliedTerms.feeType !== termsDraft.feeType) return true;
    if (appliedTerms.hourlyRate !== termsDraft.hourlyRate) return true;
    if (appliedTerms.flatFeeAmount !== termsDraft.flatFeeAmount) return true;
    const prevScope = appliedTerms.scopeChecklist
      .filter((i) => i.included)
      .map((i) => i.id)
      .sort()
      .join(",");
    const nextScope = termsDraft.scopeChecklist
      .filter((i) => i.included)
      .map((i) => i.id)
      .sort()
      .join(",");
    return prevScope !== nextScope;
  }, [appliedTerms, termsDraft]);

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId) ?? null;
    setTermsDraft(buildAppliedTerms(template));
  };

  const handleApplyTerms = async () => {
    setSaving(true);
    setMatterFeeTerms(matter.id, {
      feeType: termsDraft.feeType,
      hourlyRate: termsDraft.hourlyRate,
      flatFeeAmount: termsDraft.flatFeeAmount,
      budgetCap: matter.budgetCap,
      billingHold: matter.billingHold,
    });
    setMatterEngagementStatus(matter.id, "letter_sent");
    setAppliedTerms({ ...termsDraft });
    onMatterChange();
    onToast?.("Engagement terms applied and letter marked as sent.");
    setSaving(false);
    setStep(0);
  };

  const handleCreateAmendment = async () => {
    if (!appliedTerms || !amendmentReason.trim()) return;
    setSaving(true);
    const changes = {
      previous: appliedTerms,
      next: termsDraft,
      feeType: termsDraft.feeType,
      hourlyRate: termsDraft.hourlyRate,
      flatFeeAmount: termsDraft.flatFeeAmount,
      scopeChecklist: termsDraft.scopeChecklist.filter((item) => item.included),
      templateId: termsDraft.templateId,
      templateName: termsDraft.templateName,
    };
    const result = await createAmendment({
      matterId: matter.id,
      changes,
      reason: amendmentReason.trim(),
      status: "draft",
    });
    if (result.error) {
      onToast?.(`Amendment failed: ${result.error}`);
    } else {
      setAmendmentReason("");
      setAppliedTerms({ ...termsDraft });
      setMatterFeeTerms(matter.id, {
        feeType: termsDraft.feeType,
        hourlyRate: termsDraft.hourlyRate,
        flatFeeAmount: termsDraft.flatFeeAmount,
        budgetCap: matter.budgetCap,
        billingHold: matter.billingHold,
      });
      onMatterChange();
      onToast?.(`Amendment v${result.amendment?.version ?? ""} created.`);
      await loadAmendmentHistory();
    }
    setSaving(false);
  };

  const canAdvance =
    (step === 0 && Boolean(selectedTemplateId)) ||
    (step === 1 &&
      (termsDraft.feeType !== "hourly" || termsDraft.hourlyRate != null) &&
      (termsDraft.feeType === "hourly" ||
        termsDraft.feeType === "contingency" ||
        termsDraft.flatFeeAmount != null)) ||
    step === 2;

  return (
    <div className="space-y-6 border-t border-gray-100 pt-6">
      <div>
        <h3 className="text-sm font-semibold text-navy-900">
          Engagement terms wizard
        </h3>
        <p className="mt-1 text-sm text-muted">
          Pick a practice-area template, customize fee and scope, then apply to
          this matter.
        </p>
      </div>

      <ol className="flex flex-wrap gap-2">
        {WIZARD_STEPS.map((label, index) => (
          <li
            key={label}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              index === step
                ? "bg-navy-900 text-white"
                : index < step
                  ? "bg-navy-100 text-navy-900"
                  : "bg-gray-100 text-muted",
            )}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className="space-y-3">
          <p className="text-sm text-muted">
            Templates for{" "}
            <span className="font-medium text-navy-900">{matter.practiceArea}</span>
          </p>
          {templatesLoading ? (
            <p className="text-sm text-muted">Loading templates…</p>
          ) : templatesError ? (
            <p className="text-sm text-red-700">{templatesError}</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted">
              No active templates for this practice area.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleSelectTemplate(template.id)}
                  className={cn(
                    "rounded-lg border px-4 py-3 text-left transition-colors",
                    selectedTemplateId === template.id
                      ? "border-navy-600 bg-navy-50"
                      : "border-gray-200 hover:border-navy-300",
                  )}
                >
                  <p className="font-medium text-navy-900">{template.name}</p>
                  <p className="mt-1 text-xs text-muted">
                    {FEE_TYPE_LABELS[template.feeType]}
                    {template.hourlyRate != null
                      ? ` · $${template.hourlyRate}/hr`
                      : ""}
                    {template.flatFeeAmount != null
                      ? ` · $${template.flatFeeAmount.toLocaleString()}`
                      : ""}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {step === 1 && (
        <section className="space-y-4">
          <Select
            label="Fee type"
            value={termsDraft.feeType}
            onChange={(e) =>
              setTermsDraft((prev) => ({
                ...prev,
                feeType: e.target.value as EngagementFeeType,
              }))
            }
            options={Object.entries(FEE_TYPE_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Hourly rate"
              type="number"
              min={0}
              value={termsDraft.hourlyRate?.toString() ?? ""}
              onChange={(e) =>
                setTermsDraft((prev) => ({
                  ...prev,
                  hourlyRate: e.target.value ? Number(e.target.value) : null,
                }))
              }
              disabled={termsDraft.feeType !== "hourly" && termsDraft.feeType !== "hybrid"}
            />
            <Input
              label="Flat / retainer amount"
              type="number"
              min={0}
              value={termsDraft.flatFeeAmount?.toString() ?? ""}
              onChange={(e) =>
                setTermsDraft((prev) => ({
                  ...prev,
                  flatFeeAmount: e.target.value ? Number(e.target.value) : null,
                }))
              }
              disabled={
                termsDraft.feeType !== "flat" && termsDraft.feeType !== "retainer"
              }
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-navy-900">Scope checklist</p>
            {termsDraft.scopeChecklist.map((item) => (
              <label
                key={item.id}
                className="flex items-start gap-2 text-sm text-navy-900"
              >
                <input
                  type="checkbox"
                  checked={item.included}
                  onChange={(e) =>
                    setTermsDraft((prev) => ({
                      ...prev,
                      scopeChecklist: prev.scopeChecklist.map((row) =>
                        row.id === item.id
                          ? { ...row, included: e.target.checked }
                          : row,
                      ),
                    }))
                  }
                  className="mt-0.5 rounded border-gray-300"
                />
                {item.label}
              </label>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Template</dt>
              <dd className="font-medium text-navy-900">
                {selectedTemplate?.name ?? termsDraft.templateName ?? "Custom"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Fee summary</dt>
              <dd className="font-medium text-navy-900">
                {formatFeeSummary({
                  ...matter,
                  feeType: termsDraft.feeType,
                  hourlyRate: termsDraft.hourlyRate,
                  flatFeeAmount: termsDraft.flatFeeAmount,
                })}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Engagement status after apply</dt>
              <dd>
                <Badge variant="default">
                  {ENGAGEMENT_STATUS_LABELS.letter_sent}
                </Badge>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted">Included scope</dt>
              <dd className="mt-1 text-navy-900">
                {termsDraft.scopeChecklist
                  .filter((item) => item.included)
                  .map((item) => item.label)
                  .join(" · ") || "—"}
              </dd>
            </div>
          </dl>
          {termsDraft.letterBody ? (
            <Textarea
              label="Engagement letter preview"
              value={renderLetterPreview(termsDraft.letterBody, matter, termsDraft)}
              readOnly
              rows={6}
            />
          ) : null}
          <Button onClick={() => void handleApplyTerms()} disabled={saving}>
            Apply terms & mark letter sent
          </Button>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Back
        </Button>
        {step < WIZARD_STEPS.length - 1 ? (
          <Button
            size="sm"
            disabled={!canAdvance}
            onClick={() => setStep((s) => s + 1)}
          >
            Next
          </Button>
        ) : null}
      </div>

      <section className="space-y-3 border-t border-gray-100 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-navy-900">
            Amendment history
          </h3>
          {hasTermChanges && appliedTerms ? (
            <Badge variant="warning">Terms changed since last apply</Badge>
          ) : null}
        </div>

        {amendmentsLoading ? (
          <p className="text-sm text-muted">Loading amendments…</p>
        ) : amendments.length === 0 ? (
          <p className="text-sm text-muted">No amendments recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {amendments.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-gray-200 px-4 py-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-navy-900">
                    Version {row.version}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={row.status === "approved" ? "success" : "default"}
                    >
                      {row.status}
                    </Badge>
                    <span className="text-xs text-muted">
                      {formatAmendmentDate(row.createdAt)}
                    </span>
                  </div>
                </div>
                {row.reason ? (
                  <p className="mt-1 text-muted">{row.reason}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {hasTermChanges && appliedTerms ? (
          <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-medium text-amber-950">
              Create amendment for revised terms
            </p>
            <Textarea
              label="Reason for amendment"
              value={amendmentReason}
              onChange={(e) => setAmendmentReason(e.target.value)}
              rows={2}
              placeholder="Describe what changed and why…"
            />
            <Button
              size="sm"
              onClick={() => void handleCreateAmendment()}
              disabled={saving || !amendmentReason.trim()}
            >
              Create amendment
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
