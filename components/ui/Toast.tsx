"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils/cn";

interface ToastProps {
  message: string | null;
  onDismiss: () => void;
  variant?: "success" | "error";
}

export function Toast({ message, onDismiss, variant = "success" }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-6 right-6 z-[60] max-w-sm rounded-lg border px-4 py-3 text-sm font-medium shadow-lg",
        variant === "success"
          ? "border-green-200 bg-green-50 text-green-800"
          : "border-red-200 bg-red-50 text-red-800",
      )}
    >
      {message}
    </div>
  );
}
