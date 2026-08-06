import type { AmClientEntity } from "@/lib/mock-data/accounting-manager/entities";
import {
  accountingUnavailableMessage,
  asNumber,
  getAccountingSupabase,
  type QueryResult,
} from "./db";

type ClientRow = {
  id: string;
  client_number: string | null;
  name: string;
  primary_contact_name: string | null;
  email: string | null;
  phone: string | null;
};

type ProfileRow = {
  client_id: string;
  responsible_partner: string | null;
  office: string | null;
  billing_preferences: string | null;
  payment_status: string;
  risk_level: string;
};

type InvoiceAgg = {
  client_id: string;
  total_ar: number;
  past_due: number;
  balance_90_plus: number;
};

function daysPastDue(dueDate: string | null): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const now = new Date();
  return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

export async function fetchAccountingClients(): Promise<
  QueryResult<AmClientEntity[]>
> {
  const supabase = getAccountingSupabase();
  if (!supabase) {
    return { data: [], error: accountingUnavailableMessage(), empty: true };
  }

  const [clientsRes, profilesRes, invoicesRes, trustRes, mattersRes, timeRes] =
    await Promise.all([
      supabase
        .from("clients")
        .select(
          "id, client_number, name, primary_contact_name, email, phone",
        )
        .order("name"),
      supabase.from("client_accounting_profiles").select("*"),
      supabase
        .from("invoices")
        .select("client_id, balance_due, due_date, status")
        .gt("balance_due", 0),
      supabase.from("trust_client_ledgers").select("client_id, balance"),
      supabase.from("matters").select("id, client_id, status"),
      supabase
        .from("time_entries")
        .select("matter_id, hours, billable, approval_status, billed")
        .eq("approval_status", "approved")
        .eq("billed", false),
    ]);

  if (clientsRes.error) {
    return { data: [], error: clientsRes.error.message, empty: true };
  }

  const clients = (clientsRes.data ?? []) as ClientRow[];
  const profiles = new Map(
    ((profilesRes.data ?? []) as ProfileRow[]).map((p) => [p.client_id, p]),
  );

  const invoiceAggs = new Map<string, InvoiceAgg>();
  for (const inv of invoicesRes.data ?? []) {
    const cid = inv.client_id as string;
    const bal = asNumber(inv.balance_due);
    const agg = invoiceAggs.get(cid) ?? {
      client_id: cid,
      total_ar: 0,
      past_due: 0,
      balance_90_plus: 0,
    };
    agg.total_ar += bal;
    const past = daysPastDue(inv.due_date as string);
    if (past > 0) agg.past_due += bal;
    if (past > 90) agg.balance_90_plus += bal;
    invoiceAggs.set(cid, agg);
  }

  const trustByClient = new Map<string, number>();
  for (const row of trustRes.data ?? []) {
    const cid = row.client_id as string;
    trustByClient.set(cid, (trustByClient.get(cid) ?? 0) + asNumber(row.balance));
  }

  const openMattersByClient = new Map<string, number>();
  const matterToClient = new Map<string, string>();
  for (const m of mattersRes.data ?? []) {
    matterToClient.set(m.id as string, m.client_id as string);
    if (m.status === "open") {
      const cid = m.client_id as string;
      openMattersByClient.set(cid, (openMattersByClient.get(cid) ?? 0) + 1);
    }
  }

  const wipByClient = new Map<string, number>();
  for (const te of timeRes.data ?? []) {
    if (!te.billable) continue;
    const mid = te.matter_id as string;
    const cid = matterToClient.get(mid);
    if (!cid) continue;
    const hours = asNumber(te.hours);
    wipByClient.set(cid, (wipByClient.get(cid) ?? 0) + hours * 350);
  }

  const rows: AmClientEntity[] = clients.map((c) => {
    const profile = profiles.get(c.id);
    const inv = invoiceAggs.get(c.id);
    return {
      id: c.id,
      name: c.name,
      clientNumber: c.client_number ?? `CL-${c.id.slice(0, 8)}`,
      primaryContact: c.primary_contact_name ?? "—",
      responsiblePartner: profile?.responsible_partner ?? "Unassigned",
      office: profile?.office ?? "Chicago",
      openMatters: openMattersByClient.get(c.id) ?? 0,
      totalAr: inv?.total_ar ?? 0,
      pastDue: inv?.past_due ?? 0,
      balance90Plus: inv?.balance_90_plus ?? 0,
      trustBalance: trustByClient.get(c.id) ?? 0,
      unbilledWip: wipByClient.get(c.id) ?? 0,
      paymentStatus:
        (profile?.payment_status as AmClientEntity["paymentStatus"]) ??
        (inv && inv.past_due > 0 ? "Past Due" : "Current"),
      riskLevel:
        (profile?.risk_level as AmClientEntity["riskLevel"]) ?? "Green",
      email: c.email ?? "",
      phone: c.phone ?? "",
      billingPreferences: profile?.billing_preferences ?? "Net 30",
    };
  });

  return {
    data: rows,
    error: null,
    empty: rows.length === 0,
  };
}
