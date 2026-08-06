#!/usr/bin/env node
/**
 * Seeds 15 active clients across the contract-to-cash pipeline in Group 18 Supabase.
 *
 * Usage:
 *   node scripts/seed-fifteen-client-pipeline.mjs
 *
 * Requires one of:
 *   - SUPABASE_SERVICE_ROLE_KEY in .env.local (recommended)
 *   - DATABASE_URL or SUPABASE_DB_PASSWORD for direct SQL (applies RLS + seed)
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

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
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const PROFILE_ID = "4a0bef63-d0d2-4ca9-aa8f-69082b6c5384";
const TRUST_ACCOUNT_ID = "dddd0101-0001-4001-8001-000000000001";

const PRACTICE = {
  litigation: "d4e1bd24-0f84-475b-8353-d3fe57d62215",
  corporate: "85e83475-a571-485d-b68c-a57b1089a7c4",
  realEstate: "819de1f2-d9d7-4cd0-8cf3-01638b14307b",
  employment: "5b25138c-a451-4925-b3b9-e1be2e9097d1",
  ip: "135b6bf2-fa11-4c9b-9e1d-84012059c3a8",
};

/** Lead attorney profile per practice area (matches specialty_attorney_profiles migration). */
const ATTORNEY_BY_PRACTICE = {
  [PRACTICE.corporate]: "bbbb0101-0001-4001-8001-000000000001",
  [PRACTICE.employment]: "bbbb0102-0001-4001-8001-000000000002",
  [PRACTICE.litigation]: PROFILE_ID,
  [PRACTICE.realEstate]: "bbbb0103-0001-4001-8001-000000000003",
  [PRACTICE.ip]: "bbbb0101-0001-4001-8001-000000000001",
};

function leadAttorneyForPracticeAreaId(practiceAreaId) {
  return ATTORNEY_BY_PRACTICE[practiceAreaId] ?? PROFILE_ID;
}

function loadSql(name) {
  return readFileSync(resolve(root, "supabase/migrations", name), "utf8");
}

async function runSqlFile(client, filename) {
  const sql = loadSql(filename);
  await client.query(sql);
  console.log(`Applied ${filename}`);
}

async function tryPg() {
  const password = process.env.SUPABASE_DB_PASSWORD;
  const databaseUrl =
    process.env.DATABASE_URL ||
    (password
      ? `postgresql://postgres.yvsaodoslmfoqcyqvyqd:${encodeURIComponent(password)}@aws-0-us-east-2.pooler.supabase.com:6543/postgres`
      : null);

  if (!databaseUrl) return null;

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    return client;
  } catch (err) {
    console.warn("Postgres connection failed:", err.message);
    return null;
  }
}

function supabase() {
  if (!SUPABASE_KEY) {
    throw new Error("Missing Supabase key in environment.");
  }
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function clearExisting(sb) {
  const tables = [
    "journal_entry_lines",
    "journal_entries",
    "invoice_write_down_lines",
    "invoice_expense_lines",
    "invoice_time_lines",
    "payments",
    "write_downs",
    "expenses",
    "invoices",
    "time_entries",
    "expense_submissions",
    "tasks",
    "deadlines",
    "attorney_notes",
    "matter_assignments",
    "trust_client_ledgers",
    "matters",
    "client_schedule_events",
    "clients",
  ];

  for (const table of tables) {
    const { error } = await sb.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error && !error.message.includes("schema cache")) {
      console.warn(`Clear ${table}:`, error.message);
    }
  }
}

const clients = [
  {
    id: "cccc0101-0001-4001-8001-000000000001",
    client_number: "CL-2001",
    client_type: "individual",
    status: "active",
    first_name: "Ava",
    last_name: "Mitchell",
    name: "Ava Mitchell",
    email: "ava.mitchell@example.com",
    phone: "(312) 555-0101",
    city: "Chicago",
    state: "IL",
    conflict_check_status: "not_reviewed",
    notes: "Pipeline stage: client created — intake scheduled.",
  },
  {
    id: "cccc0102-0001-4001-8001-000000000002",
    client_number: "CL-2002",
    client_type: "company",
    status: "active",
    company_name: "Brookside Logistics Inc.",
    name: "Brookside Logistics Inc.",
    email: "legal@brookside-logistics.example",
    phone: "(312) 555-0102",
    city: "Evanston",
    state: "IL",
    conflict_check_status: "not_reviewed",
    notes: "Pipeline stage: client created — awaiting intake documents.",
  },
  {
    id: "cccc0103-0001-4001-8001-000000000003",
    client_number: "CL-2003",
    client_type: "individual",
    status: "active",
    first_name: "Cameron",
    last_name: "Ellis",
    name: "Cameron Ellis",
    email: "cameron.ellis@example.com",
    conflict_check_status: "cleared",
    conflict_checked_by: "Firm Administrator",
    conflict_checked_at: "2026-07-15T15:00:00Z",
    notes: "Pipeline stage: conflict checked — cleared for engagement setup.",
  },
  {
    id: "cccc0104-0001-4001-8001-000000000004",
    client_number: "CL-2004",
    client_type: "company",
    status: "active",
    company_name: "Delta Health Partners",
    name: "Delta Health Partners",
    email: "compliance@deltahealth.example",
    conflict_check_status: "cleared",
    conflict_checked_by: "Firm Administrator",
    conflict_checked_at: "2026-07-18T16:30:00Z",
    notes: "Pipeline stage: conflict checked — no adverse parties identified.",
  },
  {
    id: "cccc0105-0001-4001-8001-000000000005",
    client_number: "CL-2005",
    client_type: "individual",
    status: "active",
    first_name: "Elena",
    last_name: "Park",
    name: "Elena Park",
    email: "elena.park@example.com",
    conflict_check_status: "cleared",
    conflict_checked_by: "Firm Administrator",
    conflict_checked_at: "2026-07-20T10:00:00Z",
  },
  {
    id: "cccc0106-0001-4001-8001-000000000006",
    client_number: "CL-2006",
    client_type: "company",
    status: "active",
    company_name: "Foxtail Retail Group",
    name: "Foxtail Retail Group",
    email: "legal@foxtailretail.example",
    conflict_check_status: "cleared",
    conflict_checked_by: "Firm Administrator",
    conflict_checked_at: "2026-07-22T11:00:00Z",
  },
  {
    id: "cccc0107-0001-4001-8001-000000000007",
    client_number: "CL-2007",
    client_type: "individual",
    status: "active",
    first_name: "Grace",
    last_name: "Nguyen",
    name: "Grace Nguyen",
    email: "grace.nguyen@example.com",
    conflict_check_status: "cleared",
    conflict_checked_by: "Firm Administrator",
    conflict_checked_at: "2026-07-25T09:00:00Z",
  },
  {
    id: "cccc0108-0001-4001-8001-000000000008",
    client_number: "CL-2008",
    client_type: "company",
    status: "active",
    company_name: "Harrison & Wells LLP",
    name: "Harrison & Wells LLP",
    email: "admin@harrisonwells.example",
    conflict_check_status: "cleared",
    conflict_checked_by: "Firm Administrator",
    conflict_checked_at: "2026-07-28T14:00:00Z",
  },
  {
    id: "cccc0109-0001-4001-8001-000000000009",
    client_number: "CL-2009",
    client_type: "individual",
    status: "active",
    first_name: "Ivy",
    last_name: "Stone",
    name: "Ivy Stone",
    email: "ivy.stone@example.com",
    conflict_check_status: "cleared",
    conflict_checked_by: "Firm Administrator",
    conflict_checked_at: "2026-08-01T10:00:00Z",
  },
  {
    id: "cccc0110-0001-4001-8001-000000000010",
    client_number: "CL-2010",
    client_type: "company",
    status: "active",
    company_name: "Jade Innovations LLC",
    name: "Jade Innovations LLC",
    email: "counsel@jadeinnovations.example",
    conflict_check_status: "cleared",
    conflict_checked_by: "Firm Administrator",
    conflict_checked_at: "2026-08-02T11:00:00Z",
  },
  {
    id: "cccc0111-0001-4001-8001-000000000011",
    client_number: "CL-2011",
    client_type: "company",
    status: "active",
    company_name: "Kingsley Orthopedics",
    name: "Kingsley Orthopedics",
    email: "billing@kingsleyortho.example",
    conflict_check_status: "cleared",
    conflict_checked_by: "Firm Administrator",
    conflict_checked_at: "2026-06-10T10:00:00Z",
  },
  {
    id: "cccc0112-0001-4001-8001-000000000012",
    client_number: "CL-2012",
    client_type: "company",
    status: "active",
    company_name: "Lumen Energy Co.",
    name: "Lumen Energy Co.",
    email: "ap@lumenenergy.example",
    conflict_check_status: "cleared",
    conflict_checked_by: "Firm Administrator",
    conflict_checked_at: "2026-05-20T10:00:00Z",
  },
  {
    id: "cccc0113-0001-4001-8001-000000000013",
    client_number: "CL-2013",
    client_type: "company",
    status: "active",
    company_name: "Meridian Foods",
    name: "Meridian Foods",
    email: "finance@meridianfoods.example",
    conflict_check_status: "cleared",
    conflict_checked_by: "Firm Administrator",
    conflict_checked_at: "2026-04-15T10:00:00Z",
  },
  {
    id: "cccc0114-0001-4001-8001-000000000014",
    client_number: "CL-2014",
    client_type: "company",
    status: "active",
    company_name: "Northgate Developers",
    name: "Northgate Developers",
    email: "legal@northgatedev.example",
    conflict_check_status: "cleared",
    conflict_checked_by: "Firm Administrator",
    conflict_checked_at: "2026-03-01T10:00:00Z",
  },
  {
    id: "cccc0115-0001-4001-8001-000000000015",
    client_number: "CL-2015",
    client_type: "company",
    status: "active",
    company_name: "Oakwood Family Trust",
    name: "Oakwood Family Trust",
    email: "trustee@oakwoodfamily.example",
    conflict_check_status: "cleared",
    conflict_checked_by: "Firm Administrator",
    conflict_checked_at: "2026-01-10T10:00:00Z",
  },
];

const matters = [
  {
    id: "aaaa0105-0001-4001-8001-000000000005",
    client_id: "cccc0105-0001-4001-8001-000000000005",
    practice_area_id: PRACTICE.litigation,
    title: "Park v. Metro Transit — Personal Injury",
    status: "open",
    billing_type: "hourly",
    hourly_rate: 325,
    description: "Matter opened; engagement letter pending.",
  },
  {
    id: "aaaa0106-0001-4001-8001-000000000006",
    client_id: "cccc0106-0001-4001-8001-000000000006",
    practice_area_id: PRACTICE.corporate,
    title: "Foxtail Vendor Contract Review",
    status: "open",
    billing_type: "fixed_fee",
    fixed_fee_amount: 12000,
    description: "Matter opened for retail vendor agreement review.",
  },
  {
    id: "aaaa0107-0001-4001-8001-000000000007",
    client_id: "cccc0107-0001-4001-8001-000000000007",
    practice_area_id: PRACTICE.employment,
    title: "Nguyen Executive Separation",
    status: "open",
    billing_type: "hourly",
    hourly_rate: 350,
    engagement_letter_url: "https://demo.counselflow.example/engagements/nguyen-separation.pdf",
    description: "Engagement approved — separation and release negotiation.",
  },
  {
    id: "aaaa0108-0001-4001-8001-000000000008",
    client_id: "cccc0108-0001-4001-8001-000000000008",
    practice_area_id: PRACTICE.realEstate,
    title: "Harrison Wells Office Lease",
    status: "open",
    billing_type: "hourly",
    hourly_rate: 295,
    engagement_letter_url: "https://demo.counselflow.example/engagements/harrison-lease.pdf",
    description: "Engagement approved — downtown lease amendment.",
  },
  {
    id: "aaaa0109-0001-4001-8001-000000000009",
    client_id: "cccc0109-0001-4001-8001-000000000009",
    practice_area_id: PRACTICE.litigation,
    title: "Stone Insurance Coverage Dispute",
    status: "open",
    billing_type: "hourly",
    hourly_rate: 325,
    engagement_letter_url: "https://demo.counselflow.example/engagements/stone-coverage.pdf",
    description: "Substantive work complete — ready for billing review.",
  },
  {
    id: "aaaa0110-0001-4001-8001-000000000010",
    client_id: "cccc0110-0001-4001-8001-000000000010",
    practice_area_id: PRACTICE.ip,
    title: "Jade Patent Portfolio Review",
    status: "open",
    billing_type: "hourly",
    hourly_rate: 375,
    engagement_letter_url: "https://demo.counselflow.example/engagements/jade-patent.pdf",
    description: "Work completed — prebill package with counsel.",
  },
  {
    id: "aaaa0111-0001-4001-8001-000000000011",
    client_id: "cccc0111-0001-4001-8001-000000000011",
    practice_area_id: PRACTICE.corporate,
    title: "Kingsley Physician Agreement",
    status: "open",
    billing_type: "hourly",
    hourly_rate: 340,
    engagement_letter_url: "https://demo.counselflow.example/engagements/kingsley-physician.pdf",
  },
  {
    id: "aaaa0112-0001-4001-8001-000000000012",
    client_id: "cccc0112-0001-4001-8001-000000000012",
    practice_area_id: PRACTICE.litigation,
    title: "Lumen Regulatory Response",
    status: "open",
    billing_type: "hourly",
    hourly_rate: 360,
    engagement_letter_url: "https://demo.counselflow.example/engagements/lumen-regulatory.pdf",
  },
  {
    id: "aaaa0113-0001-4001-8001-000000000013",
    client_id: "cccc0113-0001-4001-8001-000000000013",
    practice_area_id: PRACTICE.employment,
    title: "Meridian HR Policy Overhaul",
    status: "open",
    billing_type: "hourly",
    hourly_rate: 330,
    engagement_letter_url: "https://demo.counselflow.example/engagements/meridian-hr.pdf",
  },
  {
    id: "aaaa0114-0001-4001-8001-000000000014",
    client_id: "cccc0114-0001-4001-8001-000000000014",
    practice_area_id: PRACTICE.realEstate,
    title: "Northgate Mixed-Use Development",
    status: "open",
    billing_type: "hourly",
    hourly_rate: 350,
    engagement_letter_url: "https://demo.counselflow.example/engagements/northgate-development.pdf",
  },
  {
    id: "aaaa0115-0001-4001-8001-000000000015",
    client_id: "cccc0115-0001-4001-8001-000000000015",
    practice_area_id: PRACTICE.corporate,
    title: "Oakwood Estate Administration",
    status: "closed",
    billing_type: "fixed_fee",
    fixed_fee_amount: 11850,
    engagement_letter_url: "https://demo.counselflow.example/engagements/oakwood-estate.pdf",
    description: "Matter closed — full contract-to-cash cycle complete.",
  },
];

const invoices = [
  {
    id: "ffff0111-0001-4001-8001-000000000011",
    matter_id: "aaaa0111-0001-4001-8001-000000000011",
    client_id: "cccc0111-0001-4001-8001-000000000011",
    invoice_number: "CF-2026-0111",
    status: "sent",
    billing_type: "hourly",
    invoice_date: "2026-07-28",
    due_date: "2026-08-27",
    sent_at: "2026-07-28T16:00:00Z",
    subtotal_time: 4200,
    subtotal_expenses: 350,
    subtotal_fees: 0,
    tax_amount: 0,
    retainer_applied: 0,
    total_amount: 4550,
    amount_paid: 0,
    amount_written_down: 0,
    balance_due: 4550,
  },
  {
    id: "ffff0112-0001-4001-8001-000000000012",
    matter_id: "aaaa0112-0001-4001-8001-000000000012",
    client_id: "cccc0112-0001-4001-8001-000000000012",
    invoice_number: "CF-2026-0112",
    status: "overdue",
    billing_type: "hourly",
    invoice_date: "2026-06-15",
    due_date: "2026-07-15",
    sent_at: "2026-06-15T14:00:00Z",
    subtotal_time: 5850,
    subtotal_expenses: 350,
    subtotal_fees: 0,
    tax_amount: 0,
    retainer_applied: 0,
    total_amount: 6200,
    amount_paid: 0,
    amount_written_down: 0,
    balance_due: 6200,
  },
  {
    id: "ffff0113-0001-4001-8001-000000000013",
    matter_id: "aaaa0113-0001-4001-8001-000000000013",
    client_id: "cccc0113-0001-4001-8001-000000000013",
    invoice_number: "CF-2026-0113",
    status: "partial",
    billing_type: "hourly",
    invoice_date: "2026-06-01",
    due_date: "2026-07-01",
    sent_at: "2026-06-01T12:00:00Z",
    subtotal_time: 4800,
    subtotal_expenses: 300,
    subtotal_fees: 0,
    tax_amount: 0,
    retainer_applied: 0,
    total_amount: 5100,
    amount_paid: 3000,
    amount_written_down: 0,
    balance_due: 2100,
  },
  {
    id: "ffff0114-0001-4001-8001-000000000014",
    matter_id: "aaaa0114-0001-4001-8001-000000000014",
    client_id: "cccc0114-0001-4001-8001-000000000014",
    invoice_number: "CF-2026-0114",
    status: "paid",
    billing_type: "hourly",
    invoice_date: "2026-05-10",
    due_date: "2026-06-10",
    sent_at: "2026-05-10T10:00:00Z",
    paid_at: "2026-05-28T15:00:00Z",
    subtotal_time: 9200,
    subtotal_expenses: 600,
    subtotal_fees: 0,
    tax_amount: 0,
    retainer_applied: 0,
    total_amount: 9800,
    amount_paid: 9800,
    amount_written_down: 0,
    balance_due: 0,
  },
  {
    id: "ffff0115-0001-4001-8001-000000000015",
    matter_id: "aaaa0115-0001-4001-8001-000000000015",
    client_id: "cccc0115-0001-4001-8001-000000000015",
    invoice_number: "CF-2026-0115",
    status: "paid",
    billing_type: "fixed_fee",
    invoice_date: "2026-02-20",
    due_date: "2026-03-22",
    sent_at: "2026-02-20T11:00:00Z",
    paid_at: "2026-03-05T16:00:00Z",
    subtotal_time: 0,
    subtotal_expenses: 0,
    subtotal_fees: 11850,
    tax_amount: 0,
    retainer_applied: 0,
    total_amount: 11850,
    amount_paid: 11850,
    amount_written_down: 0,
    balance_due: 0,
  },
];

async function seed(sb) {
  console.log("Clearing prior engagement data…");
  await clearExisting(sb);

  console.log("Inserting 15 clients…");
  const { error: clientErr } = await sb.from("clients").insert(
    clients.map((c) => ({
      ...c,
      is_company: c.client_type === "company",
      conflict_flag: c.conflict_check_status === "possible_conflict",
    })),
  );
  if (clientErr) throw new Error(`clients: ${clientErr.message}`);

  const scheduleEvents = [
    {
      client_id: "cccc0103-0001-4001-8001-000000000003",
      title: "Conflict clearance follow-up",
      event_date: "2026-08-10",
      event_type: "follow_up",
    },
    {
      client_id: "cccc0104-0001-4001-8001-000000000004",
      title: "Engagement planning call",
      event_date: "2026-08-12",
      event_type: "follow_up",
    },
  ];
  await sb.from("client_schedule_events").insert(scheduleEvents);

  console.log("Inserting matters…");
  const { error: matterErr } = await sb.from("matters").insert(matters);
  if (matterErr) throw new Error(`matters: ${matterErr.message}`);

  const assignments = matters.map((m) => ({
    matter_id: m.id,
    profile_id: leadAttorneyForPracticeAreaId(m.practice_area_id),
    role_on_matter: "lead_attorney",
  }));
  await sb.from("matter_assignments").insert(assignments);

  const tasks = [
    {
      id: "bbbb0105-0001-4001-8001-000000000005",
      matter_id: "aaaa0105-0001-4001-8001-000000000005",
      profile_id: PROFILE_ID,
      title: "Draft engagement letter",
      status: "open",
      due_date: "2026-08-15",
    },
    {
      id: "bbbb0107-0001-4001-8001-000000000007",
      matter_id: "aaaa0107-0001-4001-8001-000000000007",
      profile_id: PROFILE_ID,
      title: "Prepare separation term sheet",
      status: "in_progress",
      due_date: "2026-08-18",
    },
    {
      id: "bbbb0109-0001-4001-8001-000000000009",
      matter_id: "aaaa0109-0001-4001-8001-000000000009",
      profile_id: PROFILE_ID,
      title: "Finalize coverage brief",
      status: "completed",
      due_date: "2026-08-01",
    },
    {
      id: "bbbb0110-0001-4001-8001-000000000010",
      matter_id: "aaaa0110-0001-4001-8001-000000000010",
      profile_id: PROFILE_ID,
      title: "Deliver patent landscape memo",
      status: "completed",
      due_date: "2026-08-03",
    },
  ];
  await sb.from("tasks").insert(tasks);

  const timeEntries = [
    {
      id: "eeee0107-0001-4001-8001-000000000007",
      matter_id: "aaaa0107-0001-4001-8001-000000000007",
      profile_id: PROFILE_ID,
      entry_date: "2026-08-02",
      hours: 2.5,
      description: "Review draft separation agreement",
      status: "pending",
      is_billable: true,
    },
    {
      id: "eeee0201-0001-4001-8001-000000000009",
      matter_id: "aaaa0109-0001-4001-8001-000000000009",
      profile_id: PROFILE_ID,
      entry_date: "2026-07-25",
      hours: 8,
      description: "Coverage research and memo drafting",
      status: "approved",
      is_billable: true,
    },
    {
      id: "eeee0202-0001-4001-8001-000000000009",
      matter_id: "aaaa0109-0001-4001-8001-000000000009",
      profile_id: PROFILE_ID,
      entry_date: "2026-07-28",
      hours: 4,
      description: "Client strategy session",
      status: "approved",
      is_billable: true,
    },
    {
      id: "eeee0203-0001-4001-8001-000000000010",
      matter_id: "aaaa0110-0001-4001-8001-000000000010",
      profile_id: PROFILE_ID,
      entry_date: "2026-08-01",
      hours: 10,
      description: "Patentability analysis",
      status: "approved",
      is_billable: true,
    },
    {
      id: "eeee0204-0001-4001-8001-000000000011",
      matter_id: "aaaa0111-0001-4001-8001-000000000011",
      profile_id: PROFILE_ID,
      entry_date: "2026-07-20",
      hours: 12,
      description: "Physician agreement negotiation",
      status: "approved",
      is_billable: true,
    },
    {
      id: "eeee0205-0001-4001-8001-000000000012",
      matter_id: "aaaa0112-0001-4001-8001-000000000012",
      profile_id: PROFILE_ID,
      entry_date: "2026-06-01",
      hours: 16,
      description: "Regulatory response drafting",
      status: "approved",
      is_billable: true,
    },
  ];
  const { error: timeErr } = await sb.from("time_entries").insert(timeEntries);
  if (timeErr) throw new Error(`time_entries: ${timeErr.message}`);

  const expenseSubmissions = [
    {
      id: "eeee0109-0001-4001-8001-000000000009",
      matter_id: "aaaa0109-0001-4001-8001-000000000009",
      profile_id: PROFILE_ID,
      expense_date: "2026-07-26",
      amount: 185,
      description: "Westlaw research charges",
      status: "approved",
    },
    {
      id: "eeee0111-0001-4001-8001-000000000011",
      matter_id: "aaaa0111-0001-4001-8001-000000000011",
      profile_id: PROFILE_ID,
      expense_date: "2026-07-18",
      amount: 350,
      description: "Courier and filing fees",
      status: "approved",
    },
  ];
  await sb.from("expense_submissions").insert(expenseSubmissions);

  console.log("Inserting invoices and payments…");
  const invoiceRows = invoices.map((inv) => ({
    ...inv,
    created_by: PROFILE_ID,
  }));
  const { error: invErr } = await sb.from("invoices").insert(invoiceRows);
  if (invErr) throw new Error(`invoices: ${invErr.message}`);

  await sb.from("invoice_time_lines").insert([
    {
      id: "ffff1011-0001-4001-8001-000000000011",
      invoice_id: "ffff0111-0001-4001-8001-000000000011",
      time_entry_id: "eeee0204-0001-4001-8001-000000000011",
      work_date: "2026-07-20",
      attorney_name: "George Giddens",
      description: "Physician agreement negotiation",
      hours: 12,
      rate: 340,
      amount: 4080,
      sort_order: 1,
    },
  ]);

  const payments = [
    {
      id: "dddd0113-0001-4001-8001-000000000013",
      invoice_id: "ffff0113-0001-4001-8001-000000000013",
      matter_id: "aaaa0113-0001-4001-8001-000000000013",
      client_id: "cccc0113-0001-4001-8001-000000000013",
      recorded_by: PROFILE_ID,
      payment_date: "2026-06-20",
      amount: 3000,
      payment_method: "ach",
      status: "completed",
      reference_number: "ACH-44102",
    },
    {
      id: "dddd0114-0001-4001-8001-000000000014",
      invoice_id: "ffff0114-0001-4001-8001-000000000014",
      matter_id: "aaaa0114-0001-4001-8001-000000000014",
      client_id: "cccc0114-0001-4001-8001-000000000014",
      recorded_by: PROFILE_ID,
      payment_date: "2026-05-28",
      amount: 9800,
      payment_method: "wire",
      status: "completed",
      reference_number: "WIRE-88231",
    },
    {
      id: "dddd0115-0001-4001-8001-000000000015",
      invoice_id: "ffff0115-0001-4001-8001-000000000015",
      matter_id: "aaaa0115-0001-4001-8001-000000000015",
      client_id: "cccc0115-0001-4001-8001-000000000015",
      recorded_by: PROFILE_ID,
      payment_date: "2026-03-05",
      amount: 11850,
      payment_method: "check",
      status: "completed",
      reference_number: "CHK-55019",
    },
  ];
  const { error: payErr } = await sb.from("payments").insert(payments);
  if (payErr) throw new Error(`payments: ${payErr.message}`);

  const journalEntries = [
    {
      id: "bbbb0114-0001-4001-8001-000000000014",
      entry_number: "JE-2026-0114",
      entry_date: "2026-05-28",
      description: "Recognize Northgate development revenue",
      status: "Posted",
      total_debit: 9800,
      total_credit: 9800,
      source_type: "invoice",
      source_id: "ffff0114-0001-4001-8001-000000000014",
      posted_at: "2026-05-28T15:30:00Z",
    },
    {
      id: "bbbb0115-0001-4001-8001-000000000015",
      entry_number: "JE-2026-0115",
      entry_date: "2026-03-05",
      description: "Recognize Oakwood estate administration revenue",
      status: "Posted",
      total_debit: 11850,
      total_credit: 11850,
      source_type: "invoice",
      source_id: "ffff0115-0001-4001-8001-000000000015",
      posted_at: "2026-03-05T16:30:00Z",
    },
  ];
  const { error: jeErr } = await sb.from("journal_entries").insert(journalEntries);
  if (jeErr) throw new Error(`journal_entries: ${jeErr.message}`);

  await sb.from("journal_entry_lines").insert([
    {
      id: "ffff2001-0001-4001-8001-000000000014",
      journal_entry_id: "bbbb0114-0001-4001-8001-000000000014",
      account_code: "1010",
      account_name: "Operating Cash",
      description: "Wire receipt — Northgate",
      debit: 9800,
      credit: 0,
      sort_order: 0,
    },
    {
      id: "ffff2002-0001-4001-8001-000000000014",
      journal_entry_id: "bbbb0114-0001-4001-8001-000000000014",
      account_code: "4000",
      account_name: "Legal Services Revenue",
      description: "Northgate development invoice",
      debit: 0,
      credit: 9800,
      sort_order: 1,
    },
    {
      id: "ffff2003-0001-4001-8001-000000000015",
      journal_entry_id: "bbbb0115-0001-4001-8001-000000000015",
      account_code: "1010",
      account_name: "Operating Cash",
      description: "Check receipt — Oakwood",
      debit: 11850,
      credit: 0,
      sort_order: 0,
    },
    {
      id: "ffff2004-0001-4001-8001-000000000015",
      journal_entry_id: "bbbb0115-0001-4001-8001-000000000015",
      account_code: "4000",
      account_name: "Legal Services Revenue",
      description: "Oakwood estate invoice",
      debit: 0,
      credit: 11850,
      sort_order: 1,
    },
  ]);

  await sb.from("trust_client_ledgers").upsert([
    {
      id: "11110113-0001-4001-8001-000000000013",
      trust_account_id: TRUST_ACCOUNT_ID,
      client_id: "cccc0113-0001-4001-8001-000000000013",
      matter_id: "aaaa0113-0001-4001-8001-000000000013",
      balance: 1500,
      minimum_retainer: 2500,
      retainer_status: "Low",
      last_activity: "2026-06-20",
      attorney: "George Giddens",
    },
  ]);

  console.log("Seed complete.");
}

async function verify(sb) {
  const tables = ["clients", "matters", "invoices", "payments", "time_entries", "journal_entries"];
  for (const table of tables) {
    const { count, error } = await sb.from(table).select("*", { count: "exact", head: true });
    console.log(`  ${table}: ${error ? error.message : count}`);
  }
}

async function main() {
  const pgClient = await tryPg();
  if (pgClient) {
    try {
      await runSqlFile(pgClient, "20260806194500_demo_workflow_rls.sql");
    } catch (err) {
      console.warn("RLS migration (may already exist):", err.message);
    }
    await pgClient.end();
  }

  const sb = supabase();

  const probe = await sb
    .from("matters")
    .insert({
      id: "bbbb0999-0001-4001-8001-000000000099",
      client_id: "cccc0101-0001-4001-8001-000000000001",
      title: "RLS probe",
      status: "open",
      billing_type: "hourly",
    })
    .select();

  if (probe.error) {
    console.warn(
      "\nMatters insert blocked by RLS — seeding clients only.\n" +
        "Add SUPABASE_SERVICE_ROLE_KEY or SUPABASE_DB_PASSWORD to .env.local and rerun for full pipeline data.\n",
    );
    console.warn("Probe error:", probe.error.message);

    await clearExisting(sb);
    const { error: clientErr } = await sb.from("clients").insert(
      clients.map((c) => ({
        ...c,
        is_company: c.client_type === "company",
        conflict_flag: c.conflict_check_status === "possible_conflict",
      })),
    );
    if (clientErr) throw new Error(`clients: ${clientErr.message}`);
    await sb.from("client_schedule_events").insert([
      {
        client_id: "cccc0103-0001-4001-8001-000000000003",
        title: "Conflict clearance follow-up",
        event_date: "2026-08-10",
        event_type: "follow_up",
      },
      {
        client_id: "cccc0104-0001-4001-8001-000000000004",
        title: "Engagement planning call",
        event_date: "2026-08-12",
        event_type: "follow_up",
      },
    ]);
    console.log("Partial seed complete (15 clients).");
    await verify(sb);
    process.exit(0);
  }
  await sb.from("matters").delete().eq("id", "bbbb0999-0001-4001-8001-000000000099");

  await seed(sb);
  console.log("\nVerification:");
  await verify(sb);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
