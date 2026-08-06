/**
 * Fifteen active clients spread across the contract-to-cash pipeline.
 * IDs match supabase/migrations/20260806195000_fifteen_client_pipeline_seed.sql
 *
 * Client created → Conflict checked → Matter created → Agreement approved
 * → Work completed → Client billed → Payment collected → Profit reviewed → Matter closed
 */

export const PIPELINE_STAGES = [
  "client_created",
  "conflict_checked",
  "matter_created",
  "agreement_approved",
  "work_completed",
  "client_billed",
  "payment_collected",
  "profit_reviewed",
  "matter_closed",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  client_created: "Client created",
  conflict_checked: "Conflict checked",
  matter_created: "Matter created",
  agreement_approved: "Agreement approved",
  work_completed: "Work completed",
  client_billed: "Client billed",
  payment_collected: "Payment collected",
  profit_reviewed: "Profit reviewed",
  matter_closed: "Matter closed",
};

export type PipelineClientSeed = {
  id: string;
  clientNumber: string;
  name: string;
  stage: PipelineStage;
  matterId?: string;
  invoiceId?: string;
};

export const DEMO_PROFILE_ID = "4a0bef63-d0d2-4ca9-aa8f-69082b6c5384";
export const DEMO_TRUST_ACCOUNT_ID = "dddd0101-0001-4001-8001-000000000001";

export const FIFTEEN_PIPELINE_CLIENTS: PipelineClientSeed[] = [
  { id: "cccc0101-0001-4001-8001-000000000001", clientNumber: "CL-2001", name: "Ava Mitchell", stage: "client_created" },
  { id: "cccc0102-0001-4001-8001-000000000002", clientNumber: "CL-2002", name: "Brookside Logistics Inc.", stage: "client_created" },
  { id: "cccc0103-0001-4001-8001-000000000003", clientNumber: "CL-2003", name: "Cameron Ellis", stage: "conflict_checked" },
  { id: "cccc0104-0001-4001-8001-000000000004", clientNumber: "CL-2004", name: "Delta Health Partners", stage: "conflict_checked" },
  { id: "cccc0105-0001-4001-8001-000000000005", clientNumber: "CL-2005", name: "Elena Park", stage: "matter_created", matterId: "aaaa0105-0001-4001-8001-000000000005" },
  { id: "cccc0106-0001-4001-8001-000000000006", clientNumber: "CL-2006", name: "Foxtail Retail Group", stage: "matter_created", matterId: "aaaa0106-0001-4001-8001-000000000006" },
  { id: "cccc0107-0001-4001-8001-000000000007", clientNumber: "CL-2007", name: "Grace Nguyen", stage: "agreement_approved", matterId: "aaaa0107-0001-4001-8001-000000000007" },
  { id: "cccc0108-0001-4001-8001-000000000008", clientNumber: "CL-2008", name: "Harrison & Wells LLP", stage: "agreement_approved", matterId: "aaaa0108-0001-4001-8001-000000000008" },
  { id: "cccc0109-0001-4001-8001-000000000009", clientNumber: "CL-2009", name: "Ivy Stone", stage: "work_completed", matterId: "aaaa0109-0001-4001-8001-000000000009" },
  { id: "cccc0110-0001-4001-8001-000000000010", clientNumber: "CL-2010", name: "Jade Innovations LLC", stage: "work_completed", matterId: "aaaa0110-0001-4001-8001-000000000010" },
  { id: "cccc0111-0001-4001-8001-000000000011", clientNumber: "CL-2011", name: "Kingsley Orthopedics", stage: "client_billed", matterId: "aaaa0111-0001-4001-8001-000000000011", invoiceId: "ffff0111-0001-4001-8001-000000000011" },
  { id: "cccc0112-0001-4001-8001-000000000012", clientNumber: "CL-2012", name: "Lumen Energy Co.", stage: "client_billed", matterId: "aaaa0112-0001-4001-8001-000000000012", invoiceId: "ffff0112-0001-4001-8001-000000000012" },
  { id: "cccc0113-0001-4001-8001-000000000013", clientNumber: "CL-2013", name: "Meridian Foods", stage: "payment_collected", matterId: "aaaa0113-0001-4001-8001-000000000013", invoiceId: "ffff0113-0001-4001-8001-000000000013" },
  { id: "cccc0114-0001-4001-8001-000000000014", clientNumber: "CL-2014", name: "Northgate Developers", stage: "profit_reviewed", matterId: "aaaa0114-0001-4001-8001-000000000014", invoiceId: "ffff0114-0001-4001-8001-000000000014" },
  { id: "cccc0115-0001-4001-8001-000000000015", clientNumber: "CL-2015", name: "Oakwood Family Trust", stage: "matter_closed", matterId: "aaaa0115-0001-4001-8001-000000000015", invoiceId: "ffff0115-0001-4001-8001-000000000015" },
];

export const PIPELINE_SUMMARY = {
  activeClients: 15,
  openMatters: 10,
  closedMatters: 1,
  totalInvoiced: 37500,
  totalCollected: 24650,
  outstandingAr: 12850,
};
