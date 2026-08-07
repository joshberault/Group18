import { clientDocuments, clientEngagedCases } from "@/lib/mock-data/client-portal";
import {
  addMatterDocument,
  getMatterDocuments,
  getMatterDocumentsForNumbers,
  MATTER_WORKSPACE_UPDATE_EVENT,
  resolveMatterDocumentNumber,
  type MatterDocument,
} from "@/lib/matters/workspace-store";

export const PORTAL_DOCUMENTS_UPDATE_EVENT = MATTER_WORKSPACE_UPDATE_EVENT;

export type PortalDocument = {
  id: string;
  name: string;
  documentType: string;
  uploadedBy: string;
  uploadedAt: string;
  sizeLabel: string;
  caseNumber: string;
};

const CLIENT_SEED_SYNC_KEY = "counselflow-portal-doc-seeds-synced";

function toPortalDocument(document: MatterDocument): PortalDocument | null {
  const caseNumber =
    resolveMatterDocumentNumber(document) ??
    clientEngagedCases.find((item) => item.id === document.matterId)
      ?.caseNumber ??
    null;
  if (!caseNumber) return null;

  return {
    id: document.id,
    name: document.name,
    documentType: document.documentType,
    uploadedBy: document.uploadedBy,
    uploadedAt: document.uploadedAt,
    sizeLabel: document.sizeLabel,
    caseNumber,
  };
}

/** One-time merge of legacy client portal mock docs into the shared store. */
function ensureClientDocumentSeeds() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(CLIENT_SEED_SYNC_KEY) === "1") return;
  window.localStorage.setItem(CLIENT_SEED_SYNC_KEY, "1");

  const existingIds = new Set(getMatterDocuments().map((doc) => doc.id));
  for (const document of clientDocuments) {
    if (existingIds.has(document.id)) continue;
    const engaged = clientEngagedCases.find(
      (item) => item.caseNumber === document.caseNumber,
    );
    addMatterDocument({
      id: document.id,
      matterId: engaged?.id ?? document.caseNumber,
      matterNumber: document.caseNumber,
      name: document.name,
      documentType: document.documentType,
      uploadedBy: document.uploadedBy,
      uploadedAt: document.uploadedAt,
      sizeLabel: "—",
    });
  }
}

export function getPortalDocuments(): PortalDocument[] {
  ensureClientDocumentSeeds();
  return getMatterDocuments()
    .map(toPortalDocument)
    .filter((document): document is PortalDocument => document != null);
}

export function getPortalDocumentsForCaseNumbers(
  caseNumbers: string[],
): PortalDocument[] {
  ensureClientDocumentSeeds();
  return getMatterDocumentsForNumbers(caseNumbers)
    .map(toPortalDocument)
    .filter((document): document is PortalDocument => document != null);
}

export function addPortalDocument(input: {
  id: string;
  name: string;
  documentType: string;
  uploadedBy: string;
  uploadedAt: string;
  sizeLabel: string;
  caseNumber: string;
  matterId?: string;
}) {
  const engaged = clientEngagedCases.find(
    (item) => item.caseNumber === input.caseNumber,
  );
  addMatterDocument({
    id: input.id,
    matterId: input.matterId ?? engaged?.id ?? input.caseNumber,
    matterNumber: input.caseNumber,
    name: input.name,
    documentType: input.documentType,
    uploadedBy: input.uploadedBy,
    uploadedAt: input.uploadedAt,
    sizeLabel: input.sizeLabel,
  });
}
