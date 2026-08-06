"use client";

import { useMemo, useState } from "react";
import { Check, Pencil, Plus, Save, X } from "lucide-react";
import {
  accountTypeOptions,
  amAccountingPeriods,
  amApprovalRules,
  amBillingSettings,
  amChartOfAccounts,
  amIntegrations,
  amOfficeEntities,
  amPermissionsMatrix,
  normalBalanceOptions,
  type AccountingPeriod,
  type ApprovalRule,
  type BillingPaymentSettings,
  type ChartOfAccount,
  type IntegrationConfig,
  type PeriodStatus,
} from "@/lib/mock-data/accounting-manager/administration";
import { formatCurrency } from "@/lib/utils/cn";
import { AccountingTabs } from "@/components/accounting-manager/shared/AccountingTabs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Toast } from "@/components/ui/Toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

const TABS = [
  { id: "periods", label: "Accounting Periods" },
  { id: "coa", label: "Chart of Accounts" },
  { id: "approval", label: "Approval Rules" },
  { id: "billing", label: "Billing & Payment Settings" },
  { id: "offices", label: "Offices & Entities" },
  { id: "integrations", label: "Integrations" },
  { id: "permissions", label: "Permissions Overview" },
];

function periodStatusVariant(
  status: PeriodStatus,
): "success" | "warning" | "neutral" {
  if (status === "Open") return "success";
  if (status === "Closing") return "warning";
  return "neutral";
}

function integrationStatusVariant(
  status: string,
): "success" | "warning" | "danger" | "neutral" {
  if (status === "Connected") return "success";
  if (status === "Degraded") return "warning";
  if (status === "Disconnected") return "danger";
  return "neutral";
}

function clonePeriods(data: AccountingPeriod[]) {
  return data.map((p) => ({ ...p }));
}

function cloneAccounts(data: ChartOfAccount[]) {
  return data.map((a) => ({ ...a }));
}

function cloneRules(data: ApprovalRule[]) {
  return data.map((r) => ({ ...r }));
}

function cloneIntegrations(data: IntegrationConfig[]) {
  return data.map((i) => ({ ...i }));
}

export function AccountingAdministrationView() {
  const [activeTab, setActiveTab] = useState("periods");
  const [toast, setToast] = useState<string | null>(null);

  const [periods, setPeriods] = useState<AccountingPeriod[]>(() =>
    clonePeriods(amAccountingPeriods),
  );
  const [accounts, setAccounts] = useState<ChartOfAccount[]>(() =>
    cloneAccounts(amChartOfAccounts),
  );
  const [rules, setRules] = useState<ApprovalRule[]>(() =>
    cloneRules(amApprovalRules),
  );
  const [billing, setBilling] = useState<BillingPaymentSettings>(() => ({
    ...amBillingSettings,
    acceptedPaymentMethods: [...amBillingSettings.acceptedPaymentMethods],
    writeOffReasonCodes: [...amBillingSettings.writeOffReasonCodes],
    creditMemoReasonCodes: [...amBillingSettings.creditMemoReasonCodes],
  }));
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>(() =>
    cloneIntegrations(amIntegrations),
  );

  const [coaSearch, setCoaSearch] = useState("");
  const [coaTypeFilter, setCoaTypeFilter] = useState("all");
  const [coaActiveFilter, setCoaActiveFilter] = useState("all");

  const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(
    null,
  );
  const [accountForm, setAccountForm] = useState<Partial<ChartOfAccount>>({});
  const [accountErrors, setAccountErrors] = useState<Record<string, string>>(
    {},
  );

  const [editingRule, setEditingRule] = useState<ApprovalRule | null>(null);
  const [ruleForm, setRuleForm] = useState<Partial<ApprovalRule>>({});

  const [periodAction, setPeriodAction] = useState<{
    period: AccountingPeriod;
    action: "open" | "close" | "begin_close";
  } | null>(null);
  const [periodNote, setPeriodNote] = useState("");

  const [billingDirty, setBillingDirty] = useState(false);
  const [billingErrors, setBillingErrors] = useState<Record<string, string>>(
    {},
  );

  const [deactivateAccount, setDeactivateAccount] =
    useState<ChartOfAccount | null>(null);

  const filteredAccounts = useMemo(() => {
    const q = coaSearch.trim().toLowerCase();
    return accounts.filter((a) => {
      if (coaTypeFilter !== "all" && a.accountType !== coaTypeFilter) {
        return false;
      }
      if (coaActiveFilter === "active" && !a.active) return false;
      if (coaActiveFilter === "inactive" && a.active) return false;
      if (!q) return true;
      return (
        a.accountNumber.includes(q) ||
        a.accountName.toLowerCase().includes(q)
      );
    });
  }, [accounts, coaSearch, coaTypeFilter, coaActiveFilter]);

  const validateAccount = (form: Partial<ChartOfAccount>): boolean => {
    const errors: Record<string, string> = {};
    if (!form.accountNumber?.trim()) {
      errors.accountNumber = "Account number is required.";
    }
    if (!form.accountName?.trim()) {
      errors.accountName = "Account name is required.";
    }
    if (
      form.accountNumber &&
      accounts.some(
        (a) =>
          a.accountNumber === form.accountNumber &&
          a.id !== form.id,
      )
    ) {
      errors.accountNumber = "Account number already exists.";
    }
    setAccountErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateBilling = (): boolean => {
    const errors: Record<string, string> = {};
    if (!billing.defaultPaymentTerms.trim()) {
      errors.defaultPaymentTerms = "Payment terms are required.";
    }
    if (billing.lateFeeEnabled && billing.lateFeePercent <= 0) {
      errors.lateFeePercent = "Late fee percent must be greater than zero.";
    }
    if (billing.lateFeeEnabled && billing.lateFeeGraceDays < 0) {
      errors.lateFeeGraceDays = "Grace days cannot be negative.";
    }
    if (!billing.invoiceNumberFormat.trim()) {
      errors.invoiceNumberFormat = "Invoice format is required.";
    }
    setBillingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openNewAccount = () => {
    const draft: ChartOfAccount = {
      id: `coa-draft-${Date.now()}`,
      accountNumber: "",
      accountName: "",
      accountType: "Expense",
      normalBalance: "Debit",
      active: true,
      restricted: false,
      isDraft: true,
    };
    setEditingAccount(draft);
    setAccountForm(draft);
    setAccountErrors({});
  };

  const openEditAccount = (account: ChartOfAccount) => {
    setEditingAccount(account);
    setAccountForm({ ...account });
    setAccountErrors({});
  };

  const saveAccount = () => {
    if (!validateAccount(accountForm)) return;
    const saved = accountForm as ChartOfAccount;

    if (accounts.some((a) => a.id === saved.id)) {
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === saved.id ? { ...saved, isDraft: false } : a,
        ),
      );
    } else {
      setAccounts((prev) => [...prev, { ...saved, isDraft: false }]);
    }
    setEditingAccount(null);
    setToast("Account saved.");
  };

  const toggleAccountActive = (account: ChartOfAccount) => {
    if (account.active) {
      setDeactivateAccount(account);
    } else {
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === account.id ? { ...a, active: true } : a,
        ),
      );
      setToast(`${account.accountName} activated.`);
    }
  };

  const confirmDeactivate = () => {
    if (!deactivateAccount) return;
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === deactivateAccount.id ? { ...a, active: false } : a,
      ),
    );
    setDeactivateAccount(null);
    setToast(`${deactivateAccount.accountName} deactivated.`);
  };

  const openEditRule = (rule: ApprovalRule) => {
    setEditingRule(rule);
    setRuleForm({ ...rule });
  };

  const saveRule = () => {
    if (!editingRule) return;
    if (ruleForm.threshold === undefined || ruleForm.threshold < 0) {
      setToast("Threshold must be zero or greater.");
      return;
    }
    if (!ruleForm.requiredRole?.trim()) {
      setToast("Required role is required.");
      return;
    }
    setRules((prev) =>
      prev.map((r) =>
        r.id === editingRule.id
          ? {
              ...r,
              threshold: ruleForm.threshold ?? r.threshold,
              requiredRole: ruleForm.requiredRole ?? r.requiredRole,
              secondaryApproval:
                ruleForm.secondaryApproval === ""
                  ? null
                  : (ruleForm.secondaryApproval ?? r.secondaryApproval),
              active: ruleForm.active ?? r.active,
            }
          : r,
      ),
    );
    setEditingRule(null);
    setToast("Approval rule updated.");
  };

  const handlePeriodAction = () => {
    if (!periodAction) return;
    if (!periodNote.trim()) {
      setToast("A note is required for period changes.");
      return;
    }

    const { period, action } = periodAction;

    if (action === "close" && period.blockingTasks > 0) {
      setToast("Cannot close period — unresolved blocking close tasks remain.");
      return;
    }

    setPeriods((prev) =>
      prev.map((p) => {
        if (p.id !== period.id) return p;
        if (action === "open") {
          return { ...p, status: "Open" as PeriodStatus, closeDate: undefined, closedBy: undefined };
        }
        if (action === "begin_close") {
          return { ...p, status: "Closing" as PeriodStatus };
        }
        return {
          ...p,
          status: "Closed" as PeriodStatus,
          closeDate: new Date().toISOString().slice(0, 10),
          closedBy: "Alex Morgan",
        };
      }),
    );
    setPeriodAction(null);
    setPeriodNote("");
    setToast(`Period ${action.replace("_", " ")} completed.`);
  };

  const saveBilling = () => {
    if (!validateBilling()) return;
    setBillingDirty(false);
    setToast("Billing settings saved.");
  };

  const toggleIntegration = (id: string) => {
    setIntegrations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, enabled: !i.enabled } : i)),
    );
    setToast("Integration status updated.");
  };

  const permissionLabels: Array<{
    key: keyof (typeof amPermissionsMatrix)[0];
    label: string;
  }> = [
    { key: "viewFirmWideAr", label: "View Firm-Wide A/R" },
    { key: "approveWriteOffs", label: "Approve Write-Offs" },
    { key: "approveJournalEntries", label: "Approve Journal Entries" },
    { key: "approvePayments", label: "Approve Payments" },
    { key: "reconcileTrust", label: "Reconcile Trust" },
    { key: "closeAccountingPeriods", label: "Close Accounting Periods" },
    { key: "editFinancialSettings", label: "Edit Financial Settings" },
    { key: "exportFinancialRecords", label: "Export Financial Records" },
  ];

  return (
    <>
      <PageHeader
        title="Accounting Administration"
        description="Manage accounting periods, financial controls, approval thresholds, billing configuration, and accounting integrations."
      />

      <AccountingTabs
        tabs={TABS}
        activeTab={activeTab}
        onChange={setActiveTab}
        className="mb-6"
      />

      {activeTab === "periods" && (
        <Card>
          <CardHeader>
            <CardTitle>Accounting Periods</CardTitle>
            <CardDescription>
              Open, begin close, or close accounting periods with required notes.
            </CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Close Date</TableHead>
                <TableHead>Closed By</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.map((period) => (
                <TableRow key={period.id}>
                  <TableCell className="font-medium">{period.period}</TableCell>
                  <TableCell>{period.startDate}</TableCell>
                  <TableCell>{period.endDate}</TableCell>
                  <TableCell>
                    <Badge variant={periodStatusVariant(period.status)}>
                      {period.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{period.closeDate ?? "—"}</TableCell>
                  <TableCell>{period.closedBy ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {period.status === "Closed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPeriodAction({ period, action: "open" });
                            setPeriodNote("");
                          }}
                        >
                          Open
                        </Button>
                      )}
                      {period.status === "Open" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPeriodAction({ period, action: "begin_close" });
                            setPeriodNote("");
                          }}
                        >
                          Begin Close
                        </Button>
                      )}
                      {(period.status === "Open" ||
                        period.status === "Closing") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPeriodAction({ period, action: "close" });
                            setPeriodNote("");
                          }}
                        >
                          Close
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {activeTab === "coa" && (
        <div className="space-y-4">
          <Card padding="md">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
              <div className="grid flex-1 gap-4 sm:grid-cols-3">
                <Input
                  label="Search accounts"
                  placeholder="Number or name…"
                  value={coaSearch}
                  onChange={(e) => setCoaSearch(e.target.value)}
                />
                <Select
                  label="Account type"
                  value={coaTypeFilter}
                  onChange={(e) => setCoaTypeFilter(e.target.value)}
                  options={[
                    { value: "all", label: "All types" },
                    ...accountTypeOptions.map((t) => ({
                      value: t,
                      label: t,
                    })),
                  ]}
                />
                <Select
                  label="Status"
                  value={coaActiveFilter}
                  onChange={(e) => setCoaActiveFilter(e.target.value)}
                  options={[
                    { value: "all", label: "All" },
                    { value: "active", label: "Active only" },
                    { value: "inactive", label: "Inactive only" },
                  ]}
                />
              </div>
              <Button onClick={openNewAccount}>
                <Plus className="h-4 w-4" />
                New Account
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Normal Balance</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Restricted</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted">
                      No accounts match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-mono">
                        {account.accountNumber}
                        {account.isDraft && (
                          <Badge variant="gold" className="ml-2">
                            Draft
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{account.accountName}</TableCell>
                      <TableCell>{account.accountType}</TableCell>
                      <TableCell>{account.normalBalance}</TableCell>
                      <TableCell>
                        <Badge
                          variant={account.active ? "success" : "neutral"}
                        >
                          {account.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {account.restricted ? (
                          <Badge variant="warning">Restricted</Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditAccount(account)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleAccountActive(account)}
                          >
                            {account.active ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {activeTab === "approval" && (
        <Card>
          <CardHeader>
            <CardTitle>Approval Rules</CardTitle>
            <CardDescription>
              Configure approval thresholds for financial transactions.
            </CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction Type</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead>Required Role</TableHead>
                <TableHead>Secondary Approval</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">
                    {rule.transactionType}
                  </TableCell>
                  <TableCell>
                    {rule.threshold === 0
                      ? "All amounts"
                      : formatCurrency(rule.threshold)}
                  </TableCell>
                  <TableCell>{rule.requiredRole}</TableCell>
                  <TableCell>{rule.secondaryApproval ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={rule.active ? "success" : "neutral"}>
                      {rule.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditRule(rule)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {activeTab === "billing" && (
        <Card>
          <CardHeader>
            <CardTitle>Billing & Payment Settings</CardTitle>
            <CardDescription>
              Firm-wide billing defaults, payment terms, and reason codes.
            </CardDescription>
          </CardHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Default payment terms"
              value={billing.defaultPaymentTerms}
              onChange={(e) => {
                setBilling((b) => ({
                  ...b,
                  defaultPaymentTerms: e.target.value,
                }));
                setBillingDirty(true);
              }}
              error={billingErrors.defaultPaymentTerms}
            />
            <Input
              label="Billing cycle default"
              value={billing.billingCycleDefault}
              onChange={(e) => {
                setBilling((b) => ({
                  ...b,
                  billingCycleDefault: e.target.value,
                }));
                setBillingDirty(true);
              }}
            />
            <Input
              label="Invoice numbering format"
              value={billing.invoiceNumberFormat}
              onChange={(e) => {
                setBilling((b) => ({
                  ...b,
                  invoiceNumberFormat: e.target.value,
                }));
                setBillingDirty(true);
              }}
              error={billingErrors.invoiceNumberFormat}
            />
            <div className="flex items-center gap-3 pt-6">
              <input
                id="late-fee-enabled"
                type="checkbox"
                checked={billing.lateFeeEnabled}
                onChange={(e) => {
                  setBilling((b) => ({
                    ...b,
                    lateFeeEnabled: e.target.checked,
                  }));
                  setBillingDirty(true);
                }}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label
                htmlFor="late-fee-enabled"
                className="text-sm font-medium text-navy-900"
              >
                Enable late fees
              </label>
            </div>
            {billing.lateFeeEnabled && (
              <>
                <Input
                  label="Late fee percent"
                  type="number"
                  min="0"
                  step="0.1"
                  value={billing.lateFeePercent}
                  onChange={(e) => {
                    setBilling((b) => ({
                      ...b,
                      lateFeePercent: Number.parseFloat(e.target.value) || 0,
                    }));
                    setBillingDirty(true);
                  }}
                  error={billingErrors.lateFeePercent}
                />
                <Input
                  label="Late fee grace days"
                  type="number"
                  min="0"
                  value={billing.lateFeeGraceDays}
                  onChange={(e) => {
                    setBilling((b) => ({
                      ...b,
                      lateFeeGraceDays:
                        Number.parseInt(e.target.value, 10) || 0,
                    }));
                    setBillingDirty(true);
                  }}
                  error={billingErrors.lateFeeGraceDays}
                />
              </>
            )}
            <div className="sm:col-span-2">
              <Textarea
                label="Accepted payment methods (one per line)"
                value={billing.acceptedPaymentMethods.join("\n")}
                onChange={(e) => {
                  setBilling((b) => ({
                    ...b,
                    acceptedPaymentMethods: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }));
                  setBillingDirty(true);
                }}
              />
            </div>
            <Textarea
              label="Write-off reason codes (one per line)"
              value={billing.writeOffReasonCodes.join("\n")}
              onChange={(e) => {
                setBilling((b) => ({
                  ...b,
                  writeOffReasonCodes: e.target.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                }));
                setBillingDirty(true);
              }}
            />
            <Textarea
              label="Credit memo reason codes (one per line)"
              value={billing.creditMemoReasonCodes.join("\n")}
              onChange={(e) => {
                setBilling((b) => ({
                  ...b,
                  creditMemoReasonCodes: e.target.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                }));
                setBillingDirty(true);
              }}
            />
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={saveBilling} disabled={!billingDirty}>
              <Save className="h-4 w-4" />
              Save Settings
            </Button>
          </div>
        </Card>
      )}

      {activeTab === "offices" && (
        <Card>
          <CardHeader>
            <CardTitle>Offices & Entities</CardTitle>
            <CardDescription>
              Firm offices and legal entities with accounting configuration.
            </CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Office</TableHead>
                <TableHead>Legal Name</TableHead>
                <TableHead>Tax ID</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Default Bank</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {amOfficeEntities.map((office) => (
                <TableRow key={office.id}>
                  <TableCell className="font-medium">{office.office}</TableCell>
                  <TableCell>{office.legalName}</TableCell>
                  <TableCell className="font-mono">
                    {office.taxIdMasked}
                  </TableCell>
                  <TableCell>{office.baseCurrency}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {office.defaultBankAccount}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        office.accountingStatus === "Active"
                          ? "success"
                          : "neutral"
                      }
                    >
                      {office.accountingStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {activeTab === "integrations" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {integrations.map((integration) => (
            <Card key={integration.id} padding="md">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-navy-900">
                    {integration.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {integration.description}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge
                      variant={integrationStatusVariant(integration.status)}
                    >
                      {integration.status}
                    </Badge>
                    {integration.lastSync && (
                      <span className="text-xs text-muted">
                        Last sync:{" "}
                        {new Date(integration.lastSync).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant={integration.enabled ? "secondary" : "primary"}
                  size="sm"
                  onClick={() => toggleIntegration(integration.id)}
                >
                  {integration.enabled ? "Disable" : "Enable"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "permissions" && (
        <Card>
          <CardHeader>
            <CardTitle>Permissions Overview</CardTitle>
            <CardDescription>
              Read-only matrix of accounting-related permissions by role. This
              does not modify production authorization.
            </CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                {permissionLabels.map((p) => (
                  <TableHead key={p.key} className="text-center">
                    {p.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {amPermissionsMatrix.map((row) => (
                <TableRow key={row.role}>
                  <TableCell className="font-medium">{row.role}</TableCell>
                  {permissionLabels.map((p) => (
                    <TableCell key={p.key} className="text-center">
                      {row[p.key] ? (
                        <Check className="mx-auto h-4 w-4 text-green-600" />
                      ) : (
                        <X className="mx-auto h-4 w-4 text-gray-300" />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Modal
        isOpen={Boolean(editingAccount)}
        onClose={() => setEditingAccount(null)}
        title={
          accountForm.isDraft ? "Create Draft Account" : "Edit Account"
        }
      >
        <div className="space-y-4">
          <Input
            label="Account number"
            value={accountForm.accountNumber ?? ""}
            onChange={(e) =>
              setAccountForm((f) => ({
                ...f,
                accountNumber: e.target.value,
              }))
            }
            error={accountErrors.accountNumber}
          />
          <Input
            label="Account name"
            value={accountForm.accountName ?? ""}
            onChange={(e) =>
              setAccountForm((f) => ({ ...f, accountName: e.target.value }))
            }
            error={accountErrors.accountName}
          />
          <Select
            label="Account type"
            value={accountForm.accountType ?? "Expense"}
            onChange={(e) =>
              setAccountForm((f) => ({
                ...f,
                accountType: e.target.value as ChartOfAccount["accountType"],
              }))
            }
            options={accountTypeOptions.map((t) => ({
              value: t,
              label: t,
            }))}
          />
          <Select
            label="Normal balance"
            value={accountForm.normalBalance ?? "Debit"}
            onChange={(e) =>
              setAccountForm((f) => ({
                ...f,
                normalBalance: e.target.value as ChartOfAccount["normalBalance"],
              }))
            }
            options={normalBalanceOptions.map((b) => ({
              value: b,
              label: b,
            }))}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditingAccount(null)}>
              Cancel
            </Button>
            <Button onClick={saveAccount}>Save Account</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(editingRule)}
        onClose={() => setEditingRule(null)}
        title="Edit Approval Rule"
      >
        <div className="space-y-4">
          <Input
            label="Transaction type"
            value={ruleForm.transactionType ?? ""}
            disabled
          />
          <Input
            label="Threshold ($)"
            type="number"
            min="0"
            value={ruleForm.threshold ?? 0}
            onChange={(e) =>
              setRuleForm((f) => ({
                ...f,
                threshold: Number.parseFloat(e.target.value) || 0,
              }))
            }
          />
          <Input
            label="Required role"
            value={ruleForm.requiredRole ?? ""}
            onChange={(e) =>
              setRuleForm((f) => ({ ...f, requiredRole: e.target.value }))
            }
          />
          <Input
            label="Secondary approval (optional)"
            value={ruleForm.secondaryApproval ?? ""}
            onChange={(e) =>
              setRuleForm((f) => ({
                ...f,
                secondaryApproval: e.target.value || null,
              }))
            }
          />
          <div className="flex items-center gap-3">
            <input
              id="rule-active"
              type="checkbox"
              checked={ruleForm.active ?? true}
              onChange={(e) =>
                setRuleForm((f) => ({ ...f, active: e.target.checked }))
              }
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="rule-active" className="text-sm text-navy-900">
              Rule active
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditingRule(null)}>
              Cancel
            </Button>
            <Button onClick={saveRule}>Save Rule</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(periodAction)}
        onClose={() => setPeriodAction(null)}
        title={
          periodAction?.action === "open"
            ? "Open Period"
            : periodAction?.action === "begin_close"
              ? "Begin Period Close"
              : "Close Period"
        }
        description={
          periodAction
            ? `${periodAction.action.replace("_", " ")} for ${periodAction.period.period}`
            : undefined
        }
      >
        <div className="space-y-4">
          <Textarea
            label="Note (required)"
            placeholder="Document the reason for this period change…"
            value={periodNote}
            onChange={(e) => setPeriodNote(e.target.value)}
          />
          {periodAction?.action === "close" &&
            periodAction.period.blockingTasks > 0 && (
              <p className="text-sm text-red-600">
                {periodAction.period.blockingTasks} blocking close task
                {periodAction.period.blockingTasks !== 1 ? "s" : ""} must be
                resolved first.
              </p>
            )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPeriodAction(null)}>
              Cancel
            </Button>
            <Button
              disabled={!periodNote.trim()}
              onClick={handlePeriodAction}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(deactivateAccount)}
        onClose={() => setDeactivateAccount(null)}
        title="Deactivate Account"
        description={
          deactivateAccount
            ? `Deactivate ${deactivateAccount.accountNumber} — ${deactivateAccount.accountName}?`
            : undefined
        }
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeactivateAccount(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDeactivate}>
            Deactivate
          </Button>
        </div>
      </Modal>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
