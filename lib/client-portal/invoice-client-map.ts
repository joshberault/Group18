import { clientAccountSummary, clientEngagedCases } from "@/lib/mock-data/client-portal";

/**
 * Map a billing matter onto a client-portal case number when the invoice
 * belongs to the demo portal client (or already uses a portal case #).
 */
export function resolvePortalCaseNumberForInvoice(input: {
  matterNumber: string;
  matterName: string;
  clientName: string;
}): string {
  const exact = clientEngagedCases.find(
    (engaged) => engaged.caseNumber === input.matterNumber,
  );
  if (exact) return exact.caseNumber;

  if (!isPortalClientName(input.clientName)) {
    return input.matterNumber;
  }

  const matterKey = input.matterName.toLowerCase();
  const byTitle = clientEngagedCases.find((engaged) => {
    const titleKey = engaged.title.toLowerCase();
    return (
      matterKey.includes(titleKey.slice(0, 12)) ||
      titleKey.includes(matterKey.slice(0, 12))
    );
  });
  if (byTitle) return byTitle.caseNumber;

  return clientEngagedCases[0]?.caseNumber ?? input.matterNumber;
}

export function isPortalClientName(clientName: string) {
  const portal = clientAccountSummary.clientName.trim().toLowerCase();
  const invoice = clientName.trim().toLowerCase();
  if (!portal || !invoice) return false;
  if (invoice === portal) return true;
  if (invoice.includes(portal) || portal.includes(invoice)) return true;

  const portalTokens = portal.split(/\s+/).filter((token) => token.length > 2);
  return portalTokens.some((token) => invoice.includes(token));
}
