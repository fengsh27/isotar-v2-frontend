# isotar-v2-frontend

Web frontend for **isotar**, a bioinformatics tool for miRNA-centered target
prediction and downstream enrichment analysis. Built with Next.js (App Router),
HeroUI, Tailwind CSS, and Zustand.

The UI drives the isotar backend job API: users compose a job through a
wizard, submit it, and monitor the async run to completion. Every job produces
an immutable manifest that fully captures its provenance.

## Workflows

Three analysis workflows, reachable on two routes:

| Workflow | Route | What it does |
|---|---|---|
| miR-Target Prediction | `/run?workflow=mir-target` | Single-miRNA target prediction against the gene (3′ UTR) pool. Optional **Select Target** filter for specific gene labels / RefSeq IDs. |
| miR-LncRNA Prediction | `/run?workflow=mir-lncrna` | Single-miRNA target prediction against the lncRNA pool. Same **Select Target** filter, extended to Ensembl / FlyBase / WormBase IDs. |
| miR-Network Visualization | `/network` | One miRNA against both gene and lncRNA pools, scoring the ceRNA pairs you supply and rendering them as a tripartite Cytoscape network. Supports **variants** (shift and/or modification) so a job can compare WT against one or more variants of that miRNA in a single run. |

The two single-miRNA workflows share one wizard on `/run`, distinguished by
`?workflow=`, and follow a 6-step sequence
(`Species → miRNA → Operation → Tools → Configuration → Review`). Entering a
custom miRNA sequence instead of picking one from the catalog skips the
Operation step.

`mir-network` is a separate page with its own store and a 5-step sequence
(`Species → miRNA → ceRNA Pairs → Configuration → Review`). It replaces the
Operation step with `ceRNA Pairs` and hosts the variant editor inline with
miRNA selection. Two differences worth knowing:

- **At least one ceRNA pair is required.** Each line is
  `gene, lncRNA, corr(miRNA,gene), corr(miRNA,lncRNA), corr(gene,lncRNA)`; only
  the first two columns are mandatory and a blank correlation scores as 1.
  Gene and lncRNA IDs are checked against the backend's reference as you type.
- **Tools are not selectable.** Every tool available for the species runs, because
  the ceRNA score is computed out of the tools actually run — see
  [`CLAUDE.md`](./CLAUDE.md) §5 for the formula.

## Getting started

```bash
yarn dev
# or npm run dev / pnpm dev / bun dev
```

Open [http://localhost:3000](http://localhost:3000).

### Pointing at a backend

The browser only ever makes **relative** API requests; the Next.js rewrites in
`next.config.ts` proxy them server-side to `API_BASE`.

```bash
# .env.local — server-side only, never sent to the browser
API_BASE=http://127.0.0.1:5053
```

It defaults to `http://127.0.0.1:5001` when unset. Without a reachable backend
the UI still renders, but job submission and miRNA validation fail.

`NEXT_PUBLIC_API_BASE` is a separate, normally-unset variable that makes the
browser call the API **directly**, bypassing the proxy — only useful for a
deployment where the API lives on another origin. Note that over HTTPS a
cross-origin HTTP backend will have its images and downloads blocked as mixed
content, which is why the dotplot and result-zip URLs are always built
same-origin regardless of this setting.

Two endpoints are excluded from the proxy and served by local Route Handlers
under `app/api/v1/jobs/[jobId]/`, because the rewrite proxy caps upstream
requests at 30 s: `…/enrichment` and `…/result/download`.

## Project structure

```
app/
  run/             single-miRNA wizard (workflow selected via ?workflow=)
  network/         mir-network wizard
  jobs/            job list (tracked per-browser in localStorage)
  jobs/[jobId]/    job status & results (including the network graph)
  docs/, about/    static pages
  api/v1/…         local Route Handlers for the two long-running endpoints
components/
  wizard/          shared single-miRNA wizard steps
  wizard-network/  mir-network wizard steps (including NetworkVariantsSection)
  job/             job-detail views (NetworkGraph, tables, Venn/UpSet, VerificationPanel, …)
stores/
  wizardStore.ts        single-miRNA wizard state (mir-target, mir-lncrna)
  networkWizardStore.ts mir-network wizard state (incl. per-miRNA variants)
lib/                    shared domain helpers, API client, types
                        (verification.ts: literature-verification helpers)
data/                   per-species miRNA catalogs, code-split by species
```

Wizard state is ephemeral — a page refresh resets wizard progress. Each store's
`toJobPayload()` is the single gate before submission.

See [`CLAUDE.md`](./CLAUDE.md) for the canonical model of the codebase
(workflows, job manifest, source-of-truth hierarchy, UX rules) that AI
assistants must follow when editing this repo, and [`TODO.md`](./TODO.md) for
analysed-but-unfixed issues — notably that the two single-miRNA workflows
currently share one wizard draft.

## Learn more

- [Next.js Documentation](https://nextjs.org/docs)
- [HeroUI](https://heroui.com/)
- [Cytoscape.js](https://js.cytoscape.org/) — powers the network graph
