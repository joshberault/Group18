export type BillingSummary = {
  totalInvoices: number;
  outstandingReceivable: number;
  collectionsThisMonth: number;
  overdueInvoices: number;
};

export type RevenueByAttorney = {
  attorneyId: string;
  attorneyName: string;
  revenue: number;
  invoiceCount: number;
};

export type RevenueByClient = {
  clientId: string;
  clientName: string;
  revenue: number;
  openBalance: number;
};

export type BillingDashboardData = {
  summary: BillingSummary;
  revenueByAttorney: RevenueByAttorney[];
  revenueByClient: RevenueByClient[];
  source: "supabase" | "placeholder";
};
