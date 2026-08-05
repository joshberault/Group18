"use client";

import { useRef, useState } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  clientDocuments,
  documentTypeOptions,
} from "@/lib/mock-data/client-portal";
import { cn } from "@/lib/utils/cn";

interface UploadedDocument {
  id: string;
  name: string;
  uploadedAt: string;
  sizeLabel: string;
  documentType: string;
  markedForDeletion?: boolean;
  deletionReason?: string;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function resolveDocumentTypeLabel(typeValue: string, otherLabel: string) {
  if (typeValue === "other") return otherLabel.trim();
  return (
    documentTypeOptions.find((option) => option.value === typeValue)?.label ??
    typeValue
  );
}

export function UploadDocuments() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [documentType, setDocumentType] = useState("");
  const [otherDocumentType, setOtherDocumentType] = useState("");
  const [documents, setDocuments] = useState<UploadedDocument[]>(
    clientDocuments.map((document) => ({
      id: document.id,
      name: document.name,
      uploadedAt: document.uploadedAt,
      sizeLabel: "—",
      documentType: document.documentType,
    })),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [documentPendingDeletion, setDocumentPendingDeletion] =
    useState<UploadedDocument | null>(null);
  const [deletionReason, setDeletionReason] = useState("");
  const [deletionError, setDeletionError] = useState<string | null>(null);

  function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const next = Array.from(fileList);
    setPendingFiles((current) => {
      const existing = new Set(current.map((file) => `${file.name}-${file.size}`));
      const unique = next.filter(
        (file) => !existing.has(`${file.name}-${file.size}`),
      );
      return [...current, ...unique];
    });
    setMessage(null);
    setUploadError(null);
  }

  function removePending(index: number) {
    setPendingFiles((current) => current.filter((_, i) => i !== index));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!documentType) {
      setUploadError("Select the type of documentation before uploading.");
      return;
    }

    if (documentType === "other" && !otherDocumentType.trim()) {
      setUploadError("Describe the document type before uploading.");
      return;
    }

    if (pendingFiles.length === 0) {
      setUploadError("Drop or choose at least one file before submitting.");
      return;
    }

    const typeLabel = resolveDocumentTypeLabel(documentType, otherDocumentType);
    const uploadedAt = new Date().toISOString().slice(0, 10);
    const uploaded = pendingFiles.map((file, index) => ({
      id: `doc-${Date.now()}-${index}`,
      name: file.name,
      uploadedAt,
      sizeLabel: formatFileSize(file.size),
      documentType: typeLabel,
    }));

    setDocuments((current) => [...uploaded, ...current]);
    setPendingFiles([]);
    setDocumentType("");
    setOtherDocumentType("");
    setUploadError(null);
    setMessage(
      uploaded.length === 1
        ? `${uploaded[0].name} uploaded as ${typeLabel}.`
        : `${uploaded.length} documents uploaded as ${typeLabel}.`,
    );
    if (inputRef.current) inputRef.current.value = "";
  }

  function openDeletionPrompt(document: UploadedDocument) {
    setDocumentPendingDeletion(document);
    setDeletionReason("");
    setDeletionError(null);
  }

  function closeDeletionPrompt() {
    setDocumentPendingDeletion(null);
    setDeletionReason("");
    setDeletionError(null);
  }

  function handleDeletionSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!documentPendingDeletion) return;

    const reason = deletionReason.trim();
    if (!reason) {
      setDeletionError("Please explain why this document should be deleted.");
      return;
    }

    setDocuments((current) =>
      current.map((document) =>
        document.id === documentPendingDeletion.id
          ? {
              ...document,
              markedForDeletion: true,
              deletionReason: reason,
            }
          : document,
      ),
    );
    setMessage(
      `${documentPendingDeletion.name} marked for deletion. It remains listed in light red.`,
    );
    closeDeletionPrompt();
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Upload files</CardTitle>
            <CardDescription>
              Choose a documentation type, drop files into the box, then click
              Submit.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label="Type of documentation"
              options={documentTypeOptions}
              value={documentType}
              onChange={(event) => {
                setDocumentType(event.target.value);
                setUploadError(null);
                if (event.target.value !== "other") {
                  setOtherDocumentType("");
                }
              }}
            />

            {documentType === "other" && (
              <Input
                label="Describe the document"
                value={otherDocumentType}
                onChange={(event) => {
                  setOtherDocumentType(event.target.value);
                  setUploadError(null);
                }}
                placeholder="What kind of document is this?"
                required
              />
            )}

            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                addFiles(event.dataTransfer.files);
              }}
              className={cn(
                "flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
                isDragging
                  ? "border-navy-900 bg-gold-100/50"
                  : "border-gray-300 bg-surface hover:border-navy-700 hover:bg-white",
              )}
            >
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-900 text-gold-500">
                <Upload className="h-7 w-7" />
              </div>
              <p className="text-sm font-semibold text-navy-900">
                Drop files here
              </p>
              <p className="mt-1 text-sm text-muted">
                or click to browse your computer
              </p>
              <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(event) => {
                  addFiles(event.target.files);
                  event.target.value = "";
                }}
              />
            </div>

            {pendingFiles.length > 0 && (
              <ul className="space-y-2">
                {pendingFiles.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-navy-900">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted">
                        {formatFileSize(file.size)} · ready to submit
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePending(index)}
                      className="rounded-lg p-2 text-muted hover:bg-gray-100 hover:text-navy-900"
                      aria-label={`Remove ${file.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {uploadError && (
              <p className="text-sm text-red-600">{uploadError}</p>
            )}

            <Button type="submit" className="w-full sm:w-auto">
              Submit
            </Button>

            {message && (
              <p className="rounded-lg bg-gold-100 px-3 py-2 text-sm text-navy-900">
                {message}
              </p>
            )}
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Uploaded documentation</CardTitle>
            <CardDescription>
              All submitted files for this matter appear here. Request deletion
              to mark a file without removing it.
            </CardDescription>
          </CardHeader>

          {documents.length === 0 ? (
            <p className="text-sm text-muted">No documents uploaded yet.</p>
          ) : (
            <ul className="space-y-3">
              {documents.map((document) => (
                <li
                  key={document.id}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border px-3 py-3",
                    document.markedForDeletion
                      ? "border-red-200 bg-red-50"
                      : "border-gray-200 bg-white",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      document.markedForDeletion
                        ? "bg-red-100 text-red-700"
                        : "bg-navy-900/5 text-navy-900",
                    )}
                  >
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-navy-900">
                      {document.name}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {document.documentType} · Uploaded {document.uploadedAt}
                      {document.sizeLabel !== "—"
                        ? ` · ${document.sizeLabel}`
                        : ""}
                    </p>
                    {document.markedForDeletion && document.deletionReason && (
                      <p className="mt-2 text-xs text-red-700">
                        Marked for deletion: {document.deletionReason}
                      </p>
                    )}
                  </div>
                  {!document.markedForDeletion && (
                    <button
                      type="button"
                      onClick={() => openDeletionPrompt(document)}
                      className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-700"
                      aria-label={`Delete ${document.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal
        isOpen={documentPendingDeletion !== null}
        onClose={closeDeletionPrompt}
        title="Request document deletion"
        description={
          documentPendingDeletion
            ? `Explain why “${documentPendingDeletion.name}” should be deleted.`
            : undefined
        }
      >
        <form onSubmit={handleDeletionSubmit} className="space-y-4">
          <Textarea
            label="Reason for deletion"
            value={deletionReason}
            onChange={(event) => {
              setDeletionReason(event.target.value);
              setDeletionError(null);
            }}
            placeholder="Explain why this document should be deleted"
            error={deletionError ?? undefined}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={closeDeletionPrompt}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger">
              Submit
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
