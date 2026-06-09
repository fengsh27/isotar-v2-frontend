"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Wizard } from "@/components/wizard/Wizard";
import { useWizardStore } from "@/stores/wizardStore";
import type { WorkflowType } from "@/lib/types";

export function RunPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reset = useWizardStore((state) => state.reset);
  const setWorkflow = useWizardStore((state) => state.setWorkflow);

  useEffect(() => {
    const wfParam = searchParams.get("workflow");
    const wf: WorkflowType = wfParam === "mir-target" ? "mir-target" : "mir-lncrna";

    if (searchParams.get("new") === "1") {
      reset();
      setWorkflow(wf);
      router.replace(`/run?workflow=${wf}`);
    } else {
      // Restore workflow from URL on page refresh (Zustand state is not persisted).
      setWorkflow(wf);
    }
  }, [reset, setWorkflow, router, searchParams]);

  return <Wizard />;
}
