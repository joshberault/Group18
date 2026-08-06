/** Shared entities referenced across Accounting Manager modules */

import {
  DEMO_ENGAGEMENT_IDS,
  DEMO_ENGAGEMENT_SUMMARY,
} from "@/lib/demo/two-engagements";

export const AM_ATTORNEYS = ["George Giddens"] as const;

export const AM_OFFICES = ["Chicago"] as const;

export const AM_PARTNERS = ["George Giddens"] as const;

export interface AmClientEntity {
  id: string;
  name: string;
  clientNumber: string;
  primaryContact: string;
  responsiblePartner: string;
  office: string;
  openMatters: number;
  totalAr: number;
  pastDue: number;
  balance90Plus: number;
  trustBalance: number;
  unbilledWip: number;
  paymentStatus: "Current" | "Past Due" | "Payment Plan" | "On Hold";
  riskLevel: "Green" | "Yellow" | "Red";
  email: string;
  phone: string;
  billingPreferences: string;
}

export interface AmMatterEntity {
  id: string;
  matterNumber: string;
  matterName: string;
  clientId: string;
  client: string;
  attorney: string;
  practiceArea: string;
  matterStatus: "Open" | "Pending Close" | "Closed";
  billingMethod: "Hourly" | "Flat Fee" | "Contingency" | "Hybrid";
  budget: number;
  unbilledWip: number;
  unbilledExpenses: number;
  billedToDate: number;
  collectedToDate: number;
  trustBalance: number;
  marginPercent: number;
  financialStatus: "On Track" | "Over Budget" | "Low Retainer" | "Billing Hold";
  billingHold: boolean;
  minimumRetainer: number;
}

/** Offline reference aligned with Supabase seed (live screens query Supabase). */
export const amClients: AmClientEntity[] = [
  {
    id: DEMO_ENGAGEMENT_IDS.clientHarborview,
    name: "Harborview Manufacturing LLC",
    clientNumber: "CL-1001",
    primaryContact: "Dana Whitfield, General Counsel",
    responsiblePartner: "George Giddens",
    office: "Chicago",
    openMatters: 0,
    totalAr: DEMO_ENGAGEMENT_SUMMARY.outstandingAr,
    pastDue: 0,
    balance90Plus: 0,
    trustBalance: 0,
    unbilledWip: 0,
    paymentStatus: "Current",
    riskLevel: "Green",
    email: "legal@harborviewmfg.example",
    phone: "(312) 555-0188",
    billingPreferences: "Net 30 · email PDF",
  },
  {
    id: DEMO_ENGAGEMENT_IDS.clientVasquez,
    name: "Elena Vasquez",
    clientNumber: "CL-1002",
    primaryContact: "Elena Vasquez",
    responsiblePartner: "George Giddens",
    office: "Chicago",
    openMatters: 0,
    totalAr: 0,
    pastDue: 0,
    balance90Plus: 0,
    trustBalance: 0,
    unbilledWip: 0,
    paymentStatus: "Current",
    riskLevel: "Green",
    email: "elena.vasquez@email.example",
    phone: "(773) 555-0142",
    billingPreferences: "Net 15 · ACH preferred",
  },
];

export const amMatters: AmMatterEntity[] = [
  {
    id: DEMO_ENGAGEMENT_IDS.matterHarborview,
    matterNumber: "M-2025-0001",
    matterName: "Harborview Supply Contract Dispute",
    clientId: DEMO_ENGAGEMENT_IDS.clientHarborview,
    client: "Harborview Manufacturing LLC",
    attorney: "George Giddens",
    practiceArea: "Litigation",
    matterStatus: "Closed",
    billingMethod: "Hourly",
    budget: 15000,
    unbilledWip: 0,
    unbilledExpenses: 0,
    billedToDate: 8925,
    collectedToDate: 8925,
    trustBalance: 0,
    marginPercent: 38,
    financialStatus: "On Track",
    billingHold: false,
    minimumRetainer: 0,
  },
  {
    id: DEMO_ENGAGEMENT_IDS.matterVasquez,
    matterNumber: "M-2025-0002",
    matterName: "Vasquez Employment Separation",
    clientId: DEMO_ENGAGEMENT_IDS.clientVasquez,
    client: "Elena Vasquez",
    attorney: "George Giddens",
    practiceArea: "Employment",
    matterStatus: "Closed",
    billingMethod: "Flat Fee",
    budget: 12000,
    unbilledWip: 0,
    unbilledExpenses: 0,
    billedToDate: 12000,
    collectedToDate: 12000,
    trustBalance: 0,
    marginPercent: 42,
    financialStatus: "On Track",
    billingHold: false,
    minimumRetainer: 3000,
  },
];

export function getClientById(id: string) {
  return amClients.find((c) => c.id === id);
}

export function getMatterById(id: string) {
  return amMatters.find((m) => m.id === id);
}

export function getMattersByClientId(clientId: string) {
  return amMatters.filter((m) => m.clientId === clientId);
}
