export type BillingMethod =
  | "Hourly"
  | "Fixed Fee"
  | "Retainer"
  | "Reimbursable";

export type InvoiceStatus =
  | "Draft"
  | "Sent"
  | "Paid"
  | "Partially Paid"
  | "Overdue"
  | "Disputed"
  | "Cancelled";

export type TimeEntry = {
  id: string;
  date: string;
  attorney: string;
  description: string;
  hours: number;
  rate: number;
  amount: number;
};

export type ExpenseEntry = {
  id: string;
  date: string;
  description: string;
  amount: number;
};

export type WriteDown = {
  id: string;
  date: string;
  reason: string;
  amount: number;
};

export type PaymentEntry = {
  id: string;
  date: string;
  method: string;
  reference: string;
  amount: number;
};

export type ClientInfo = {
  name: string;
  contact: string;
  email: string;
  phone: string;
  billingAddress: string;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  client: string;
  legalMatter: string;
  attorney: string;
  billingMethod: BillingMethod;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  amountPaid: number;
  remainingBalance: number;
  status: InvoiceStatus;
  /** Detail modal fields */
  clientInfo: ClientInfo;
  matterDescription: string;
  timeEntries: TimeEntry[];
  reimbursableExpenses: ExpenseEntry[];
  writeDowns: WriteDown[];
  retainerApplied: number;
  paymentHistory: PaymentEntry[];
  /** Payment reminder workflow (Overdue / collections) */
  lastReminderSent?: string | null;
  reminderCount?: number;
  reminderStatus?: ReminderStatus;
};

export type ReminderStatus = "None" | "Reminder Sent";
