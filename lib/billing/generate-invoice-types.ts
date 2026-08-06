export type ClientBillingMethod = "Hourly" | "Fixed Fee" | "Retainer";

export type MatterStatus = "Open" | "Closed";

export type GenerateInvoiceStatus = "Draft" | "Sent";

export type TimeApprovalStatus = "Approved" | "Pending" | "Rejected";

export type UnbilledTimeEntry = {
  id: string;
  date: string;
  person: string;
  role: "Attorney" | "Staff";
  description: string;
  hours: number;
  rate: number;
  /** Billing approval workflow status for the time entry */
  approvalStatus: TimeApprovalStatus;
  billed: boolean;
};

export type UnbilledExpense = {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  approved: boolean;
  billed: boolean;
};

export type WriteDownLine = {
  id: string;
  reason: string;
  amount: number;
  approved: boolean;
};

export type GenerateClient = {
  id: string;
  clientId: string;
  name: string;
  billingContact: string;
  billingMethod: ClientBillingMethod;
  trustRetainerBalance: number;
  email: string;
  phone: string;
  address: string;
};

export type GenerateMatter = {
  id: string;
  clientId: string;
  matterName: string;
  matterNumber: string;
  responsibleAttorney: string;
  status: MatterStatus;
  billingPeriod: string;
  timeEntries: UnbilledTimeEntry[];
  expenses: UnbilledExpense[];
  writeDowns: WriteDownLine[];
  courtesyDiscountApproved: number;
};

export type FinalizedInvoiceRecord = {
  id: string;
  invoiceNumber: string;
  clientId: string;
  matterId: string;
  billingPeriod: string;
  invoiceDate: string;
  dueDate: string;
  totalDue: number;
  status: GenerateInvoiceStatus;
  lockedTimeEntryIds: string[];
  createdAt: string;
};

export type InvoiceTotals = {
  billableTime: number;
  expenses: number;
  writeDowns: number;
  courtesyDiscount: number;
  retainerApplied: number;
  totalAdjustments: number;
  totalDue: number;
};
