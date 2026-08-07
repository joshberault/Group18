"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { searchGlobalRecordsFromSupabase } from "@/lib/demo/global-search-supabase";
import type { GlobalSearchResult } from "@/lib/demo/global-search";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";

const TYPE_LABELS = {
  client: "Client",
  matter: "Matter",
  invoice: "Invoice",
  receivable: "Receivable",
  document: "Document",
  task: "Task",
} as const;

export function GlobalSearch() {
  const router = useRouter();
  const { selectedRole } = useDemoRole();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const rows = await searchGlobalRecordsFromSupabase(query, selectedRole);
      if (!cancelled) setResults(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [query, selectedRole]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function navigate(result: GlobalSearchResult) {
    setOpen(false);
    setQuery("");
    router.push(result.href);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative h-10">
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          placeholder="Search clients, matters, invoices..."
          className="pl-9"
          aria-label="Search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter" && results[0]) navigate(results[0]);
          }}
        />
      </div>

      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">No matching records.</p>
          ) : (
            <ul>
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50",
                    )}
                    onClick={() => navigate(result)}
                  >
                    <span className="mt-0.5 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-navy-800">
                      {TYPE_LABELS[result.type]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-navy-900">
                        {result.label}
                      </span>
                      {result.reference ? (
                        <span className="block truncate text-xs text-muted">
                          {result.reference}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
