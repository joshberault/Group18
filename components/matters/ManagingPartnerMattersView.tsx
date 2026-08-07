"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Briefcase,
  Plus,
  UserX,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { FilterSearchInput } from "@/components/ui/FilterSearchInput";
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
import { CONFLICT_STATUS_LABELS } from "@/lib/clients/types";
import {
  FEE_TYPE_LABELS,
  FIRM_PORTFOLIO_ATTORNEYS,
  formatFeeSummary,
  isAttorneyOverloaded,
  LIFECYCLE_LABELS,
  type FirmPortfolioMatter,
  type MatterLifecycleStatus,
} from "@/lib/matters/firm-portfolio";
import {
  FIRM_PORTFOLIO_UPDATE_EVENT,
  getLiveFirmPortfolioMatters,
  resetFirmPortfolioMatters,
  setFirmPortfolioBase,
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const submittedRequest = searchParams.get("submitted") === "matter-request";
  const submittedRequestId = searchParams.get("requestId");
  const profitReviewed = searchParams.get("submitted") === "profit-reviewed";
  const closeMatterId = searchParams.get("matterId");
  const [matters, setMatters] = useState<FirmPortfolioMatter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MatterFilters>(defaultFilters);
  const [toast, setToast] = useState<string | null>(null);

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
    if (match) router.replace(`/matters/${match.id}`);
  }, [searchParams, matters, router]);

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

  const openMatter = (matter: FirmPortfolioMatter) => {
    router.push(`/matters/${matter.id}`);
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
        <div className="grid items-end gap-3 p-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="md:col-span-2 xl:col-span-1">
            <FilterSearchInput
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
          <div className="flex h-full min-h-[4.25rem] items-end pb-0.5">
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

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
