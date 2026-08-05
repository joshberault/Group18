"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminApproval } from "@/lib/admin/types";
import {
  getDemoApprovals,
  getDemoJournalEntries,
  getMergedApprovals,
  getPayrollAccruals,
  getTimeEntriesForProfile,
  subscribeTimeWorkflow,
  type DemoJournalEntry,
  type DemoPayrollAccrual,
} from "@/lib/demo/time-workflow-store";
import type { TimeEntry } from "@/types/database";

export function useDemoTimeWorkflow(profileId?: string) {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [approvals, setApprovals] = useState<AdminApproval[]>([]);
  const [mergedApprovals, setMergedApprovals] = useState<AdminApproval[]>([]);
  const [payrollAccruals, setPayrollAccruals] = useState<DemoPayrollAccrual[]>([]);
  const [journalEntries, setJournalEntries] = useState<DemoJournalEntry[]>([]);

  const refresh = useCallback(() => {
    if (profileId) {
      setTimeEntries(getTimeEntriesForProfile(profileId));
    }
    setApprovals(getDemoApprovals());
    setMergedApprovals(getMergedApprovals());
    setPayrollAccruals(getPayrollAccruals());
    setJournalEntries(getDemoJournalEntries());
  }, [profileId]);

  useEffect(() => {
    refresh();
    return subscribeTimeWorkflow(refresh);
  }, [refresh]);

  return {
    timeEntries,
    approvals,
    mergedApprovals,
    payrollAccruals,
    journalEntries,
    refresh,
  };
}
