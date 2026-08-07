"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchAdminOperationsDataset,
  type AdminOperationsDataset,
} from "@/lib/admin/queries";
import { subscribeTimeWorkflow } from "@/lib/demo/time-workflow-store";

type AdminDataContextValue = {
  data: AdminOperationsDataset | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const AdminDataContext = createContext<AdminDataContextValue | null>(null);

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AdminOperationsDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchAdminOperationsDataset();
      setData(next);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load Admin data.";
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return subscribeTimeWorkflow(() => {
      void refresh();
    });
  }, [refresh]);

  const value = useMemo(
    () => ({ data, loading, error, refresh }),
    [data, loading, error, refresh],
  );

  return (
    <AdminDataContext.Provider value={value}>
      {children}
    </AdminDataContext.Provider>
  );
}

export function useAdminData(): AdminDataContextValue {
  const ctx = useContext(AdminDataContext);
  if (!ctx) {
    throw new Error("useAdminData must be used within AdminDataProvider");
  }
  return ctx;
}
