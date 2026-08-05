import { GenerateInvoiceWizard } from "@/components/billing/GenerateInvoiceWizard";
// Global CSS must be imported from a Server Component (not a "use client" file).
import "@/components/billing/billing-module.css";

/** Multi-step Generate Invoice workflow. */
export default function GenerateInvoicePage() {
  return <GenerateInvoiceWizard />;
}
