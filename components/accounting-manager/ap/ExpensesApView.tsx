"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  FileDown,
  Plus,
  Wallet,
  X,
} from "lucide-react";
import { AccountingTabs } from "@/components/accounting-manager/shared/AccountingTabs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { KPICard } from "@/components/ui/KPICard";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";
import { exportToCsv } from "@/lib/accounting-manager/export-csv";
import { fetchPayablesWorkspace, useSupabaseQuery } from "@/lib/accounting";
import type {
  PaymentApproval,
  Reimbursement,
  Vendor,
  VendorBill,
} from "@/lib/mock-data/accounting-manager/ap";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatCurrency } from "@/lib/utils/cn";

type ApTab =
  | "vendor-bills"
  | "payment-approvals"
  | "reimbursements"
  | "matter-costs"
  | "vendors";

const TABS = [
  { id: "vendor-bills", label: "Vendor Bills" },
  { id: "payment-approvals", label: "Payment Approvals" },
  { id: "reimbursements", label: "Reimbursements" },
  { id: "matter-costs", label: "Matter Costs" },
  { id: "vendors", label: "Vendors" },
];

function billStatusVariant(status: string) {
  if (status === "Approved" || status === "Paid") return "success" as const;
  if (status === "Pending Approval") return "warning" as const;
  if (status === "Void") return "danger" as const;
  return "neutral" as const;
}

export function ExpensesApView() {
  const { data: workspace, loading, error } = useSupabaseQuery(
    fetchPayablesWorkspace,
    [],
  );
  const apSummaryKpis = workspace?.kpis ?? [];
  const vendors = workspace?.vendors ?? [];
  const matterCosts = workspace?.matterCosts ?? [];
  const [activeTab, setActiveTab] = useState<ApTab>("vendor-bills");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bills, setBills] = useState<VendorBill[]>([]);
  const [approvals, setApprovals] = useState<PaymentApproval[]>([]);
  const [reimbursementList, setReimbursementList] = useState<Reimbursement[]>([]);
  useEffect(() => {
    if (workspace) {
      setBills(workspace.bills);
      setApprovals(workspace.approvals);
      setReimbursementList(workspace.reimbursements);
    }
  }, [workspace]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedBill, setSelectedBill] = useState<VendorBill | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; action: () => void } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const matchesSearch =
        !search ||
        b.vendor.toLowerCase().includes(search.toLowerCase()) ||
        b.billNumber.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bills, search, statusFilter]);

  const filteredApprovals = useMemo(() => {
    return approvals.filter(
      (a) =>
        !search ||
        a.vendor.toLowerCase().includes(search.toLowerCase()) ||
        a.billNumber.toLowerCase().includes(search.toLowerCase()),
    );
  }, [approvals, search]);

  const filteredReimbursements = useMemo(() => {
    return reimbursementList.filter(
      (r) =>
        !search ||
        r.employee.toLowerCase().includes(search.toLowerCase()) ||
        (r.matter?.toLowerCase().includes(search.toLowerCase()) ?? false),
    );
  }, [reimbursementList, search]);

  const filteredMatterCosts = useMemo(() => {
    return matterCosts.filter(
      (c) =>
        !search ||
        c.client.toLowerCase().includes(search.toLowerCase()) ||
        c.matter.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search]);

  const filteredVendors = useMemo(() => {
    return vendors.filter(
      (v) =>
        !search ||
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.category.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search]);

  const approveBill = (bill: VendorBill) => {
    setBills((prev) =>
      prev.map((b) =>
        b.id === bill.id ? { ...b, status: "Approved" as const } : b,
      ),
    );
    setToast(`${bill.billNumber} approved`);
    setSelectedBill(null);
  };

  const voidBill = (bill: VendorBill) => {
    setConfirmAction({
      title: "Void Vendor Bill",
      message: `Void ${bill.billNumber} from ${bill.vendor}? This cannot be undone.`,
      action: () => {
        setBills((prev) =>
          prev.map((b) =>
            b.id === bill.id ? { ...b, status: "Void" as const } : b,
          ),
        );
        setToast(`${bill.billNumber} voided`);
        setSelectedBill(null);
        setConfirmAction(null);
      },
    });
  };

  const approvePayment = (approval: PaymentApproval) => {
    setApprovals((prev) =>
      prev.map((a) =>
        a.id === approval.id ? { ...a, status: "Approved" as const } : a,
      ),
    );
    setToast(`Payment approved for ${approval.vendor}`);
  };

  const rejectPayment = (approval: PaymentApproval) => {
    setConfirmAction({
      title: "Reject Payment",
      message: `Reject payment of ${formatCurrency(approval.amount)} to ${approval.vendor}?`,
      action: () => {
        setApprovals((prev) =>
          prev.map((a) =>
            a.id === approval.id ? { ...a, status: "Rejected" as const } : a,
          ),
        );
        setToast("Payment rejected");
        setConfirmAction(null);
      },
    });
  };

  const approveReimbursement = (reimb: Reimbursement) => {
    setReimbursementList((prev) =>
      prev.map((r) =>
        r.id === reimb.id ? { ...r, status: "Approved" as const } : r,
      ),
    );
    setToast(`Reimbursement approved for ${reimb.employee}`);
  };

  const handleExport = () => {
    if (activeTab === "vendor-bills") {
      exportToCsv(
        "vendor-bills.csv",
        ["Bill #", "Vendor", "Date", "Due Date", "Amount", "Status"],
        filteredBills.map((b) => [
          b.billNumber,
          b.vendor,
          b.invoiceDate,
          b.dueDate,
          String(b.amount),
          b.status,
        ]),
      );
    } else if (activeTab === "payment-approvals") {
      exportToCsv(
        "payment-approvals.csv",
        ["Vendor", "Bill", "Amount", "Due Date", "Status"],
        filteredApprovals.map((a) => [
          a.vendor,
          a.billNumber,
          String(a.amount),
          a.dueDate,
          a.status,
        ]),
      );
    } else if (activeTab === "reimbursements") {
      exportToCsv(
        "reimbursements.csv",
        ["Employee", "Date", "Category", "Amount", "Status"],
        filteredReimbursements.map((r) => [
          r.employee,
          r.submitDate,
          r.category,
          String(r.amount),
          r.status,
        ]),
      );
    } else if (activeTab === "matter-costs") {
      exportToCsv(
        "matter-costs.csv",
        ["Client", "Matter", "Vendor", "Category", "Amount", "Status"],
        filteredMatterCosts.map((c) => [
          c.client,
          c.matter,
          c.vendor,
          c.category,
          String(c.amount),
          c.status,
        ]),
      );
    } else if (activeTab === "vendors") {
      exportToCsv(
        "vendors.csv",
        ["Vendor", "Category", "Terms", "Open Balance", "Status"],
        filteredVendors.map((v) => [
          v.name,
          v.category,
          v.paymentTerms,
          String(v.totalOutstanding),
          v.status,
        ]),
      );
    }
    setToast("Data exported");
  };

  if (loading) {
    return <LoadingState message="Loading payables..." />;
  }

  if (error) {
    return (
      <EmptyState
        title="Payables data unavailable"
        description={error}
        moduleLabel="Expenses & AP"
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Expenses & Accounts Payable"
        description="Vendor bills, expense reimbursements, matter-related expenses, cost recovery, payment approvals, and accounts payable."
      >
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setToast("New vendor bill form opened (prototype)")}>
            <Plus className="h-4 w-4" />
            New Vendor Bill
          </Button>
          <Button
            variant="secondary"
            onClick={() => setActiveTab("payment-approvals")}
          >
            <Check className="h-4 w-4" />
            Review Approvals
          </Button>
          <Button variant="secondary" onClick={handleExport}>
            <FileDown className="h-4 w-4" />
            Export
          </Button>
        </div>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {apSummaryKpis.map((kpi) => (
          <KPICard
            key={kpi.id}
            title={kpi.title}
            value={kpi.value}
            subtitle={kpi.supportingText}
            icon={kpi.id === "ap-outstanding" ? Wallet : undefined}
            className={
              kpi.warning ? "border-amber-300 bg-amber-50/60" : undefined
            }
          />
        ))}
      </div>

      <AccountingTabs
        tabs={TABS}
        activeTab={activeTab}
        onChange={(id) => {
          setActiveTab(id as ApTab);
          setSearch("");
          setStatusFilter("all");
        }}
        className="mb-6"
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        {activeTab === "vendor-bills" && (
          <Select
            options={[
              { value: "all", label: "All statuses" },
              { value: "Draft", label: "Draft" },
              { value: "Pending Approval", label: "Pending Approval" },
              { value: "Approved", label: "Approved" },
              { value: "Paid", label: "Paid" },
              { value: "Void", label: "Void" },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="max-w-xs"
          />
        )}
      </div>

      {activeTab === "vendor-bills" && (
        <Card>
          <CardHeader>
            <CardTitle>Vendor Bills</CardTitle>
            <CardDescription>
              Incoming vendor invoices awaiting approval and payment
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto px-6 pb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Matter</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approver</TableHead>
                  <TableHead>{" "}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-medium">{bill.billNumber}</TableCell>
                    <TableCell>{bill.vendor}</TableCell>
                    <TableCell>{bill.invoiceDate}</TableCell>
                    <TableCell>{bill.dueDate}</TableCell>
                    <TableCell>{bill.matter ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(bill.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={billStatusVariant(bill.status)}>
                        {bill.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{bill.approver ?? "—"}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedBill(bill)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {activeTab === "payment-approvals" && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Approvals</CardTitle>
            <CardDescription>
              Vendor payments awaiting authorization
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto px-6 pb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Bill #</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>{" "}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApprovals.map((approval) => (
                  <TableRow key={approval.id}>
                    <TableCell className="font-medium">{approval.vendor}</TableCell>
                    <TableCell>{approval.billNumber}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(approval.amount)}
                    </TableCell>
                    <TableCell>{approval.dueDate}</TableCell>
                    <TableCell>{approval.paymentMethod}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          approval.priority === "Urgent" ? "danger" : "neutral"
                        }
                      >
                        {approval.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={approval.status.toLowerCase()} />
                    </TableCell>
                    <TableCell>
                      {approval.status === "Pending" && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => approvePayment(approval)}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => rejectPayment(approval)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {activeTab === "reimbursements" && (
        <Card>
          <CardHeader>
            <CardTitle>Expense Reimbursements</CardTitle>
            <CardDescription>
              Employee expense submissions for approval and payment
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto px-6 pb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Submit Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Matter</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Receipts</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>{" "}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReimbursements.map((reimb) => (
                  <TableRow key={reimb.id}>
                    <TableCell className="font-medium">{reimb.employee}</TableCell>
                    <TableCell>{reimb.submitDate}</TableCell>
                    <TableCell>{reimb.category}</TableCell>
                    <TableCell>{reimb.matter ?? "—"}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {reimb.description}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(reimb.amount)}
                    </TableCell>
                    <TableCell>{reimb.receiptCount}</TableCell>
                    <TableCell>
                      <StatusBadge status={reimb.status.toLowerCase().replace(/ /g, "_")} />
                    </TableCell>
                    <TableCell>
                      {(reimb.status === "Submitted" ||
                        reimb.status === "Pending Approval") && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => approveReimbursement(reimb)}
                        >
                          Approve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {activeTab === "matter-costs" && (
        <Card>
          <CardHeader>
            <CardTitle>Matter Costs</CardTitle>
            <CardDescription>
              Billable and non-billable expenses allocated to matters
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto px-6 pb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Matter</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Billable</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attorney</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMatterCosts.map((cost) => (
                  <TableRow key={cost.id}>
                    <TableCell>{cost.client}</TableCell>
                    <TableCell>
                      <div>{cost.matter}</div>
                      <div className="text-xs text-muted">{cost.matterNumber}</div>
                    </TableCell>
                    <TableCell>{cost.vendor}</TableCell>
                    <TableCell>{cost.category}</TableCell>
                    <TableCell>{cost.expenseDate}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(cost.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cost.billable ? "success" : "neutral"}>
                        {cost.billable ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={cost.status.toLowerCase().replace(/ /g, "_")} />
                    </TableCell>
                    <TableCell>{cost.attorney}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {activeTab === "vendors" && (
        <Card>
          <CardHeader>
            <CardTitle>Vendors</CardTitle>
            <CardDescription>
              Approved vendors and payment terms
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto px-6 pb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Payment Terms</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">YTD Spend</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>{" "}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell>{vendor.category}</TableCell>
                    <TableCell>{vendor.contact}</TableCell>
                    <TableCell>{vendor.paymentTerms}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(vendor.totalOutstanding)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(vendor.ytdSpend)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={vendor.status.toLowerCase().replace(/ /g, "_")} />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedVendor(vendor)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Drawer
        isOpen={!!selectedBill}
        onClose={() => setSelectedBill(null)}
        title="Vendor Bill Detail"
        description={selectedBill?.billNumber}
      >
        {selectedBill && (
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-muted">Vendor</dt>
              <dd className="font-medium">{selectedBill.vendor}</dd>
            </div>
            <div>
              <dt className="text-muted">Description</dt>
              <dd>{selectedBill.description}</dd>
            </div>
            <div>
              <dt className="text-muted">Amount</dt>
              <dd className="text-lg font-semibold">
                {formatCurrency(selectedBill.amount)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Due Date</dt>
              <dd>{selectedBill.dueDate}</dd>
            </div>
            <div>
              <dt className="text-muted">Status</dt>
              <dd>
                <Badge variant={billStatusVariant(selectedBill.status)}>
                  {selectedBill.status}
                </Badge>
              </dd>
            </div>
            <div className="flex gap-2 pt-2">
              {selectedBill.status === "Pending Approval" && (
                <Button onClick={() => approveBill(selectedBill)}>Approve</Button>
              )}
              {selectedBill.status !== "Void" && selectedBill.status !== "Paid" && (
                <Button variant="danger" onClick={() => voidBill(selectedBill)}>
                  Void
                </Button>
              )}
            </div>
          </dl>
        )}
      </Drawer>

      <Drawer
        isOpen={!!selectedVendor}
        onClose={() => setSelectedVendor(null)}
        title={selectedVendor?.name ?? ""}
        description={selectedVendor?.category}
      >
        {selectedVendor && (
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-muted">Contact</dt>
              <dd>{selectedVendor.contact}</dd>
            </div>
            <div>
              <dt className="text-muted">Email</dt>
              <dd>{selectedVendor.email}</dd>
            </div>
            <div>
              <dt className="text-muted">Phone</dt>
              <dd>{selectedVendor.phone}</dd>
            </div>
            <div>
              <dt className="text-muted">Payment Terms</dt>
              <dd>{selectedVendor.paymentTerms}</dd>
            </div>
            <div>
              <dt className="text-muted">Outstanding</dt>
              <dd className="font-semibold">
                {formatCurrency(selectedVendor.totalOutstanding)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">YTD Spend</dt>
              <dd>{formatCurrency(selectedVendor.ytdSpend)}</dd>
            </div>
          </dl>
        )}
      </Drawer>

      <Modal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.title ?? ""}
        description={confirmAction?.message}
      >
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmAction(null)}>
            Cancel
          </Button>
          <Button onClick={() => confirmAction?.action()}>Confirm</Button>
        </div>
      </Modal>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
