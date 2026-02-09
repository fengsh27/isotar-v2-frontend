"use client";

import { useRouter } from "next/navigation";
import { Button, Card, CardBody, CardHeader } from "@heroui/react";

export default function Home() {
  const router = useRouter();

  return (
    <div className="space-y-8 pb-8 fade-rise">
      <section className="surface-panel-strong rounded-3xl px-6 py-16 text-center md:px-12">
        <h1 className="mx-auto max-w-4xl text-4xl font-semibold leading-tight text-zinc-900 md:text-5xl">
          Consensus target prediction and enrichment analysis
          <br />
          for miRNA variants
        </h1>

        <p className="mx-auto mt-5 max-w-3xl text-lg text-zinc-700">
          isoTar is a high-performance web application for analyzing microRNAs harboring RNA
          editing sites and isomiRs through multi-tool consensus prediction and downstream
          functional enrichment.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-zinc-700">
          <span className="rounded-full border border-zinc-200 bg-white/80 px-3 py-1">
            A-to-I RNA editing (ADAR-mediated)
          </span>
          <span className="rounded-full border border-zinc-200 bg-white/80 px-3 py-1">
            5&apos; / 3&apos; isomiR sequence shifts
          </span>
          <span className="rounded-full border border-zinc-200 bg-white/80 px-3 py-1">
            Seed-region-aware targetome changes
          </span>
        </div>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button
            onPress={() => router.push("/run")}
            className="h-11 rounded-xl bg-teal-700 px-5 font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-1 hover:bg-teal-800 hover:shadow-xl hover:shadow-teal-900/20 active:scale-[0.98]"
          >
            Run isoTar analysis
          </Button>
          <Button
            onPress={() => router.push("/docs")}
            className="h-11 rounded-xl border border-teal-700 bg-white/90 px-5 font-semibold text-teal-800 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:bg-teal-50 hover:shadow-lg hover:shadow-teal-900/10 active:scale-[0.98]"
          >
            Read documentation
          </Button>
          <Button
            onPress={() =>
              window.open("https://pubmed.ncbi.nlm.nih.gov/30874918/", "_blank", "noopener,noreferrer")
            }
            className="h-11 rounded-xl border border-zinc-300 bg-white/90 px-5 font-semibold text-zinc-800 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:bg-zinc-50 active:scale-[0.98]"
          >
            View paper
          </Button>
        </div>
      </section>

      <section className="surface-panel rounded-2xl px-6 py-10 md:px-10">
        <h2 className="text-2xl font-semibold text-zinc-900">Why isoTar?</h2>
        <p className="mt-4 text-zinc-700">
          High-throughput sequencing has revealed a complex miRNAome shaped by RNA editing and
          isomiRs. Modifications occurring within miRNA seed regions can dramatically alter target
          recognition, giving rise to novel miRNA-gene interactions.
        </p>
        <p className="mt-3 text-zinc-700">
          isoTar was developed to explicitly model these miRNA sequence variations and assess their
          functional impact through consensus target prediction and enrichment analysis.
        </p>
      </section>

      <section className="surface-panel rounded-2xl px-6 py-10 md:px-10">
        <h2 className="text-center text-2xl font-semibold text-zinc-900">What isoTar does</h2>

        <div className="mx-auto mt-8 grid max-w-5xl gap-6 md:grid-cols-2">
          <Card className="surface-panel rounded-2xl border-0">
            <CardHeader>
              <h3 className="text-lg font-semibold text-zinc-900">Consensus target prediction</h3>
            </CardHeader>
            <CardBody className="space-y-2 text-sm text-zinc-700">
              <p>
                Integrates multiple state-of-the-art miRNA target prediction tools and identifies
                candidates supported by minimum cross-tool consensus.
              </p>
              <p>Seed-region-aware filtering preserves biologically meaningful 7-8 nt matches.</p>
            </CardBody>
          </Card>

          <Card className="surface-panel rounded-2xl border-0">
            <CardHeader>
              <h3 className="text-lg font-semibold text-zinc-900">
                Functional enrichment analysis
              </h3>
            </CardHeader>
            <CardBody className="space-y-2 text-sm text-zinc-700">
              <p>
                Predicted targets are enriched using Gene Ontology categories and pathway resources
                including KEGG and Reactome.
              </p>
              <p>Supports wild-type versus variant interpretation of downstream biology.</p>
            </CardBody>
          </Card>
        </div>
      </section>

      <section className="surface-panel rounded-2xl px-6 py-10 md:px-10">
        <h2 className="text-center text-2xl font-semibold text-zinc-900">isoTar workflow</h2>
        <div className="mt-7 flex flex-wrap justify-center gap-3 text-sm">
          {[
            "miRNA and variants",
            "Consensus prediction",
            "Target aggregation",
            "Functional enrichment",
            "Download results",
          ].map((step) => (
            <span
              key={step}
              className="rounded-full border border-zinc-200 bg-white/85 px-4 py-2 text-zinc-700"
            >
              {step}
            </span>
          ))}
        </div>
      </section>

      <section className="surface-panel rounded-2xl px-6 py-10 md:px-10">
        <h2 className="text-center text-2xl font-semibold text-zinc-900">Key features</h2>
        <div className="mx-auto mt-8 grid max-w-5xl gap-4 md:grid-cols-2">
          {[
            "Explicit modeling of miRNA editing and isomiRs",
            "Multi-tool consensus target prediction",
            "Integrated functional enrichment analysis",
            "High-performance multi-core execution",
            "Containerized and reproducible",
            "Downloadable and restorable results",
          ].map((feature) => (
            <div
              key={feature}
              className="rounded-xl border border-zinc-200 bg-white/85 px-4 py-3 text-sm text-zinc-700"
            >
              {feature}
            </div>
          ))}
        </div>
      </section>

      {/* <section className="surface-panel rounded-2xl px-6 py-10 text-center md:px-10">
        <p className="text-sm text-zinc-600">Please cite:</p>
        <p className="mx-auto mt-2 max-w-3xl text-sm text-zinc-800">
          Distefano R. et al. <em>isoTar: Consensus Target Prediction with Enrichment Analysis for
          MicroRNAs Harboring Editing Sites and Other Variations</em>, Methods in Molecular Biology,
          2019.
        </p>
        <div className="mt-6">
          <Button
            onPress={() => router.push("/docs/citation")}
            className="rounded-xl border border-zinc-300 bg-white/90 px-5 font-semibold text-zinc-800"
          >
            Citation details
          </Button>
        </div>
      </section> */}

      <section className="pt-2 text-center">
        <Button
          onPress={() => router.push("/run")}
          className="h-11 rounded-xl bg-teal-700 px-6 font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-1 hover:bg-teal-800 hover:shadow-xl hover:shadow-teal-900/20 active:scale-[0.98]"
        >
          Start isoTar analysis
        </Button>
      </section>
    </div>
  );
}
