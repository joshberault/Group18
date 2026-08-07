"use client";

import { useCallback, useEffect, useState } from "react";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { getDemoSubmitterContext } from "@/lib/demo/time-workflow-store";
import {
  fetchSharedFirmMatters,
  toAttorneyWorkflowMatter,
} from "@/lib/matters/firm-matters-supabase";
import { FIRM_PORTFOLIO_UPDATE_EVENT } from "@/lib/matters/firm-portfolio-store";
import type { Matter } from "@/types/database";

/** Live matters assigned to the active demo attorney (Supabase roster). */
export function useAssignedAttorneyMatters() {
  const { selectedRole, identity, attorneySpecialty } = useDemoRole();
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (selectedRole !== "attorney") {
      setMatters([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const submitter = getDemoSubmitterContext(
      selectedRole,
      attorneySpecialty,
    );
    const result = await fetchSharedFirmMatters({
      includeWip: false,
      assigneeProfileId: submitter.profileId,
      assigneeFullName: identity.fullName,
      strictAssigneeFilter: true,
    });

    setMatters(result.matters.map(toAttorneyWorkflowMatter));
    setError(result.error);
    setLoading(false);
  }, [attorneySpecialty, identity.fullName, selectedRole]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpdate = () => void refresh();
    window.addEventListener(FIRM_PORTFOLIO_UPDATE_EVENT, onUpdate);
    return () => window.removeEventListener(FIRM_PORTFOLIO_UPDATE_EVENT, onUpdate);
  }, [refresh]);

  return { matters, loading, error, refresh };
}
