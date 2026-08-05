import {
  getFlatFeeAmount,
  resolveBillingModel,
  type BillingModel,
} from "@/lib/client-related-matters/billing-models";

export type MatterTeamMember = {
  id: string;
  name: string;
  title: string;
  role: "attorney" | "paralegal";
};

export type ClientMatter = {
  id: string;
  clientId: string;
  clientName: string;
  matterName: string;
  matterReference: string;
  caseType: string;
  status: "open" | "closed";
  /** Balance the client still owes on this matter, in USD. */
  outstandingBalance: number;
  team: MatterTeamMember[];
};

export type ResolvedMatter = ClientMatter & {
  billingModel: BillingModel;
  flatFeeAmount: number | null;
  /** Amount a payment plan has to retire: the flat fee when fixed, otherwise the balance. */
  planTarget: number;
};

const ELENA: MatterTeamMember = {
  id: "emp-elena-vargas",
  name: "Elena Vargas",
  title: "Senior Partner",
  role: "attorney",
};
const MARCUS: MatterTeamMember = {
  id: "emp-marcus-hale",
  name: "Marcus Hale",
  title: "Partner",
  role: "attorney",
};
const JONAH: MatterTeamMember = {
  id: "emp-jonah-reed",
  name: "Jonah Reed",
  title: "Senior Associate",
  role: "attorney",
};
const CAMILLE: MatterTeamMember = {
  id: "emp-camille-ortiz",
  name: "Camille Ortiz",
  title: "Associate",
  role: "attorney",
};
const PRIYA: MatterTeamMember = {
  id: "emp-priya-nair",
  name: "Priya Nair",
  title: "Paralegal",
  role: "paralegal",
};
const DEVON: MatterTeamMember = {
  id: "emp-devon-clarke",
  name: "Devon Clarke",
  title: "Paralegal",
  role: "paralegal",
};

export const CLIENT_MATTERS: ClientMatter[] = [
  {
    id: "crm-1",
    clientId: "gc-1",
    clientName: "Northline Capital",
    matterName: "Series B Financing",
    matterReference: "NV-M-22041",
    caseType: "Corporate/business advisory",
    status: "open",
    outstandingBalance: 18400,
    team: [ELENA, PRIYA],
  },
  {
    id: "crm-2",
    clientId: "gc-1",
    clientName: "Northline Capital",
    matterName: "M&A Diligence — Summit Co.",
    matterReference: "NV-M-22058",
    caseType: "Mergers and acquisitions",
    status: "open",
    outstandingBalance: 42750,
    team: [ELENA, DEVON],
  },
  {
    id: "crm-3",
    clientId: "gc-2",
    clientName: "Harborview Medical",
    matterName: "Employment Compliance Review",
    matterReference: "NV-M-21990",
    caseType: "Employment counseling (employer)",
    status: "open",
    outstandingBalance: 9600,
    team: [MARCUS, PRIYA],
  },
  {
    id: "crm-4",
    clientId: "gc-3",
    clientName: "Ridgecrest Properties",
    matterName: "Commercial Lease Portfolio",
    matterReference: "NV-M-21810",
    caseType: "Commercial real estate",
    status: "open",
    outstandingBalance: 12250,
    team: [JONAH, DEVON],
  },
  {
    id: "crm-5",
    clientId: "gc-4",
    clientName: "Lumen Tech Holdings",
    matterName: "Trademark Portfolio Filing",
    matterReference: "NV-M-22102",
    caseType: "Intellectual property prosecution",
    status: "open",
    outstandingBalance: 2000,
    team: [CAMILLE, DEVON],
  },
  {
    id: "crm-6",
    clientId: "gc-2",
    clientName: "Harborview Medical",
    matterName: "Delgado Injury Claim",
    matterReference: "NV-M-22120",
    caseType: "Personal injury (plaintiff)",
    status: "open",
    outstandingBalance: 0,
    team: [MARCUS, PRIYA],
  },
];

function resolveMatter(matter: ClientMatter): ResolvedMatter {
  const billingModel = resolveBillingModel(matter.caseType);
  const flatFeeAmount = getFlatFeeAmount(matter.caseType);

  return {
    ...matter,
    billingModel,
    flatFeeAmount,
    planTarget:
      billingModel === "flat_fee" && flatFeeAmount != null
        ? flatFeeAmount
        : matter.outstandingBalance,
  };
}

export const RESOLVED_MATTERS: ResolvedMatter[] =
  CLIENT_MATTERS.map(resolveMatter);

export const CLIENT_OPTIONS = [
  { value: "all", label: "All clients" },
  ...Array.from(
    new Map(
      CLIENT_MATTERS.map((matter) => [matter.clientId, matter.clientName]),
    ),
  ).map(([value, label]) => ({ value, label })),
];

export function getMattersForClient(clientId: string): ResolvedMatter[] {
  if (clientId === "all") return RESOLVED_MATTERS;
  return RESOLVED_MATTERS.filter((matter) => matter.clientId === clientId);
}

export function findMatterByClientAndName(
  clientName: string,
  matterName: string,
): ResolvedMatter | null {
  return (
    RESOLVED_MATTERS.find(
      (matter) =>
        matter.clientName === clientName && matter.matterName === matterName,
    ) ?? null
  );
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}
