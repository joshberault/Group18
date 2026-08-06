"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getParalegalWorkflow,
  PARALEGAL_WORKFLOW_UPDATE_EVENT,
  type ParalegalWorkflowState,
} from "@/lib/paralegal/workflow-store";

export function useParalegalWorkflow() {
  const [state, setState] = useState<ParalegalWorkflowState>(() =>
    getParalegalWorkflow(),
  );

  const refresh = useCallback(() => {
    setState(getParalegalWorkflow());
  }, []);

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener(PARALEGAL_WORKFLOW_UPDATE_EVENT, onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener(PARALEGAL_WORKFLOW_UPDATE_EVENT, onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [refresh]);

  return { ...state, refresh };
}
