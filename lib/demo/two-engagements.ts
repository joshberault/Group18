/**
 * Legacy demo constants for client-portal and accounting mock data.
 * Canonical pipeline dataset: lib/demo/fifteen-clients.ts
 */

import { PIPELINE_SUMMARY } from "@/lib/demo/fifteen-clients";

/** Historical two-engagement IDs retained for mock-data references. */
export const DEMO_ENGAGEMENT_IDS = {
  clientHarborview: "cccc0001-0001-4001-8001-000000000001",
  clientVasquez: "cccc0002-0002-4002-8002-000000000002",
  matterHarborview: "aaaa0001-0001-4001-8001-000000000001",
  matterVasquez: "aaaa0002-0002-4002-8002-000000000002",
  invoiceHarborview: "ffff0001-0001-4001-8001-000000000001",
  invoiceVasquez: "ffff0002-0002-4002-8002-000000000002",
  trustAccount: "dddd0101-0001-4001-8001-000000000001",
  bankOperating: "bbbb0001-0001-4001-8001-000000000001",
} as const;

export const DEMO_ENGAGEMENT_SUMMARY = {
  outstandingAr: PIPELINE_SUMMARY.outstandingAr,
  trustHeld: 1500,
  totalCollected: PIPELINE_SUMMARY.totalCollected,
};
