import type { UserRole } from "@/lib/types";

import { PIPELINE_SUMMARY } from "@/lib/demo/fifteen-clients";

export const ROLE_WELCOME_MESSAGES: Record<UserRole, string> = {
  managing_partner:
    "Firm-wide revenue, collections, and profitability at a glance.",
  attorney: "Your matters, deadlines, and unbilled time for the week.",
  paralegal: "Assigned tasks, matter deadlines, and document workflows.",
  billing_specialist:
    "Billing queues, invoice status, and accounts receivable aging.",
  accounting_manager:
    "Trust accounting, revenue recognition, and financial controls.",
  firm_administrator:
    "Operational oversight across clients, staff, and firm settings.",
  client: "Your matters, invoices, and trust balance summary.",
  prospective_client:
    "Share your legal needs and request a consultation with our team.",
};

export const ROLE_SUMMARY_TITLES: Record<UserRole, string> = {
  managing_partner: "Managing Partner Summary",
  attorney: "Attorney Workload Summary",
  paralegal: "Paralegal Task Summary",
  billing_specialist: "Billing Operations Summary",
  accounting_manager: "Accounting Operations Summary",
  firm_administrator: "Firm Administration Summary",
  client: "Client Portal Preview",
  prospective_client: "Consultation Request",
};

/** Neutral copy — metrics come from live data when available. */
export const ROLE_SUMMARY_CONTENT: Record<UserRole, string> = {
  managing_partner:
    "Fifteen active clients across the contract-to-cash pipeline — from intake through closed matters.",
  attorney:
    "Matters at every lifecycle stage: open engagements, completed work, and closed files.",
  paralegal:
    "Client intake, conflict checks, engagement setup, and document workflows in progress.",
  billing_specialist:
    "Prebills, sent invoices, partial payments, and A/R aging across pipeline stages.",
  accounting_manager:
    "Trust, revenue recognition, and journal entries for collected and reviewed matters.",
  firm_administrator:
    "Firm demo dataset: 15 active clients spanning the full contract-to-cash workflow.",
  client:
    "Portal preview reflects clients at billing, payment, and closed-matter stages.",
  prospective_client:
    "Complete the consultation request form to connect with CounselFlow.",
};

export const dashboardKpis = {
  activeMatters: PIPELINE_SUMMARY.openMatters,
  unbilledTimeHours: 24.5,
  outstandingAR: PIPELINE_SUMMARY.outstandingAr,
  trustFundsHeld: 1500,
  monthlyCollections: PIPELINE_SUMMARY.totalCollected,
};

export const upcomingDeadlines: {
  id: string;
  matter: string;
  task: string;
  dueDate: string;
  priority: "low" | "medium" | "high" | "critical";
}[] = [];

export const monthlyCollectionsChart: { month: string; collections: number }[] =
  [];

export const recentActivity: {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}[] = [];

export const matterProfitability: {
  matter: string;
  client: string;
  revenue: number;
  cost: number;
  margin: number;
}[] = [];
