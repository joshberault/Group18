/** Shared entities referenced across Accounting Manager modules */

export const AM_ATTORNEYS = [
  "Sarah Chen",
  "Michael Torres",
  "Jennifer Walsh",
  "David Kim",
  "Rachel Foster",
] as const;

export const AM_OFFICES = ["Chicago", "New York", "Los Angeles", "Dallas"] as const;

export const AM_PARTNERS = [
  "Robert Morgan",
  "Sarah Chen",
  "Michael Torres",
] as const;

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

export const amClients: AmClientEntity[] = [
  {
    id: "cl-001",
    name: "Northwind Holdings LLC",
    clientNumber: "C-1042",
    primaryContact: "James Whitfield",
    responsiblePartner: "Sarah Chen",
    office: "Chicago",
    openMatters: 3,
    totalAr: 48200,
    pastDue: 22400,
    balance90Plus: 22400,
    trustBalance: 12500,
    unbilledWip: 18600,
    paymentStatus: "Past Due",
    riskLevel: "Red",
    email: "j.whitfield@northwind.com",
    phone: "(312) 555-0142",
    billingPreferences: "Net 30 · Email invoices",
  },
  {
    id: "cl-002",
    name: "Summit Retail Group",
    clientNumber: "C-1088",
    primaryContact: "Lisa Park",
    responsiblePartner: "Michael Torres",
    office: "New York",
    openMatters: 2,
    totalAr: 36850,
    pastDue: 14200,
    balance90Plus: 14200,
    trustBalance: 8000,
    unbilledWip: 9200,
    paymentStatus: "Past Due",
    riskLevel: "Red",
    email: "lpark@summitretail.com",
    phone: "(212) 555-0198",
    billingPreferences: "Net 45 · Portal payments",
  },
  {
    id: "cl-003",
    name: "Beacon Medical Partners",
    clientNumber: "C-1105",
    primaryContact: "Dr. Amanda Reyes",
    responsiblePartner: "Jennifer Walsh",
    office: "New York",
    openMatters: 4,
    totalAr: 29400,
    pastDue: 0,
    balance90Plus: 0,
    trustBalance: 22000,
    unbilledWip: 14800,
    paymentStatus: "Current",
    riskLevel: "Green",
    email: "areyes@beaconmed.com",
    phone: "(212) 555-0234",
    billingPreferences: "Net 30 · ACH preferred",
  },
  {
    id: "cl-004",
    name: "Harbor Logistics Inc.",
    clientNumber: "C-0976",
    primaryContact: "Tom Bradley",
    responsiblePartner: "David Kim",
    office: "Los Angeles",
    openMatters: 2,
    totalAr: 25100,
    pastDue: 8900,
    balance90Plus: 8900,
    trustBalance: 5000,
    unbilledWip: 6200,
    paymentStatus: "Payment Plan",
    riskLevel: "Yellow",
    email: "t.bradley@harborlogistics.com",
    phone: "(310) 555-0167",
    billingPreferences: "Net 30 · Check",
  },
  {
    id: "cl-005",
    name: "Atlas Construction Co.",
    clientNumber: "C-1134",
    primaryContact: "Maria Santos",
    responsiblePartner: "Rachel Foster",
    office: "Dallas",
    openMatters: 1,
    totalAr: 22800,
    pastDue: 0,
    balance90Plus: 0,
    trustBalance: 15000,
    unbilledWip: 8400,
    paymentStatus: "Current",
    riskLevel: "Green",
    email: "msantos@atlasconstruction.com",
    phone: "(214) 555-0289",
    billingPreferences: "Net 30 · Wire",
  },
  {
    id: "cl-006",
    name: "Pinnacle Software Ltd.",
    clientNumber: "C-1055",
    primaryContact: "Kevin O'Brien",
    responsiblePartner: "Sarah Chen",
    office: "Chicago",
    openMatters: 2,
    totalAr: 19650,
    pastDue: 6200,
    balance90Plus: 6200,
    trustBalance: 7500,
    unbilledWip: 11200,
    paymentStatus: "Past Due",
    riskLevel: "Yellow",
    email: "kobrien@pinnaclesoft.com",
    phone: "(312) 555-0312",
    billingPreferences: "Net 30 · Credit card",
  },
  {
    id: "cl-007",
    name: "Greenfield Energy Corp.",
    clientNumber: "C-1148",
    primaryContact: "Patricia Wu",
    responsiblePartner: "Michael Torres",
    office: "Los Angeles",
    openMatters: 3,
    totalAr: 18400,
    pastDue: 0,
    balance90Plus: 0,
    trustBalance: 18000,
    unbilledWip: 5600,
    paymentStatus: "Current",
    riskLevel: "Green",
    email: "pwu@greenfieldenergy.com",
    phone: "(310) 555-0345",
    billingPreferences: "Net 30 · ACH",
  },
  {
    id: "cl-008",
    name: "Meridian Capital Advisors",
    clientNumber: "C-0998",
    primaryContact: "Richard Hayes",
    responsiblePartner: "Jennifer Walsh",
    office: "Dallas",
    openMatters: 1,
    totalAr: 16200,
    pastDue: 5100,
    balance90Plus: 5100,
    trustBalance: 0,
    unbilledWip: 3200,
    paymentStatus: "On Hold",
    riskLevel: "Yellow",
    email: "rhayes@meridiancap.com",
    phone: "(214) 555-0378",
    billingPreferences: "Prepaid retainer required",
  },
];

export const amMatters: AmMatterEntity[] = [
  {
    id: "mt-001",
    matterNumber: "2025-CL-0412",
    matterName: "Commercial Lease Dispute",
    clientId: "cl-001",
    client: "Northwind Holdings LLC",
    attorney: "Sarah Chen",
    practiceArea: "Real Estate",
    matterStatus: "Open",
    billingMethod: "Hourly",
    budget: 75000,
    unbilledWip: 12400,
    unbilledExpenses: 6200,
    billedToDate: 48200,
    collectedToDate: 25800,
    trustBalance: 12500,
    marginPercent: 38,
    financialStatus: "On Track",
    billingHold: false,
    minimumRetainer: 10000,
  },
  {
    id: "mt-002",
    matterNumber: "2025-EL-0298",
    matterName: "Employment Litigation",
    clientId: "cl-002",
    client: "Summit Retail Group",
    attorney: "Michael Torres",
    practiceArea: "Employment",
    matterStatus: "Open",
    billingMethod: "Hourly",
    budget: 120000,
    unbilledWip: 9200,
    unbilledExpenses: 3400,
    billedToDate: 36850,
    collectedToDate: 22650,
    trustBalance: 8000,
    marginPercent: 32,
    financialStatus: "Over Budget",
    billingHold: false,
    minimumRetainer: 15000,
  },
  {
    id: "mt-003",
    matterNumber: "2026-HC-0012",
    matterName: "Healthcare Compliance Audit",
    clientId: "cl-003",
    client: "Beacon Medical Partners",
    attorney: "Jennifer Walsh",
    practiceArea: "Healthcare",
    matterStatus: "Open",
    billingMethod: "Flat Fee",
    budget: 45000,
    unbilledWip: 0,
    unbilledExpenses: 2800,
    billedToDate: 29400,
    collectedToDate: 29400,
    trustBalance: 22000,
    marginPercent: 45,
    financialStatus: "On Track",
    billingHold: false,
    minimumRetainer: 20000,
  },
  {
    id: "mt-004",
    matterNumber: "2025-CN-0156",
    matterName: "Contract Negotiation",
    clientId: "cl-004",
    client: "Harbor Logistics Inc.",
    attorney: "David Kim",
    practiceArea: "Corporate",
    matterStatus: "Open",
    billingMethod: "Hourly",
    budget: 35000,
    unbilledWip: 6200,
    unbilledExpenses: 1100,
    billedToDate: 25100,
    collectedToDate: 16200,
    trustBalance: 5000,
    marginPercent: 28,
    financialStatus: "Low Retainer",
    billingHold: false,
    minimumRetainer: 7500,
  },
  {
    id: "mt-005",
    matterNumber: "2026-SB-0004",
    matterName: "Surety Bond Claim",
    clientId: "cl-005",
    client: "Atlas Construction Co.",
    attorney: "Rachel Foster",
    practiceArea: "Construction",
    matterStatus: "Open",
    billingMethod: "Hourly",
    budget: 60000,
    unbilledWip: 8400,
    unbilledExpenses: 2200,
    billedToDate: 22800,
    collectedToDate: 0,
    trustBalance: 15000,
    marginPercent: 41,
    financialStatus: "On Track",
    billingHold: false,
    minimumRetainer: 12000,
  },
  {
    id: "mt-006",
    matterNumber: "2026-IP-0008",
    matterName: "IP Licensing Review",
    clientId: "cl-006",
    client: "Pinnacle Software Ltd.",
    attorney: "Sarah Chen",
    practiceArea: "Intellectual Property",
    matterStatus: "Open",
    billingMethod: "Hourly",
    budget: 40000,
    unbilledWip: 11200,
    unbilledExpenses: 800,
    billedToDate: 19650,
    collectedToDate: 13450,
    trustBalance: 7500,
    marginPercent: 35,
    financialStatus: "Billing Hold",
    billingHold: true,
    minimumRetainer: 8000,
  },
  {
    id: "mt-007",
    matterNumber: "2025-EP-0189",
    matterName: "Environmental Permitting",
    clientId: "cl-007",
    client: "Greenfield Energy Corp.",
    attorney: "Michael Torres",
    practiceArea: "Environmental",
    matterStatus: "Open",
    billingMethod: "Hybrid",
    budget: 55000,
    unbilledWip: 5600,
    unbilledExpenses: 1900,
    billedToDate: 18400,
    collectedToDate: 14100,
    trustBalance: 18000,
    marginPercent: 42,
    financialStatus: "On Track",
    billingHold: false,
    minimumRetainer: 10000,
  },
  {
    id: "mt-008",
    matterNumber: "2025-RC-0331",
    matterName: "Regulatory Compliance",
    clientId: "cl-008",
    client: "Meridian Capital Advisors",
    attorney: "Jennifer Walsh",
    practiceArea: "Regulatory",
    matterStatus: "Pending Close",
    billingMethod: "Hourly",
    budget: 25000,
    unbilledWip: 3200,
    unbilledExpenses: 600,
    billedToDate: 16200,
    collectedToDate: 11100,
    trustBalance: 0,
    marginPercent: 22,
    financialStatus: "Over Budget",
    billingHold: true,
    minimumRetainer: 5000,
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
