#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

for (const file of [".env.local", ".env"]) {
  const path = resolve(root, file);
  if (existsSync(path)) dotenv.config({ path });
}

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://yvsaodoslmfoqcyqvyqd.supabase.co";

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PERIOD_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const CHART_OF_ACCOUNTS = [
  ["1010", "Cash – Operating", "Asset"],
  ["1050", "Cash – Trust (IOLTA)", "Asset"],
  ["1200", "Accounts Receivable", "Asset"],
  ["1350", "Work in Process", "Asset"],
  ["2010", "Accounts Payable", "Liability"],
  ["2100", "Client Trust Liability", "Liability"],
  ["2300", "Deferred Revenue", "Liability"],
  ["3000", "Partner Equity", "Equity"],
  ["4100", "Legal Services Revenue", "Revenue"],
  ["6200", "Office Supplies", "Expense"],
  ["6300", "Professional Services", "Expense"],
  ["6400", "Payroll Expense", "Expense"],
];

const JOURNAL_ENTRIES = [
  {
    id: "11111111-1111-4111-8111-111111111101",
    entry_number: "JE-2026-0842",
    entry_date: "2026-08-04",
    description: "August client receipt – Kingsley Orthopedics",
    status: "Posted",
    total_debit: 22400,
    total_credit: 22400,
    created_by: "Automatic",
    posted_at: "2026-08-04T16:00:00Z",
    source_type: "demo_seed",
  },
  {
    id: "11111111-1111-4111-8111-111111111102",
    entry_number: "JE-2026-0841",
    entry_date: "2026-08-03",
    description: "WIP accrual – Kingsley Physician Agreement flat fee",
    status: "Posted",
    total_debit: 8400,
    total_credit: 8400,
    created_by: "Automatic",
    posted_at: "2026-08-03T16:00:00Z",
    source_type: "demo_seed",
  },
  {
    id: "11111111-1111-4111-8111-111111111103",
    entry_number: "JE-2026-0840",
    entry_date: "2026-08-02",
    description: "Office supplies expense allocation",
    status: "Draft",
    total_debit: 1250,
    total_credit: 1250,
    created_by: "Automatic",
    posted_at: null,
    source_type: "demo_seed",
  },
  {
    id: "11111111-1111-4111-8111-111111111104",
    entry_number: "JE-2026-0839",
    entry_date: "2026-08-01",
    description: "Trust transfer to operating",
    status: "Posted",
    total_debit: 2200,
    total_credit: 2200,
    created_by: "Automatic",
    posted_at: "2026-08-01T16:00:00Z",
    source_type: "demo_seed",
  },
  {
    id: "11111111-1111-4111-8111-111111111105",
    entry_number: "JE-2026-0838",
    entry_date: "2026-07-31",
    description: "July payroll accrual",
    status: "Posted",
    total_debit: 18600,
    total_credit: 18600,
    created_by: "Automatic",
    posted_at: "2026-07-31T16:00:00Z",
    source_type: "demo_seed",
  },
  {
    id: "11111111-1111-4111-8111-111111111106",
    entry_number: "JE-2026-0837",
    entry_date: "2026-07-30",
    description: "Professional services – expert witness invoice",
    status: "Draft",
    total_debit: 4200,
    total_credit: 4200,
    created_by: "Automatic",
    posted_at: null,
    source_type: "demo_seed",
  },
  {
    id: "11111111-1111-4111-8111-111111111107",
    entry_number: "JE-2026-0836",
    entry_date: "2026-07-29",
    description: "Deferred revenue recognition – Santos retainer",
    status: "Posted",
    total_debit: 3750,
    total_credit: 3750,
    created_by: "Automatic",
    posted_at: "2026-07-29T16:00:00Z",
    source_type: "demo_seed",
  },
];

const JOURNAL_ENTRY_LINES = [
  ["11111111-1111-4111-8111-111111111101", "1010", "Cash – Operating", "Client payment received", 22400, 0, 1],
  ["11111111-1111-4111-8111-111111111101", "1200", "Accounts Receivable", "Apply to INV-2847", 0, 22400, 2],
  ["11111111-1111-4111-8111-111111111102", "1350", "Work in Process", "Unbilled WIP accrual", 8400, 0, 1],
  ["11111111-1111-4111-8111-111111111102", "4100", "Legal Services Revenue", "Revenue recognition", 0, 8400, 2],
  ["11111111-1111-4111-8111-111111111103", "6200", "Office Supplies", "Q3 supply order", 1250, 0, 1],
  ["11111111-1111-4111-8111-111111111103", "2010", "Accounts Payable", "Vendor invoice pending", 0, 1250, 2],
  ["11111111-1111-4111-8111-111111111104", "1010", "Cash – Operating", "Trust fee transfer", 2200, 0, 1],
  ["11111111-1111-4111-8111-111111111104", "2100", "Client Trust Liability", "Reduce trust liability", 0, 2200, 2],
  ["11111111-1111-4111-8111-111111111105", "6400", "Payroll Expense", "July payroll accrual", 18600, 0, 1],
  ["11111111-1111-4111-8111-111111111105", "2010", "Accounts Payable", "Payroll liability", 0, 18600, 2],
  ["11111111-1111-4111-8111-111111111106", "6300", "Professional Services", "Expert witness fees", 4200, 0, 1],
  ["11111111-1111-4111-8111-111111111106", "2010", "Accounts Payable", "Vendor invoice pending", 0, 4200, 2],
  ["11111111-1111-4111-8111-111111111107", "2300", "Deferred Revenue", "Release deferred retainer", 3750, 0, 1],
  ["11111111-1111-4111-8111-111111111107", "4100", "Legal Services Revenue", "Retainer revenue recognition", 0, 3750, 2],
];

const REVENUE_ITEMS = [
  ["Kingsley Orthopedics", "Kingsley Physician Agreement", "INV-2890", "2026-07-15", 45000, 29400, 15600, "Flat Fee", "Partial"],
  ["Harrison & Wells LLP", "Harrison Wells Office Lease", "INV-2847", "2026-06-20", 48200, 48200, 0, "Accrual", "Recognized"],
  ["Grace Nguyen", "Nguyen Executive Separation", "INV-2901", "2026-07-28", 36850, 14200, 22650, "Accrual", "Deferred"],
  ["Foxtail Retail Group", "Foxtail Vendor Contract Review", "INV-2918", "2026-08-01", 22800, 0, 22800, "Milestone", "Pending"],
  ["Elena Park", "Park v. Metro Transit — Personal Injury", "INV-2915", "2026-07-22", 18400, 18400, 0, "Cash", "Recognized"],
];

const CLOSE_TASKS = [
  ["Reconcile all trust accounts", "Trust", "Alex Morgan", "2026-08-05", "Complete", []],
  ["Reconcile operating bank accounts", "Banking", "Alex Morgan", "2026-08-05", "In Progress", []],
  ["Post WIP accrual entries", "Revenue", "Alex Morgan", "2026-08-06", "In Progress", ["Reconcile operating bank accounts"]],
  ["Review deferred revenue schedule", "Revenue", "Alex Morgan", "2026-08-06", "Not Started", ["Post WIP accrual entries"]],
  ["Accrue unbilled expenses", "Expenses", "Alex Morgan", "2026-08-07", "Not Started", []],
  ["Run trial balance", "GL", "Alex Morgan", "2026-08-07", "Blocked", ["Post WIP accrual entries", "Review deferred revenue schedule", "Accrue unbilled expenses"]],
  ["Partner equity allocation", "GL", "Robert Morgan", "2026-08-08", "Not Started", ["Run trial balance"]],
  ["Generate P&L draft", "Reporting", "Alex Morgan", "2026-08-08", "Not Started", ["Run trial balance"]],
  ["Generate balance sheet draft", "Reporting", "Alex Morgan", "2026-08-08", "Not Started", ["Run trial balance"]],
  ["Review AP aging", "AP", "Alex Morgan", "2026-08-06", "Complete", []],
  ["Lock accounting period", "Administration", "Alex Morgan", "2026-08-09", "Not Started", ["Partner equity allocation", "Generate P&L draft", "Generate balance sheet draft"]],
  ["Archive close documentation", "Administration", "Alex Morgan", "2026-08-09", "Not Started", ["Lock accounting period"]],
  ["Notify partners of close completion", "Administration", "Alex Morgan", "2026-08-10", "Not Started", ["Lock accounting period"]],
];

async function findClientId(clientName) {
  const { data, error } = await sb
    .from("clients")
    .select("id")
    .or(`name.eq.${clientName},company_name.eq.${clientName}`)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

async function findMatterId(clientId, matterTitle) {
  const { data, error } = await sb
    .from("matters")
    .select("id")
    .eq("client_id", clientId)
    .eq("title", matterTitle)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

async function main() {
  console.log("Seeding chart of accounts...");
  const { error: coaErr } = await sb.from("chart_of_accounts").upsert(
    CHART_OF_ACCOUNTS.map(([account_code, account_name, account_type]) => ({
      account_code,
      account_name,
      account_type,
      is_active: true,
    })),
    { onConflict: "account_code" },
  );
  if (coaErr) throw coaErr;

  console.log("Seeding accounting period...");
  const { error: periodErr } = await sb.from("accounting_periods").upsert(
    {
      id: PERIOD_ID,
      period_label: "August 2026",
      start_date: "2026-08-01",
      end_date: "2026-08-31",
      status: "Open",
    },
    { onConflict: "period_label" },
  );
  if (periodErr) throw periodErr;

  const { data: periodRow, error: periodLookupErr } = await sb
    .from("accounting_periods")
    .select("id")
    .eq("period_label", "August 2026")
    .single();
  if (periodLookupErr) throw periodLookupErr;

  console.log("Seeding journal entries...");
  const { error: jeErr } = await sb.from("journal_entries").upsert(JOURNAL_ENTRIES, {
    onConflict: "entry_number",
  });
  if (jeErr) throw jeErr;

  const { data: seededEntries, error: seededEntriesErr } = await sb
    .from("journal_entries")
    .select("id")
    .eq("source_type", "demo_seed");
  if (seededEntriesErr) throw seededEntriesErr;

  const entryIds = (seededEntries ?? []).map((row) => row.id);
  if (entryIds.length > 0) {
    const { error: deleteLinesErr } = await sb
      .from("journal_entry_lines")
      .delete()
      .in("journal_entry_id", entryIds);
    if (deleteLinesErr) throw deleteLinesErr;
  }

  console.log("Seeding journal entry lines...");
  const { error: linesErr } = await sb.from("journal_entry_lines").insert(
    JOURNAL_ENTRY_LINES.map(
      ([journal_entry_id, account_code, account_name, description, debit, credit, sort_order]) => ({
        journal_entry_id,
        account_code,
        account_name,
        description,
        debit,
        credit,
        sort_order,
      }),
    ),
  );
  if (linesErr) throw linesErr;

  console.log("Seeding revenue recognition items...");
  const { error: deleteRevErr } = await sb
    .from("revenue_recognition_items")
    .delete()
    .eq("period_label", "August 2026");
  if (deleteRevErr) throw deleteRevErr;

  const revenueRows = [];
  for (const row of REVENUE_ITEMS) {
    const [
      clientName,
      matterTitle,
      invoice_number,
      invoice_date,
      total_amount,
      recognized_amount,
      deferred_amount,
      recognition_method,
      status,
    ] = row;
    const client_id = await findClientId(clientName);
    const matter_id = client_id ? await findMatterId(client_id, matterTitle) : null;
    if (!client_id || !matter_id) {
      console.warn(`Skipping revenue item (missing client/matter): ${clientName} / ${matterTitle}`);
      continue;
    }
    revenueRows.push({
      client_id,
      matter_id,
      invoice_number,
      invoice_date,
      total_amount,
      recognized_amount,
      deferred_amount,
      recognition_method,
      status,
      period_label: "August 2026",
    });
  }

  if (revenueRows.length > 0) {
    const { error: revErr } = await sb.from("revenue_recognition_items").insert(revenueRows);
    if (revErr) throw revErr;
  }

  console.log("Seeding month-end close tasks...");
  const { error: deleteTasksErr } = await sb
    .from("month_end_close_tasks")
    .delete()
    .eq("period_id", periodRow.id);
  if (deleteTasksErr) throw deleteTasksErr;

  const { error: tasksErr } = await sb.from("month_end_close_tasks").insert(
    CLOSE_TASKS.map(([task, category, assignee, due_date, status, dependencies]) => ({
      period_id: periodRow.id,
      task,
      category,
      assignee,
      due_date,
      status,
      dependencies,
    })),
  );
  if (tasksErr) throw tasksErr;

  console.log("Revenue ledger seed applied successfully.");
}

main().catch((err) => {
  console.error("Seed failed:", err.message ?? err);
  process.exit(1);
});
