"use client";

import { useCallback, useEffect, useState } from "react";

export function useSupabaseQuery<T>(
  loader: () => Promise<{ data: T; error: string | null; empty: boolean }>,
  deps: unknown[] = [],
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await loader();
    setData(result.data);
    setError(result.error);
    setEmpty(result.empty);
    setLoading(false);
  }, deps);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, empty, refresh };
}
