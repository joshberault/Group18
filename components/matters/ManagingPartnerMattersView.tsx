"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Briefcase,
  ExternalLink,
  Plus,
  Search,
  UserX,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { KPICard } from "@/components/ui/KPICard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";
import { BILLING_ROUTES, invoicesHref, receivablesHref } from "@/lib/billing/routes";
import { CONFLICT_STATUS_LABELS } from "@/lib/clients/types";
import {
  FEE_TYPE_LABELS,
  FIRM_PORTFOLIO_ATTORNEYS,
  formatFeeSummary,
  isAttorneyOverloaded,
  LIFECYCLE_LABELS,
  type EngagementFeeType,
  type FirmPortfolioMatter,
  type MatterLifecycleStatus,
} from "@/lib/matters/firm-portfolio";
import {
  assignResponsibleAttorney,
  FIRM_PORTFOLIO_UPDATE_EVENT,
  getLiveFirmPortfolioMatters,
  markPartnerReviewed,
  resetFirmPortfolioMatters,
  setFirmPortfolioBase,
  setMatterFeeTerms,
  setMatterLifecycle,
} from "@/lib/matters/firm-portfolio-store";
import {
  fetchSharedFirmMatters,
  toFirmPortfolioMatter,
} from "@/lib/matters/firm-matters-supabase";
import { cn } from "@/lib/utils/cn";
import {
  buildFirmAdminApprovalsUrl,
  matterCreationPipelineLabel,
} from "@/lib/matters/matter-creation-flow";
import {
  buildMatterCloseUrl,
  pipelineStepLabel,
} from "@/lib/pipeline/contract-to-cash";
import {
  PipelineHandoffBanner,
  PipelineHandoffLink,
} from "@/components/pipeline/PipelineHandoffBanner";

interface MatterFilters {
  search: string;
  status: string;
  attorney: string;
  practiceArea: string;
  feeType: string;
  conflictHold: string;
  partnerReviewOnly: boolean;
  kpiFilter: string;
}

const defaultFilters: MatterFilters = {
  search: "",
  status: "all",
  attorney: "all",
  practiceArea: "all",
  feeType: "all",
  conflictHold: "all",
  partnerReviewOnly: false,
  kpiFilter: "",
};

function statusBadgeVariant(
  status: MatterLifecycleStatus,
): "success" | "warning" | "danger" | "default" {
  if (status === "open") return "success";
  if (status === "on_hold") return "warning";
  if (status === "closed") return "default";
  return "default";
}

function conflictBadgeVariant(
  status: FirmPortfolioMatter["conflictStatus"],
): "success" | "warning" | "danger" | "default" {
  if (status === "cleared") return "success";
  if (status === "possible_conflict") return "danger";
  if (status === "pending" || status === "not_reviewed") return "warning";
  return "default";
}

export function ManagingPartnerMattersView() {
  const searchParams = useSearchParams();
  const submittedRequest = searchParams.get("submitted") === "matter-request";
  const submittedRequestId = searchParams.get("requestId");
  const profitReviewed = searchParams.get("submitted") === "profit-reviewed";
  const closeMatterId = searchParams.get("matterId");
  const [matters, setMatters] = useState<FirmPortfolioMatter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MatterFilters>(defaultFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [feeDraft, setFeeDraft] = useState({
    feeType: "hourly" as EngagementFeeType,
    hourlyRate: "",
    flatFeeAmount: "",
    budgetCap: "",
    billingHold: false,
  });

  const refresh = useCallback(() => {
    setMatters(getLiveFirmPortfolioMatters());
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const result = await fetchSharedFirmMatters({ includeWip: true });
      if (cancelled) return;
      const mapped = result.matters.map(toFirmPortfolioMatter);
      setFirmPortfolioBase(mapped);
      setError(result.error);
      setMatters(getLiveFirmPortfolioMatters());
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onUpdate = () => refresh();
    window.addEventListener(FIRM_PORTFOLIO_UPDATE_EVENT, onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener(FIRM_PORTFOLIO_UPDATE_EVENT, onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [refresh]);

  useEffect(() => {
    const matterParam = searchParams.get("matter");
    if (!matterParam || matters.length === 0) return;
    const match = matters.find(
      (m) =>
        m.matterNumber === matterParam ||
        m.id === matterParam ||
        m.title.toLowerCase() === matterParam.toLowerCase(),
    );
    if (match) setSelectedId(match.id);
  }, [searchParams, matters]);

  const selected = useMemo(
    () => matters.find((m) => m.id === selectedId) ?? null,
    [matters, selectedId],
  );

  useEffect(() => {
    if (!selected) return;
    setFeeDraft({
      feeType: selected.feeType,
      hourlyRate: selected.hourlyRate?.toString() ?? "",
      flatFeeAmount: selected.flatFeeAmount?.toString() ?? "",
      budgetCap: selected.budgetCap?.toString() ?? "",
      billingHold: selected.billingHold,
    });
  }, [selected]);

  const practiceAreas = useMemo(() => {
    return Array.from(new Set(matters.map((m) => m.practiceArea))).sort();
  }, [matters]);

  const attorneys = useMemo(() => {
    const names = new Set<string>([...FIRM_PORTFOLIO_ATTORNEYS]);
    for (const m of matters) {
      if (m.responsibleAttorney) names.add(m.responsibleAttorney);
      if (m.originatingAttorney) names.add(m.originatingAttorney);
    }
    return Array.from(names).sort();
  }, [matters]);

  const kpis = useMemo(() => {
    const open = matters.filter((m) => m.status === "open").length;
    const onHold = matters.filter((m) => m.status === "on_hold").length;
    const unassigned = matters.filter(
      (m) =>
        !m.responsibleAttorney &&
        (m.status === "open" || m.status === "on_hold"),
    ).length;
    const review = matters.filter((m) => m.needsPartnerReview).length;
    const billingHolds = matters.filter((m) => m.billingHold).length;
    const conflictRisk = matters.filter(
      (m) =>
        m.conflictStatus === "possible_conflict" ||
        m.conflictStatus === "pending" ||
        m.conflictStatus === "not_reviewed",
    ).length;

    return [
      {
        id: "open",
        title: "Open Matters",
        value: String(open),
        subtitle: `${matters.length} in firm portfolio`,
        kpiFilter: "open",
        warning: false,
      },
      {
        id: "review",
        title: "Partner Review",
        value: String(review),
        subtitle: "Need managing partner decision",
        kpiFilter: "partner_review",
        warning: review > 0,
      },
      {
        id: "unassigned",
        title: "Unassigned",
        value: String(unassigned),
        subtitle: "Coverage gaps",
        kpiFilter: "unassigned",
        warning: unassigned > 0,
      },
      {
        id: "holds",
        title: "On Hold / Billing Hold",
        value: String(onHold + billingHolds),
        subtitle: `${onHold} lifecycle · ${billingHolds} billing`,
        kpiFilter: "holds",
        warning: onHold + billingHolds > 0,
      },
      {
        id: "conflict",
        title: "Conflict / Risk",
        value: String(conflictRisk),
        subtitle: "Not fully cleared",
        kpiFilter: "conflict",
        warning: conflictRisk > 0,
      },
    ];
  }, [matters]);

  const filteredMatters = useMemo(() => {
    let list = [...matters];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.matterNumber.toLowerCase().includes(q) ||
          m.clientName.toLowerCase().includes(q) ||
          (m.responsibleAttorney?.toLowerCase().includes(q) ?? false),
      );
    }
    if (filters.status !== "all") {
      list = list.filter((m) => m.status === filters.status);
    }
    if (filters.attorney === "unassigned") {
      list = list.filter((m) => !m.responsibleAttorney);
    } else if (filters.attorney !== "all") {
      list = list.filter((m) => m.responsibleAttorney === filters.attorney);
    }
    if (filters.practiceArea !== "all") {
      list = list.filter((m) => m.practiceArea === filters.practiceArea);
    }
    if (filters.feeType !== "all") {
      list = list.filter((m) => m.feeType === filters.feeType);
    }
    if (filters.conflictHold === "conflict") {
      list = list.filter((m) => m.conflictStatus !== "cleared");
    } else if (filters.conflictHold === "billing_hold") {
      list = list.filter((m) => m.billingHold);
    } else if (filters.conflictHold === "either") {
      list = list.filter(
        (m) => m.billingHold || m.conflictStatus !== "cleared",
      );
    }
    if (filters.partnerReviewOnly || filters.kpiFilter === "partner_review") {
      list = list.filter((m) => m.needsPartnerReview);
    }
    if (filters.kpiFilter === "open") {
      list = list.filter((m) => m.status === "open");
    } else if (filters.kpiFilter === "unassigned") {
      list = list.filter(
        (m) =>
          !m.responsibleAttorney &&
          (m.status === "open" || m.status === "on_hold"),
      );
    } else if (filters.kpiFilter === "holds") {
      list = list.filter((m) => m.status === "on_hold" || m.billingHold);
    } else if (filters.kpiFilter === "conflict") {
      list = list.filter((m) => m.conflictStatus !== "cleared");
    }
    return list;
  }, [matters, filters]);

  const showToast = (message: string) => setToast(message);

  const openMatter = (matter: FirmPortfolioMatter) => setSelectedId(matter.id);

  const handleLifecycle = (status: MatterLifecycleStatus) => {
    if (!selected) return;
    setMatters(setMatterLifecycle(selected.id, status));
    if (status === "closed") {
      showToast(
        `${pipelineStepLabel("matter_closed")} — contract-to-cash pipeline complete for "${selected.title}".`,
      );
    } else {
      showToast(`Matter marked ${LIFECYCLE_LABELS[status].toLowerCase()}.`);
    }
  };

  const handleAssign = (attorney: string) => {
    if (!selected) return;
    const value = attorney === "" ? null : attorney;
    setMatters(assignResponsibleAttorney(selected.id, value));
    showToast(
      value
        ? `Responsible attorney set to ${value}.`
        : "Responsible attorney cleared (unassigned).",
    );
  };

  const handleSaveFees = () => {
    if (!selected) return;
    const hourlyRate = feeDraft.hourlyRate
      ? Number(feeDraft.hourlyRate)
      : null;
    const flatFeeAmount = feeDraft.flatFeeAmount
      ? Number(feeDraft.flatFeeAmount)
      : null;
    const budgetCap = feeDraft.budgetCap ? Number(feeDraft.budgetCap) : null;
    setMatters(
      setMatterFeeTerms(selected.id, {
        feeType: feeDraft.feeType,
        hourlyRate: Number.isFinite(hourlyRate) ? hourlyRate : null,
        flatFeeAmount: Number.isFinite(flatFeeAmount) ? flatFeeAmount : null,
        budgetCap: Number.isFinite(budgetCap) ? budgetCap : null,
        billingHold: feeDraft.billingHold,
      }),
    );
    showToast("Engagement fee terms updated.");
  };

  const handleReview = (reviewed: boolean) => {
    if (!selected) return;
    setMatters(markPartnerReviewed(selected.id, reviewed));
    showToast(
      reviewed
        ? "Marked as reviewed by Managing Partner."
        : "Returned to partner review queue.",
    );
  };

  return (
    <>
      <PageHeader
        title="Firm Matters"
        description="Firm-wide engagement register — lifecycle, fee arrangements, staffing coverage, and partner review. Case work stays in Attorney Hub; WIP/trust stays in Accounting."
      >
        <div className="flex flex-wrap gap-2">
          <Link href="/matters/new">
            <Button>
              <Plus className="h-4 w-4" />
              Create Matter
            </Button>
          </Link>
          <Button
            variant="secondary"
            onClick={() => {
              setMatters(resetFirmPortfolioMatters());
              setFilters(defaultFilters);
              showToast("Partner session edits cleared; Supabase base matters restored.");
            }}
          >
            Reset session edits
          </Button>
        </div>
      </PageHeader>

      {profitReviewed ? (
        <PipelineHandoffBanner
          stage="profit_reviewed"
          title="Profitability reviewed — close the matter to complete the pipeline."
        >
          <PipelineHandoffLink href={buildMatterCloseUrl(closeMatterId ?? undefined)}>
            Open matter close controls
          </PipelineHandoffLink>
        </PipelineHandoffBanner>
      ) : null}

      {submittedRequest ? (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <p className="font-medium">{matterCreationPipelineLabel()} — request submitted.</p>
          <p className="mt-1">
            Switch to the Firm Administrator role and open{" "}
            <Link
              href={buildFirmAdminApprovalsUrl(submittedRequestId ?? undefined)}
              className="font-medium text-green-900 underline underline-offset-2"
            >
              Matter creation approvals
            </Link>{" "}
            to review and approve this request before the matter opens.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="mb-4 text-sm text-red-700">{error}</p>
      ) : null}
      {loading ? (
        <p className="mb-4 text-sm text-muted">Loading firm matters from CounselFlow…</p>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <button
            key={kpi.id}
            type="button"
            className="text-left"
            onClick={() =>
              setFilters((prev) => ({
                ...defaultFilters,
                kpiFilter: prev.kpiFilter === kpi.kpiFilter ? "" : kpi.kpiFilter,
                partnerReviewOnly: kpi.kpiFilter === "partner_review",
              }))
            }
          >
            <KPICard
              title={kpi.title}
              value={kpi.value}
              subtitle={kpi.subtitle}
              icon={
                kpi.id === "unassigned"
                  ? UserX
                  : kpi.id === "review" || kpi.id === "conflict"
                    ? AlertTriangle
                    : Briefcase
              }
              className={cn(
                "h-full transition hover:border-navy-700/40",
                filters.kpiFilter === kpi.kpiFilter && "border-navy-700",
                kpi.warning && "border-amber-300",
              )}
            />
          </button>
        ))}
      </div>

      <Card className="mb-6" padding="none">
        <CardHeader className="border-b border-gray-100">
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Focus the firm portfolio without leaving engagement governance.
          </CardDescription>
        </CardHeader>
        <div className="grid gap-3 p-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="relative md:col-span-2 xl:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              className="pl-9"
              placeholder="Search matter, client, attorney…"
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
            />
          </div>
          <Select
            label="Status"
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, status: e.target.value }))
            }
            options={[
              { value: "all", label: "All statuses" },
              ...Object.entries(LIFECYCLE_LABELS).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
          <Select
            label="Responsible attorney"
            value={filters.attorney}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, attorney: e.target.value }))
            }
            options={[
              { value: "all", label: "All attorneys" },
              { value: "unassigned", label: "Unassigned only" },
              ...attorneys.map((name) => ({ value: name, label: name })),
            ]}
          />
          <Select
            label="Practice area"
            value={filters.practiceArea}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                practiceArea: e.target.value,
              }))
            }
            options={[
              { value: "all", label: "All practice areas" },
              ...practiceAreas.map((area) => ({ value: area, label: area })),
            ]}
          />
          <Select
            label="Fee type"
            value={filters.feeType}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, feeType: e.target.value }))
            }
            options={[
              { value: "all", label: "All fee types" },
              ...Object.entries(FEE_TYPE_LABELS).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
          <Select
            label="Conflict / hold"
            value={filters.conflictHold}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                conflictHold: e.target.value,
              }))
            }
            options={[
              { value: "all", label: "Any risk state" },
              { value: "conflict", label: "Conflict not cleared" },
              { value: "billing_hold", label: "Billing hold" },
              { value: "either", label: "Conflict or billing hold" },
            ]}
          />
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-navy-900">
              <input
                type="checkbox"
                checked={filters.partnerReviewOnly}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    partnerReviewOnly: e.target.checked,
                    kpiFilter: e.target.checked ? "partner_review" : "",
                  }))
                }
                className="rounded border-gray-300"
              />
              Needs partner review
            </label>
          </div>
        </div>
        {(filters.search ||
          filters.kpiFilter ||
          filters.partnerReviewOnly ||
          filters.status !== "all" ||
          filters.attorney !== "all") && (
          <div className="px-6 pb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters(defaultFilters)}
            >
              Clear filters
            </Button>
          </div>
        )}
      </Card>

      <Card padding="none">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-navy-900">
              {filteredMatters.length} matter
              {filteredMatters.length === 1 ? "" : "s"}
            </p>
            <p className="text-xs text-muted">
              Click a row for engagement detail and partner actions.
            </p>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Matter</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Responsible</TableHead>
              <TableHead>Practice</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fee</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading && filteredMatters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted">
                  {error
                    ? "Matters could not be loaded."
                    : matters.length === 0
                      ? "No matters found in CounselFlow."
                      : "No matters match the current filters."}
                </TableCell>
              </TableRow>
            ) : loading ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted">
                  Loading…
                </TableCell>
              </TableRow>
            ) : (
              filteredMatters.map((matter) => {
                const overloaded = isAttorneyOverloaded(
                  matters,
                  matter.responsibleAttorney,
                );
                return (
                  <TableRow
                    key={matter.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => openMatter(matter)}
                  >
                    <TableCell className="font-medium text-navy-900">
                      {matter.matterNumber}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-navy-900">{matter.title}</p>
                      {matter.billingHold && (
                        <p className="text-xs text-amber-700">Billing hold</p>
                      )}
                    </TableCell>
                    <TableCell>{matter.clientName}</TableCell>
                    <TableCell>
                      {matter.responsibleAttorney ? (
                        <span
                          className={cn(
                            overloaded && "font-medium text-amber-800",
                          )}
                        >
                          {matter.responsibleAttorney}
                          {overloaded ? " · overloaded" : ""}
                        </span>
                      ) : (
                        <Badge variant="warning">Unassigned</Badge>
                      )}
                    </TableCell>
                    <TableCell>{matter.practiceArea}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(matter.status)}>
                        {LIFECYCLE_LABELS[matter.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatFeeSummary(matter)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={conflictBadgeVariant(matter.conflictStatus)}>
                        {CONFLICT_STATUS_LABELS[matter.conflictStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {matter.needsPartnerReview ? (
                        <Badge variant="warning">Needs review</Badge>
                      ) : (
                        <span className="text-xs text-muted">Clear</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Drawer
        isOpen={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected?.title ?? "Matter"}
        description={
          selected
            ? `${selected.matterNumber} · ${selected.clientName}`
            : undefined
        }
        className="max-w-2xl"
      >
        {selected && (
          <div className="space-y-6 overflow-y-auto p-6">
            {selected.needsPartnerReview && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <p className="font-semibold">Partner review required</p>
                <p className="mt-1">
                  {selected.partnerReviewReason ??
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
              <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-muted">Practice area</dt>
                  <dd className="font-medium text-navy-900">
                    {selected.practiceArea}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Opened</dt>
                  <dd className="font-medium text-navy-900">
                    {selected.openDate}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Originating attorney</dt>
                  <dd className="font-medium text-navy-900">
                    {selected.originatingAttorney ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Conflict</dt>
                  <dd>
                    <Badge
                      variant={conflictBadgeVariant(selected.conflictStatus)}
                    >
                      {CONFLICT_STATUS_LABELS[selected.conflictStatus]}
                    </Badge>
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted">Scope</dt>
                  <dd className="mt-1 text-navy-900">
                    {selected.engagementScope}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-navy-900">
                Lifecycle controls
              </h3>
              <Select
                label="Matter status"
                value={selected.status}
                onChange={(e) =>
                  handleLifecycle(e.target.value as MatterLifecycleStatus)
                }
                options={Object.entries(LIFECYCLE_LABELS).map(
                  ([value, label]) => ({ value, label }),
                )}
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
                    variant={
                      selected.status === status ? "primary" : "secondary"
                    }
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
                value={selected.responsibleAttorney ?? ""}
                onChange={(e) => handleAssign(e.target.value)}
                options={[
                  { value: "", label: "Unassigned" },
                  ...attorneys.map((name) => ({
                    value: name,
                    label: isAttorneyOverloaded(matters, name)
                      ? `${name} (overloaded)`
                      : name,
                  })),
                ]}
              />
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-navy-900">
                Fee arrangement
              </h3>
              <Select
                label="Fee type"
                value={feeDraft.feeType}
                onChange={(e) =>
                  setFeeDraft((prev) => ({
                    ...prev,
                    feeType: e.target.value as EngagementFeeType,
                  }))
                }
                options={Object.entries(FEE_TYPE_LABELS).map(
                  ([value, label]) => ({ value, label }),
                )}
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  label="Hourly rate"
                  type="number"
                  min={0}
                  value={feeDraft.hourlyRate}
                  onChange={(e) =>
                    setFeeDraft((prev) => ({
                      ...prev,
                      hourlyRate: e.target.value,
                    }))
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
                    setFeeDraft((prev) => ({
                      ...prev,
                      budgetCap: e.target.value,
                    }))
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
                <Link
                  href={receivablesHref({ client: selected.clientName })}
                >
                  <Button size="sm" variant="secondary">
                    Receivables
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </Link>
                <Link
                  href={invoicesHref({ matterId: selected.id })}
                >
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
              <p className="text-xs text-muted">
                Deep links hand off to other modules — this register does not
                rebuild case docs, WIP ledgers, or invoice workflows.
              </p>
            </section>

            {!selected.needsPartnerReview && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleReview(false)}
              >
                Flag for partner review
              </Button>
            )}
          </div>
        )}
      </Drawer>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
