import { amMatters, AM_ATTORNEYS } from "./entities";

export type VendorBillStatus =
  | "Draft"
  | "Pending Approval"
  | "Approved"
  | "Paid"
  | "Void";
export type PaymentApprovalStatus = "Pending" | "Approved" | "Rejected" | "Paid";
export type ReimbursementStatus =
  | "Submitted"
  | "Pending Approval"
  | "Approved"
  | "Paid"
  | "Rejected";
export type MatterCostStatus = "Unbilled" | "Billed" | "Collected" | "Written Off";

export interface ApSummaryKpi {
  id: string;
  title: string;
  value: string;
  supportingText: string;
  warning?: boolean;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  contact: string;
  email: string;
  phone: string;
  paymentTerms: string;
  totalOutstanding: number;
  ytdSpend: number;
  status: "Active" | "Inactive" | "On Hold";
}

export interface VendorBill {
  id: string;
  billNumber: string;
  vendorId: string;
  vendor: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  matter?: string;
  description: string;
  status: VendorBillStatus;
  approver?: string;
}

export interface PaymentApproval {
  id: string;
  vendor: string;
  billNumber: string;
  amount: number;
  dueDate: string;
  paymentMethod: "Check" | "ACH" | "Wire";
  requestedBy: string;
  status: PaymentApprovalStatus;
  priority: "Normal" | "Urgent";
}

export interface Reimbursement {
  id: string;
  employee: string;
  submitDate: string;
  amount: number;
  category: string;
  matter?: string;
  description: string;
  receiptCount: number;
  status: ReimbursementStatus;
  approver?: string;
}

export interface MatterCost {
  id: string;
  matter: string;
  matterNumber: string;
  client: string;
  vendor: string;
  expenseDate: string;
  category: string;
  amount: number;
  billable: boolean;
  status: MatterCostStatus;
  attorney: string;
}

export const apSummaryKpis: ApSummaryKpi[] = [
  {
    id: "ap-outstanding",
    title: "AP Outstanding",
    value: "$42,800",
    supportingText: "18 open bills",
  },
  {
    id: "pending-approval",
    title: "Pending Approval",
    value: "6",
    supportingText: "$18,450 total",
    warning: true,
  },
  {
    id: "overdue-bills",
    title: "Overdue Bills",
    value: "3",
    supportingText: "$6,200 past due",
    warning: true,
  },
  {
    id: "reimbursements",
    title: "Reimbursements Pending",
    value: "4",
    supportingText: "$2,840 submitted",
  },
  {
    id: "unbilled-costs",
    title: "Unbilled Matter Costs",
    value: "$14,600",
    supportingText: "Across 8 matters",
    warning: true,
  },
  {
    id: "active-vendors",
    title: "Active Vendors",
    value: "24",
    supportingText: "3 on payment hold",
  },
];

export const vendors: Vendor[] = [
  {
    id: "v-001",
    name: "Westlake Court Reporting",
    category: "Court Reporting",
    contact: "Karen Mitchell",
    email: "billing@westlakecourt.com",
    phone: "(312) 555-0401",
    paymentTerms: "Net 30",
    totalOutstanding: 4200,
    ytdSpend: 28400,
    status: "Active",
  },
  {
    id: "v-002",
    name: "Superior Copy Services",
    category: "Document Services",
    contact: "Mark Jensen",
    email: "ap@superiorcopy.com",
    phone: "(212) 555-0412",
    paymentTerms: "Net 15",
    totalOutstanding: 1850,
    ytdSpend: 12600,
    status: "Active",
  },
  {
    id: "v-003",
    name: "LexisNexis",
    category: "Research",
    contact: "Account Services",
    email: "billing@lexisnexis.com",
    phone: "(800) 555-0423",
    paymentTerms: "Net 30",
    totalOutstanding: 8400,
    ytdSpend: 67200,
    status: "Active",
  },
  {
    id: "v-004",
    name: "Premier Expert Witness Group",
    category: "Expert Witnesses",
    contact: "Dr. Helen Strauss",
    email: "billing@premierexpert.com",
    phone: "(310) 555-0434",
    paymentTerms: "Net 45",
    totalOutstanding: 12400,
    ytdSpend: 48600,
    status: "Active",
  },
  {
    id: "v-005",
    name: "Metro Process Servers",
    category: "Process Service",
    contact: "Tony Rivera",
    email: "invoices@metroprocess.com",
    phone: "(214) 555-0445",
    paymentTerms: "Due on Receipt",
    totalOutstanding: 620,
    ytdSpend: 4800,
    status: "On Hold",
  },
  {
    id: "v-006",
    name: "TechLaw Solutions",
    category: "IT Services",
    contact: "Amy Chen",
    email: "billing@techlawsolutions.com",
    phone: "(312) 555-0456",
    paymentTerms: "Net 30",
    totalOutstanding: 3600,
    ytdSpend: 22400,
    status: "Active",
  },
];

export const vendorBills: VendorBill[] = [
  {
    id: "vb-001",
    billNumber: "BILL-8842",
    vendorId: "v-001",
    vendor: "Westlake Court Reporting",
    invoiceDate: "2026-07-28",
    dueDate: "2026-08-27",
    amount: 4200,
    matter: "Employment Litigation",
    description: "Deposition transcript – Summit Retail",
    status: "Pending Approval",
    approver: "Michael Torres",
  },
  {
    id: "vb-002",
    billNumber: "BILL-8838",
    vendorId: "v-002",
    vendor: "Superior Copy Services",
    invoiceDate: "2026-08-01",
    dueDate: "2026-08-16",
    amount: 420,
    matter: "Healthcare Compliance Audit",
    description: "Document scanning – 2,400 pages",
    status: "Approved",
  },
  {
    id: "vb-003",
    billNumber: "BILL-8835",
    vendorId: "v-003",
    vendor: "LexisNexis",
    invoiceDate: "2026-08-01",
    dueDate: "2026-08-31",
    amount: 8400,
    description: "Monthly research subscription – firmwide",
    status: "Approved",
  },
  {
    id: "vb-004",
    billNumber: "BILL-8830",
    vendorId: "v-004",
    vendor: "Premier Expert Witness Group",
    invoiceDate: "2026-07-20",
    dueDate: "2026-08-04",
    amount: 12400,
    matter: "Employment Litigation",
    description: "Expert report and testimony prep",
    status: "Pending Approval",
    approver: "Michael Torres",
  },
  {
    id: "vb-005",
    billNumber: "BILL-8825",
    vendorId: "v-005",
    vendor: "Metro Process Servers",
    invoiceDate: "2026-07-15",
    dueDate: "2026-07-15",
    amount: 620,
    matter: "Commercial Lease Dispute",
    description: "Service of process – 3 defendants",
    status: "Paid",
  },
  {
    id: "vb-006",
    billNumber: "BILL-8820",
    vendorId: "v-006",
    vendor: "TechLaw Solutions",
    invoiceDate: "2026-07-25",
    dueDate: "2026-08-24",
    amount: 3600,
    description: "IT support – Q3 maintenance",
    status: "Draft",
  },
];

export const paymentApprovals: PaymentApproval[] = [
  {
    id: "pa-001",
    vendor: "Westlake Court Reporting",
    billNumber: "BILL-8842",
    amount: 4200,
    dueDate: "2026-08-27",
    paymentMethod: "ACH",
    requestedBy: "Alex Morgan",
    status: "Pending",
    priority: "Normal",
  },
  {
    id: "pa-002",
    vendor: "Premier Expert Witness Group",
    billNumber: "BILL-8830",
    amount: 12400,
    dueDate: "2026-08-04",
    paymentMethod: "Wire",
    requestedBy: "Alex Morgan",
    status: "Pending",
    priority: "Urgent",
  },
  {
    id: "pa-003",
    vendor: "LexisNexis",
    billNumber: "BILL-8835",
    amount: 8400,
    dueDate: "2026-08-31",
    paymentMethod: "ACH",
    requestedBy: "Alex Morgan",
    status: "Approved",
    priority: "Normal",
  },
  {
    id: "pa-004",
    vendor: "Superior Copy Services",
    billNumber: "BILL-8838",
    amount: 420,
    dueDate: "2026-08-16",
    paymentMethod: "Check",
    requestedBy: "Alex Morgan",
    status: "Approved",
    priority: "Normal",
  },
  {
    id: "pa-005",
    vendor: "Metro Process Servers",
    billNumber: "BILL-8825",
    amount: 620,
    dueDate: "2026-07-15",
    paymentMethod: "Check",
    requestedBy: "Alex Morgan",
    status: "Paid",
    priority: "Normal",
  },
];

export const reimbursements: Reimbursement[] = [
  {
    id: "rb-001",
    employee: "Sarah Chen",
    submitDate: "2026-08-03",
    amount: 842,
    category: "Travel",
    matter: "Commercial Lease Dispute",
    description: "Client site visit – mileage and parking",
    receiptCount: 3,
    status: "Pending Approval",
    approver: "Robert Morgan",
  },
  {
    id: "rb-002",
    employee: "Michael Torres",
    submitDate: "2026-08-02",
    amount: 1240,
    category: "Meals & Entertainment",
    matter: "Employment Litigation",
    description: "Witness interview lunch",
    receiptCount: 2,
    status: "Submitted",
  },
  {
    id: "rb-003",
    employee: "Jennifer Walsh",
    submitDate: "2026-07-30",
    amount: 458,
    category: "Supplies",
    matter: "Healthcare Compliance Audit",
    description: "Binders and tab dividers for audit files",
    receiptCount: 1,
    status: "Approved",
    approver: "Robert Morgan",
  },
  {
    id: "rb-004",
    employee: "David Kim",
    submitDate: "2026-07-28",
    amount: 300,
    category: "Filing Fees",
    matter: "Contract Negotiation",
    description: "Secretary of State filing fee",
    receiptCount: 1,
    status: "Paid",
  },
];

export const matterCosts: MatterCost[] = amMatters.slice(0, 6).map((m, i) => ({
  id: `mc-${String(i + 1).padStart(3, "0")}`,
  matter: m.matterName,
  matterNumber: m.matterNumber,
  client: m.client,
  vendor: vendors[i % vendors.length].name,
  expenseDate: "2026-08-0" + ((i % 4) + 1),
  category: ["Court Reporting", "Copy Services", "Filing Fees", "Expert Witness", "Travel", "Research"][i],
  amount: m.unbilledExpenses,
  billable: i !== 2,
  status: (["Unbilled", "Unbilled", "Billed", "Unbilled", "Collected", "Unbilled"] as MatterCostStatus[])[i],
  attorney: m.attorney,
}));

export const apAttorneys = [...AM_ATTORNEYS];
