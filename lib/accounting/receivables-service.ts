import type {
  ArAgingBucket,
  ArAttorneyResponsibility,
  ArClientRiskProfile,
  ArCollectionsRecord,
  ArPaymentException,
  ArSummaryKpi,
  ArWriteOffRequest,
  AgingBucket,
  CollectionEscalationStage,
  CollectionStatus,
} from "@/lib/mock-data/ar-oversight";
import {
  accountingUnavailableMessage,
  asNumber,
  getAccountingSupabase,
  type QueryResult,
} from "./db";

function daysPastDue(dueDate: string | null): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const now = new Date();
  return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

function toAgingBucket(days: number): AgingBucket {
  if (days <= 0) return "Current";
  if (days <= 30) return "1–30 Days";
  if (days <= 60) return "31–60 Days";
  if (days <= 90) return "61–90 Days";
  return "90+ Days";
}

function parseEscalationStage(
  value: unknown,
): CollectionEscalationStage {
  const stage = String(value ?? "reminder");
  if (
    stage === "internal_review" ||
    stage === "write_off_requested" ||
    stage === "external_collections"
  ) {
    return stage;
  }
  return "reminder";
}

function mapCollectionStatus(
  status: string,
  pastDue: number,
): CollectionStatus {
  if (status === "disputed") return "Disputed";
  if (status === "partial") return "Past Due";
  if (pastDue > 0) return "Past Due";
  return "Current";
}

export async function fetchReceivablesWorkspace(): Promise<
  QueryResult<{
    summaryKpis: ArSummaryKpi[];
    agingBuckets: ArAgingBucket[];
    collectionsQueue: ArCollectionsRecord[];
    clientRiskProfiles: ArClientRiskProfile[];
    attorneyResponsibility: ArAttorneyResponsibility[];
    paymentExceptions: ArPaymentException[];
    writeOffRequests: ArWriteOffRequest[];
  }>
> {
  const supabase = getAccountingSupabase();
  const empty = {
    summaryKpis: [],
    agingBuckets: [],
    collectionsQueue: [],
    clientRiskProfiles: [],
    attorneyResponsibility: [],
    paymentExceptions: [],
    writeOffRequests: [],
  };
  if (!supabase) {
    return { data: empty, error: accountingUnavailableMessage(), empty: true };
  }

  const [invoicesRes, writeOffsRes, clientsRes, mattersRes, profilesRes] =
    await Promise.all([
      supabase
        .from("invoices")
        .select("*")
        .gt("balance_due", 0)
        .not("status", "in", '("paid","void","cancelled")')
        .order("due_date"),
      supabase.from("write_off_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("clients").select("id, name"),
      supabase.from("matters").select("id, title, client_id"),
      supabase.from("client_accounting_profiles").select("client_id, responsible_partner, office, risk_level"),
    ]);

  if (invoicesRes.error) {
    return { data: empty, error: invoicesRes.error.message, empty: true };
  }

  const clientNames = new Map(
    (clientsRes.data ?? []).map((c) => [c.id as string, c.name as string]),
  );
  const matterNames = new Map(
    (mattersRes.data ?? []).map((m) => [m.id as string, m.title as string]),
  );
  const profiles = new Map(
    (profilesRes.data ?? []).map((p) => [p.client_id as string, p]),
  );

  const bucketTotals = new Map<AgingBucket, { amount: number; count: number }>();
  for (const b of [
    "Current",
    "1–30 Days",
    "31–60 Days",
    "61–90 Days",
    "90+ Days",
  ] as AgingBucket[]) {
    bucketTotals.set(b, { amount: 0, count: 0 });
  }

  let totalAr = 0;
  let pastDueTotal = 0;
  let balance90Plus = 0;

  const collectionsQueue: ArCollectionsRecord[] = (invoicesRes.data ?? []).map(
    (inv) => {
      const bal = asNumber(inv.balance_due);
      const age = daysPastDue(inv.due_date as string);
      const bucket = toAgingBucket(age);
      const bucketEntry = bucketTotals.get(bucket)!;
      bucketEntry.amount += bal;
      bucketEntry.count += 1;
      totalAr += bal;
      if (age > 0) pastDueTotal += bal;
      if (age > 90) balance90Plus += bal;

      const profile = profiles.get(inv.client_id as string);
      const isException =
        inv.status === "disputed" || age > 60 || inv.reminder_count > 2;
      const exceptionTypes: string[] = [];
      if (inv.status === "disputed") exceptionTypes.push("Disputed");
      if (age > 90) exceptionTypes.push("90+ Days");
      if (inv.reminder_count > 2) exceptionTypes.push("Multiple Reminders");

      return {
        id: inv.id as string,
        invoiceId: inv.id as string,
        clientId: inv.client_id as string,
        matterId: (inv.matter_id as string) ?? "",
        invoiceNumber: inv.invoice_number as string,
        client: clientNames.get(inv.client_id as string) ?? "",
        matter: matterNames.get(inv.matter_id as string) ?? "",
        attorney: (profile?.responsible_partner as string) ?? "Unassigned",
        invoiceDate: inv.invoice_date as string,
        dueDate: inv.due_date as string,
        originalAmount: asNumber(inv.total_amount),
        outstandingBalance: bal,
        ageDays: Math.max(0, age),
        agingBucket: bucket,
        collectionStatus: mapCollectionStatus(inv.status as string, age),
        lastContact: inv.last_reminder_sent
          ? String(inv.last_reminder_sent)
          : "—",
        lastContactDays: inv.last_reminder_sent
          ? daysPastDue(String(inv.last_reminder_sent))
          : 0,
        nextFollowUp: inv.due_date as string,
        assignedCollector: "Collections Team",
        office: (profile?.office as string) ?? "Chicago",
        isException,
        exceptionTypes,
        escalationStage: parseEscalationStage(inv.escalation_stage),
        externalCollectionsApproved: Boolean(inv.external_collections_approved),
        detail: {
          matterNumber: "",
          paymentHistory: `Paid $${asNumber(inv.amount_paid).toLocaleString()}`,
          collectionNotes: (inv.notes as string) ?? "",
          lastAction: inv.last_reminder_sent
            ? `Reminder sent ${inv.last_reminder_sent}`
            : "No recent action",
        },
      };
    },
  );

  const totalForPercent = totalAr || 1;
  const agingBuckets: ArAgingBucket[] = [...bucketTotals.entries()].map(
    ([label, v], i) => ({
      id: `bucket-${i}`,
      label,
      amount: v.amount,
      invoiceCount: v.count,
      percentOfTotal: Math.round((v.amount / totalForPercent) * 100),
    }),
  );

  const clientRiskMap = new Map<string, ArClientRiskProfile>();
  for (const rec of collectionsQueue) {
    const clientId = (invoicesRes.data ?? []).find(
      (i) => i.id === rec.id,
    )?.client_id as string;
    const profile = profiles.get(clientId);
    const existing = clientRiskMap.get(clientId);
    if (!existing) {
      clientRiskMap.set(clientId, {
        id: clientId,
        client: rec.client,
        outstandingBalance: rec.outstandingBalance,
        balance90Plus: rec.agingBucket === "90+ Days" ? rec.outstandingBalance : 0,
        oldestInvoice: rec.dueDate,
        attorney: rec.attorney,
        collectionRisk:
          (profile?.risk_level as ArClientRiskProfile["collectionRisk"]) ?? "Green",
        openDisputes: rec.collectionStatus === "Disputed" ? 1 : 0,
      });
    } else {
      existing.outstandingBalance += rec.outstandingBalance;
      if (rec.agingBucket === "90+ Days") {
        existing.balance90Plus += rec.outstandingBalance;
      }
      if (rec.collectionStatus === "Disputed") existing.openDisputes += 1;
    }
  }

  const pendingWriteOffs = (writeOffsRes.data ?? []).filter(
    (w) => w.status === "pending" || w.status === "under_review",
  );
  const pendingWriteOffAmount = pendingWriteOffs.reduce(
    (s, w) => s + asNumber(w.amount),
    0,
  );

  const summaryKpis: ArSummaryKpi[] = [
    {
      id: "total-ar",
      title: "Total AR",
      value: `$${totalAr.toLocaleString()}`,
      supportingText: `${collectionsQueue.length} open invoices`,
      queueFilter: {},
    },
    {
      id: "past-due",
      title: "Past Due",
      value: `$${pastDueTotal.toLocaleString()}`,
      supportingText: "Requires follow-up",
      warning: pastDueTotal > 0,
      queueFilter: { kpiFilter: "past_due" },
    },
    {
      id: "90-plus",
      title: "90+ Days",
      value: `$${balance90Plus.toLocaleString()}`,
      supportingText: "High-risk aging",
      warning: balance90Plus > 0,
      queueFilter: { agingBucket: "90+ Days" },
    },
    {
      id: "write-offs",
      title: "Write-Off Requests",
      value: `${pendingWriteOffs.length} · $${pendingWriteOffAmount.toLocaleString()}`,
      supportingText: "Awaiting approval",
      warning: pendingWriteOffs.length > 0,
      queueFilter: {},
    },
  ];

  const writeOffRequests: ArWriteOffRequest[] = (writeOffsRes.data ?? []).map(
    (w) => {
      const inv = (invoicesRes.data ?? []).find((i) => i.id === w.invoice_id);
      const age = inv ? daysPastDue(inv.due_date as string) : 0;
      const statusMap: Record<string, ArWriteOffRequest["approvalStatus"]> = {
        pending: "Pending",
        under_review: "Under Review",
        approved: "Approved",
        rejected: "Rejected",
      };
      return {
        id: w.id as string,
        client: clientNames.get(w.client_id as string) ?? "",
        matter: w.matter_id
          ? (matterNames.get(w.matter_id as string) ?? "")
          : "",
        invoice: inv?.invoice_number ?? "",
        originalInvoiceAmount: asNumber(inv?.total_amount),
        outstandingBalance: asNumber(inv?.balance_due),
        requestedAmount: asNumber(w.amount),
        reason: w.reason as string,
        supportingNotes: "",
        requestedBy: (w.requested_by as string) ?? "",
        requestedDate: String(w.created_at).slice(0, 10),
        approvalStatus:
          statusMap[w.status as string] ?? "Pending",
        responsibleAttorney: "Unassigned",
        daysOutstanding: Math.max(0, age),
        priorCollectionActivity: "",
        rejectionReason: (w.rejection_reason as string) ?? undefined,
      };
    },
  );

  return {
    data: {
      summaryKpis,
      agingBuckets,
      collectionsQueue,
      clientRiskProfiles: [...clientRiskMap.values()],
      attorneyResponsibility: [],
      paymentExceptions: [],
      writeOffRequests,
    },
    error: null,
    empty: collectionsQueue.length === 0 && writeOffRequests.length === 0,
  };
}
