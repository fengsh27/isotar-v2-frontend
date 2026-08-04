"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { NetworkWizard } from "@/components/wizard-network/NetworkWizard";
import { useNetworkWizardStore } from "@/stores/networkWizardStore";

export function NetworkPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reset = useNetworkWizardStore((state) => state.reset);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      reset();
      router.replace("/network");
    }
  }, [reset, router, searchParams]);

  return <NetworkWizard />;
}
