"use client";

import { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "./Button";

interface FullScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  backLabel?: string;
  children?: React.ReactNode;
  className?: string;
}

/** Full-viewport modal for dashboard drill-down panels (queues, etc.). */
export function FullScreenModal({
  isOpen,
  onClose,
  title,
  description,
  backLabel = "Back to Dashboard",
  children,
  className,
}: FullScreenModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-0 h-full w-full max-h-full max-w-full bg-white p-0 backdrop:bg-navy-950/60"
      onClose={onClose}
    >
      <div className={cn("flex h-full flex-col", className)}>
        <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-7xl items-start gap-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="shrink-0 gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {backLabel}
            </Button>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
              {description ? (
                <p className="mt-0.5 text-sm text-muted">{description}</p>
              ) : null}
            </div>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</div>
        </div>
      </div>
    </dialog>
  );
}
