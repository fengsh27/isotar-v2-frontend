import { NetworkPageClient } from "@/components/wizard-network/NetworkPageClient";

export const metadata = {
  title: "miR-Network Visualization — isoTar",
  description:
    "Run a list of miRNAs against both gene and lncRNA targets and visualize the gene ↔ miRNA ↔ lncRNA ceRNA network.",
};

export default function NetworkPage() {
  return <NetworkPageClient />;
}
