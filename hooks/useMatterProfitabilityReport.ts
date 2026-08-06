"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchMatterProfitability } from "@/lib/analytics/rpc";
import type { MatterProfitabilityRow } from "@/lib/analytics/types";

export type ProfitabilitySortKey =
  | "matter_title"
  | "billed_revenue"
  | "collected_revenue"
  | "net_profit"
  | "margin_pct";

export type SortDirection = "asc" | "desc";

function compareRows(
  a: MatterProfitabilityRow,
  b: MatterProfitabilityRow,
  key: ProfitabilitySortKey,
  direction: SortDirection,
): number {
  let result = 0;

  if (key === "matter_title") {
    result = a.matter_title.localeCompare(b.matter_title);
  } else if (key === "margin_pct") {
    const aVal = a.margin_pct ?? -Infinity;
    const bVal = b.margin_pct ?? -Infinity;
    result = aVal - bVal;
  } else {
    result = a[key] - b[key];
  }

  return direction === "asc" ? result : -result;
}

export function useMatterProfitabilityReport() {
  const [rows, setRows] = useState<MatterProfitabilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<ProfitabilitySortKey>("net_profit");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await fetchMatterProfitability();
    if (result.error || !result.data) {
      setRows([]);
      setError(
        result.error ??
          "Unable to load matter profitability. Ensure analytics RPC functions are deployed.",
      );
      setLoading(false);
      return;
    }

    setRows(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => compareRows(a, b, sortKey, sortDirection)),
    [rows, sortKey, sortDirection],
  );

  const toggleSort = useCallback(
    (key: ProfitabilitySortKey) => {
      if (sortKey === key) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDirection(key === "matter_title" ? "asc" : "desc");
      }
    },
    [sortKey],
  );

  return {
    rows: sortedRows,
    rowCount: rows.length,
    loading,
    error,
    refresh,
    sortKey,
    sortDirection,
    toggleSort,
  };
}
