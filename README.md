# isotar-v2-frontend

Web frontend for **isotar**, a bioinformatics tool for miRNA-centered target
prediction and downstream enrichment analysis. Built with Next.js (App Router),
HeroUI, Tailwind CSS, and Zustand.

The UI drives the isotar backend job API: users compose a job through a
wizard, submit it, and monitor the async run to completion. Every job produces
an immutable manifest that fully captures its provenance.

## Workflows

Three analysis workflows are selectable at wizard start:

| Workflow | Key ID | What it does |
|---|---|---|
| miR-Target Prediction | `mir-target` | Single-miRNA target prediction against the gene (3′ UTR) pool. Optional **Select Target** filter for specific gene labels / RefSeq IDs. |
| miR-LncRNA Prediction | `mir-lncrna` | Single-miRNA target prediction against the lncRNA pool. Same **Select Target** filter, extended to Ensembl / FlyBase / WormBase IDs. |
| miR-Network Visualization | `mir-network` | Multi-miRNA prediction (up to 20) against both gene and lncRNA pools, rendered as a tripartite Cytoscape network. Supports per-miRNA **variants** (shift and/or modification) so a job can compare WT against one or more variants of the same miRNA in a single run. |

The single-miRNA workflows share a 6-step sequence
(`Species → miRNA → Operation → Tools → Configuration → Review`); `mir-network`
replaces the Operation step with a `ceRNA Pairs` step and hosts the variant
editor inline with miRNA selection.

## Getting started

```bash
yarn dev
# or npm run dev / pnpm dev / bun dev
```

Open [http://localhost:3000](http://localhost:3000).

The dev server hits whatever backend `NEXT_PUBLIC_API_BASE_URL` (see
`.env.local`) points at; without it, the UI still renders but job submissions
fail.

## Project structure

```
app/
  run/             analysis wizard (workflow selected via ?workflow=)
  jobs/            job list
  jobs/[id]/       job status & results (including the network graph)
components/
  wizard/          shared single-miRNA wizard steps
  wizard-network/  mir-network wizard steps (including NetworkVariantsSection)
  job/             job-detail views (NetworkGraph, tables, …)
stores/
  wizardStore.ts        single-miRNA wizard state (mir-target, mir-lncrna)
  networkWizardStore.ts mir-network wizard state (incl. per-miRNA variants)
lib/                    shared domain helpers, API client, types
```

See [`CLAUDE.md`](./CLAUDE.md) for the canonical model of the codebase
(workflows, job manifest, source-of-truth hierarchy, UX rules) that AI
assistants must follow when editing this repo.

## Learn more

- [Next.js Documentation](https://nextjs.org/docs)
- [HeroUI](https://heroui.com/)
- [Cytoscape.js](https://js.cytoscape.org/) — powers the network graph
