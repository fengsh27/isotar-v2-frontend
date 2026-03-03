"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Wizard } from "@/components/wizard/Wizard";
import { useWizardStore } from "@/stores/wizardStore";

export function RunPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reset = useWizardStore((state) => state.reset);

  useEffect(() => {
    if (searchParams.get("new") !== "1") {
      return;
    }

    reset();
    router.replace("/run");
  }, [reset, router, searchParams]);

  return <Wizard />;
}
