import {
  accountingUnavailableMessage,
  asNumber,
  getAccountingSupabase,
  type QueryResult,
} from "./db";
import type {
  ApSummaryKpi,
  MatterCost,
  PaymentApproval,
  Reimbursement,
  Vendor,
  VendorBill,
} from "@/lib/mock-data/accounting-manager/ap";

export async function fetchPayablesWorkspace(): Promise<
  QueryResult<{
    kpis: ApSummaryKpi[];
    vendors: Vendor[];
    bills: VendorBill[];
    approvals: PaymentApproval[];
    reimbursements: Reimbursement[];
    matterCosts: MatterCost[];
  }>
> {
  const supabase = getAccountingSupabase();
  const empty = {
    kpis: [],
    vendors: [],
    bills: [],
    approvals: [],
    reimbursements: [],
    matterCosts: [],
  };
  if (!supabase) {
    return { data: empty, error: accountingUnavailableMessage(), empty: true };
  }

  const [vendorsRes, billsRes, approvalsRes, reimbRes, mattersRes] =
    await Promise.all([
      supabase.from("vendors").select("*").order("name"),
      supabase.from("vendor_bills").select("*, vendors(name)").order("due_date"),
      supabase.from("ap_payment_approvals").select("*, vendor_bills(bill_number, vendors(name))"),
      supabase.from("reimbursements").select("*"),
      supabase.from("matters").select("id, title, client_id"),
    ]);

  if (vendorsRes.error) {
    return { data: empty, error: vendorsRes.error.message, empty: true };
  }

  const vendors: Vendor[] = (vendorsRes.data ?? []).map((v) => ({
    id: v.id as string,
    name: v.name as string,
    category: (v.category as string) ?? "",
    contact: (v.contact_name as string) ?? "",
    email: (v.email as string) ?? "",
    phone: (v.phone as string) ?? "",
    paymentTerms: (v.payment_terms as string) ?? "",
    totalOutstanding: asNumber(v.total_outstanding),
    ytdSpend: asNumber(v.ytd_spend),
    status: v.status as Vendor["status"],
  }));

  const bills: VendorBill[] = (billsRes.data ?? []).map((b) => {
    const vendorJoin = b.vendors as { name?: string } | null;
    return {
      id: b.id as string,
      billNumber: b.bill_number as string,
      vendorId: b.vendor_id as string,
      vendor: vendorJoin?.name ?? "",
      invoiceDate: b.invoice_date as string,
      dueDate: b.due_date as string,
      amount: asNumber(b.amount),
      description: b.description as string,
      status: b.status as VendorBill["status"],
      approver: (b.approver as string) ?? undefined,
    };
  });

  const approvals: PaymentApproval[] = (approvalsRes.data ?? []).map((a) => {
    const bill = a.vendor_bills as {
      bill_number?: string;
      vendors?: { name?: string };
    } | null;
    return {
      id: a.id as string,
      vendor: bill?.vendors?.name ?? "",
      billNumber: bill?.bill_number ?? "",
      amount: asNumber(a.amount),
      dueDate: a.due_date as string,
      paymentMethod: a.payment_method as PaymentApproval["paymentMethod"],
      requestedBy: (a.requested_by as string) ?? "",
      status: a.status as PaymentApproval["status"],
      priority: a.priority as PaymentApproval["priority"],
    };
  });

  const reimbursements: Reimbursement[] = (reimbRes.data ?? []).map((r) => ({
    id: r.id as string,
    employee: r.employee_name as string,
    submitDate: r.submit_date as string,
    amount: asNumber(r.amount),
    category: (r.category as string) ?? "",
    description: r.description as string,
    receiptCount: asNumber(r.receipt_count),
    status: r.status as Reimbursement["status"],
    approver: (r.approver as string) ?? undefined,
  }));

  const apOutstanding = bills
    .filter((b) => b.status !== "Paid" && b.status !== "Void")
    .reduce((s, b) => s + b.amount, 0);

  const kpis: ApSummaryKpi[] = [
    {
      id: "ap-outstanding",
      title: "AP Outstanding",
      value: `$${apOutstanding.toLocaleString()}`,
      supportingText: `${bills.filter((b) => b.status !== "Paid").length} open bills`,
    },
    {
      id: "pending-approval",
      title: "Pending Approval",
      value: String(approvals.filter((a) => a.status === "Pending").length),
      supportingText: "Vendor payments",
      warning: true,
    },
  ];

  return {
    data: {
      kpis,
      vendors,
      bills,
      approvals,
      reimbursements,
      matterCosts: [],
    },
    error: null,
    empty: vendors.length === 0,
  };
}
