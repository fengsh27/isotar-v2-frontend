## 1. Project Overview

**isotar** is a web-based bioinformatics tool for **miRNA-centered target prediction and downstream enrichment analysis**.

### Workflows

Three analysis workflows are supported. They do **not** all live behind one
wizard entry point:

| Workflow | Key ID | Route | Steps |
|---|---|---|---|
| miR-Target Prediction | `mir-target` | `/run?workflow=mir-target` | Species → miRNA → Operation → Tools → Configuration → Review |
| miR-LncRNA Prediction | `mir-lncrna` | `/run?workflow=mir-lncrna` | Species → miRNA → Operation → Tools → Configuration → Review |
| miR-Network Visualization | `mir-network` | `/network` | Species → miRNA → ceRNA Pairs → Configuration → Review |

`?workflow=` only distinguishes the two single-miRNA workflows, and
`RunPageClient` resolves anything that is not `mir-target` to `mir-lncrna`.
`mir-network` is a separate route with its own store and its own step
components (`components/wizard-network/`); it is never reachable from `/run`.

Workflow-specific details:

- **`mir-target` / `mir-lncrna`** share a 6-step single-miRNA sequence. The Configuration step exposes an optional **Select Target** card for filtering predictions to specific gene labels / RefSeq IDs (`mir-target`) or Ensembl / FlyBase / WormBase IDs (`mir-lncrna`).
- The **miRNA step** of both offers two input modes: pick a catalog miRNA for the chosen species, or enter a **custom sequence** (`useCustomMirnaSeq`). Custom mode requires both a name and a mature sequence of 17–30 nt, and the wizard **skips the Operation step** entirely (`next()`/`back()` jump by 2 between miRNA and Tools) — there is no precursor to shift or modify against.
- **`mir-network`** runs **exactly one** miRNA (`MAX_NETWORK_MIRNAS` = 1) against both the gene and lncRNA target pools, scores the supplied ceRNA pairs, and renders the result as a tripartite Cytoscape graph. One miRNA, not several, because each pair carries `corr(miRNA, gene)` and `corr(miRNA, lncRNA)` — a second miRNA would make every pasted correlation ambiguous. This is far stricter than the backend's `ISOTAR_MAX_NETWORK_MIRNAS` (default 20), which still rejects anything above its own limit. Its **Select miRNA** step hosts the **Variants** editor: any number of variants (shift and/or per-position modifications) of that one miRNA, compared against the WT prediction in a single job. There is no dedicated Operation step — variant operations live inline with miRNA selection.
- **`mir-network` has no Tools step.** It always runs every tool available for the species: all six on the gene pool, five on the lncRNA pool (TargetScan is excluded there), minus TargetScan entirely on the five species with no TargetScan release. The set is fixed because the ceRNA score divides by the tools actually run — a user-varied tool list would make scores incomparable between jobs. Use `networkToolsForSpecies` / `networkToolTotals` (`lib/constants.ts`), which mirror the backend's `_network_tool_totals`.
- **`mir-network` requires at least one ceRNA pair.** Discovery mode (an empty pairs box) is no longer offered: it ranks candidate targets by how many distinct miRNAs hit them, which carries no signal when a job has exactly one miRNA — every target ties at degree 1. The backend still implements discovery for other API clients; the wizard just never reaches it.

### Core workflow
```
species → miRNA(s) → [operation | pairs + variants] → prediction tools → configuration → job → results
```

### Key characteristics
- miRNA is the **primary biological entity**
- Operations (e.g., *shift*, *modification*) are **semantic transformations**, not parameters
- Jobs are **asynchronous, reproducible, and shareable**
- Each job produces a **manifest** that fully captures provenance

---

## 2. Technology Stack

### Frontend
- **Next.js 16 (App Router)** + **React 19**
- **HeroUI** (component library)
- **Tailwind CSS 4**
- **Zustand 5** (wizard state management)
- **Cytoscape.js** + `cytoscape-klay` (the `mir-network` graph)

There is no test suite. `yarn lint` (ESLint) and `yarn build` are the only
automated checks. Releases go through `standard-version` (`yarn release`),
which bumps `package.json` and writes `CHANGELOG.md` from conventional-commit
messages — so commit messages matter. `NEXT_PUBLIC_APP_VERSION` is injected
from `package.json` at build time and surfaced in the UI. The frontend image
tag in `docker-compose.yml` is maintained by hand and currently lags the
package version.

### Backend (assumed / external)
- RESTful API
- Async job execution (HPC / cluster-friendly)
- Job-scoped result storage

### Canonical communication pattern
```

Frontend (stateless) → API → Job → Results

````

---

## 3. Source of Truth Hierarchy

LLM agents MUST respect the following hierarchy:

1. **Job Manifest** (YAML / JSON)
2. Backend API contracts
3. Frontend state (wizard store)
4. UI components

⚠️ The UI is **not** the source of truth — it only reflects job state.

---

## 4. Core Domain Concepts (Do NOT redefine)

### 4.1 miRNA
- Single miRNA per job for every workflow — `MAX_NETWORK_MIRNAS` is **1**, so `mir-network` differs only in running both target pools and scoring pairs
- Example: `hsa-miR-495-3p`
- Validated against authoritative sources (e.g., miRBase)
- The per-species catalog is bundled client-side as `data/<genome>_mature_pre_mirna_ext.json` (human uses the unprefixed file) and loaded through `lib/mirnaData.ts`. Location fields are inconsistently typed across species files, so every record goes through `normalizeRecord`; precursor sequence resolution falls back `ext_pre_seq → pre_seq → mature_seq`
- A custom mature sequence (17–30 nt, named by the user) may be supplied instead of a catalog ID; it is submitted as `mirna_seq` with the name in `mirna_id`
- Species-specific interpretation

### 4.2 Operation
Operations describe **what is done to the miRNA**, conceptually.

Allowed values:
- `shift`
- `modification`

Operations are:
- Optional
- Chosen **before** tools (single-miRNA workflows)
- In `mir-network`, operations attach to **variants**, not the miRNA itself. The selected miRNA may carry any number of variant specs (`{shift?, modifications?}`); the WT prediction is always included implicitly. A single job compares WT against multiple variants of that miRNA — with one miRNA per job, variants are the module's comparison axis.

---

### 4.3 Prediction Tools
- The full set is `TOOL_OPTIONS`: `miRanda`, `miRmap`, `Targetscan`, `RNAhybrid`, `PITA`, `DMISO`
- Multiple tools MAY be selected — in `mir-target` / `mir-lncrna`. `mir-network`
  has no tool choice at all (see §1); its set is derived from the species
- Tool scores are preserved verbatim
- Aggregation happens **after prediction**

TargetScan is the one tool with availability constraints, because it ignores the
target FASTA and scores against its own precomputed 3′ UTR alignments:

- **By species** — `TARGETSCAN_SPECIES` (`lib/constants.ts`) allows only
  `9606`, `10090`, `7227`, `7955`, `6239`. It must stay in sync with the
  backend's `TARGETSCAN_GENOMES` (`app_v1/parse_result.py`), which rejects a
  mismatch with HTTP 400. Rat, macaque, chimpanzee, opossum and dog have no
  TargetScan release at all.
- **By workflow** — TargetScan is in `LNCRNA_INCOMPATIBLE_TOOLS`, so it is
  unavailable for `mir-lncrna` and runs on the gene pool only in `mir-network`.
  PITA *is* lncRNA-compatible: it scores whatever FASTA reaches its `-utr` flag.

Gate tool availability through `isToolSupportedForSpecies` /
`isToolSupportedForWorkflow` rather than re-deriving these rules.

⚠️ `StepTools` currently prunes unsupported tools *from the store* in a
`useEffect`. That is a known violation of §7.3 ("no silent defaults") — see
`TODO.md`, symptom 3.

---

### 4.4 Species
- Mandatory
- Determines biological scope
- Changing species invalidates predictions
- `SPECIES_OPTIONS` holds the 10 supported taxa. Every species but human carries
  a fixed `genome` code; human (`9606`) has `genome: null` and requires the user
  to choose `hg19` / `hg38` (`humanReference`), which becomes the `genome` field
- Downstream enrichment is offered only where the genome maps to an Enrichr
  organism — `enrichmentOrganismForGenome` returns Human / Mouse / Rat and
  `null` for everything else, which hides the feature

---

### 4.5 Job
A job is:
- Immutable once started
- Identified by `job_id`
- Fully described by its manifest
- Executed asynchronously

---

## 5. Job Manifest (Critical Artifact)

Every job MUST have a manifest.

### Required properties
- miRNA
- operation
- tools (with versions)
- species
- configuration
- software version

### Example (simplified)
```yaml
job_id: isotar-2026-00123
input:
  mirna:
    id: hsa-miR-495-3p
operation:
  type: shift
prediction:
  tools:
    - name: Targetscan
      version: "8.0"
species:
  taxonomy_id: 9606
configuration:
  cores: 8
software:
  isotar_version: "0.1.0"
````

LLM agents must **never fabricate** manifest fields.

### Job payload fields (`POST /api/v1/jobs`)

Shared fields:

| Field | Type | When included |
|---|---|---|
| `workflow` | string | always |
| `tools` | string[] | always |
| `genome` | string | when species has a fixed genome code (or human ref chosen) |
| `cores` | number | always |

Single-miRNA workflows (`mir-target`, `mir-lncrna`):

| Field | Type | When included |
|---|---|---|
| `mirna_id` | string | always — the validated miRNA ID, or, in custom-sequence mode, the user-supplied name |
| `mirna_seq` | string | custom sequence mode (whitespace stripped, uppercased) |
| `modifications` | string[] | when modification operation is set |
| `shift` | string | when shift operation is set |
| `pre_id` | string | when a specific precursor is chosen (never in custom-sequence mode) |
| `targets` | string[] | when target IDs are specified (both `mir-target` and `mir-lncrna`) |

Network workflow (`mir-network`):

| Field | Type | When included |
|---|---|---|
| `mirna_ids` | string[] | always (1..`MAX_NETWORK_MIRNAS`) |
| `pre_ids` | Record<mirnaId, preId> | when any selected miRNA has an explicit precursor choice |
| `pairs` | `{gene, lncrna, corr?}[]` | **always** — 1..`MAX_NETWORK_PAIRS` (100). `corr` holds `mirna_gene`, `mirna_lncrna`, `gene_lncrna`, each optional and each a magnitude `0 ≤ x ≤ 1`. A blank column is **omitted from the payload**, not sent as 1, so the backend can record it in `corr_defaulted` and the result can tell an assumed correlation from a measured one |
| `restrict_to_pairs` | boolean | always `true`, since pairs are always present |
| `variants` | Record<mirnaId, NetworkVariantSpec[]> | when ≥1 selected miRNA has ≥1 non-empty variant editor |

Where `NetworkVariantSpec = { shift?: string; modifications?: string[] }` — a variant with neither field is silently dropped; a variant with typed-but-invalid content blocks submission.

`restrict_to_pairs` is not a user-facing option. A pairs run only ever displays
the pair bridges, so scanning the full reference computes ~120k interactions to
keep ~40. The trade-off is that `/result` and the result zip carry only the
pair targets, not the genome-wide table — since pairs are now mandatory, this
is true of **every** network job, so never describe a network job's download as
genome-wide.

### ceRNA pair score

`GET /api/v1/jobs/<id>/network` returns a computed score per pair:

```
score = corr(miRNA,gene) × corr(miRNA,lncRNA) × corr(gene,lncRNA)
        × sqrt((gene_tools / tool_totals.gene) × (lncrna_tools / tool_totals.lncrna))
```

Four rules the UI must not restate differently:

- ⚠️ **`score` on the response is the computed score, not the user's input.** The
  correlations the user pasted come back under `corr`, with `corr_defaulted`
  naming the blanks. The field previously carried the user's own number; that
  meaning is gone.
- **Scores are per bridging miRNA node** (`bridges[]`), because tool counts live
  on edges and each variant is its own node.
- **A pair's headline `score` is the WT node's**, and `null` when WT does not
  bridge the pair. A pair-level score is a claim about the real miRNA, so an
  in-silico variant never sets it; `best_bridge` names the top node either way.
- **Correlations are inherited unchanged by variants**, so within one pair
  `corr_product` is constant and WT-vs-variant differences come entirely from
  `consensus`.

---

## 6. Frontend Architecture (Next.js)

### App Router structure

```
app/
  run/            → single-miRNA wizard (mir-target / mir-lncrna, via ?workflow=)
  network/        → mir-network wizard
  jobs/           → job list
  jobs/[jobId]/   → job status & results (incl. the network graph)
  docs/, about/   → static pages
  api/v1/jobs/[jobId]/enrichment/        → local Route Handler
  api/v1/jobs/[jobId]/result/download/   → local Route Handler
components/
  wizard/         → shared single-miRNA steps
  wizard-network/ → mir-network steps (incl. NetworkVariantsSection)
  job/            → job-detail views (NetworkGraph, VerificationPanel, tables, Venn/UpSet, …)
lib/              → API client, domain helpers, constants, types (verification.ts: literature helpers)
stores/           → the two Zustand wizard stores
data/             → per-species miRNA catalogs (JSON)
```

### Backend access

All calls go through `lib/api.ts` using **relative** paths. The `rewrites()` in
`next.config.ts` proxy them server-side to `API_BASE` (server-only, defaults to
`http://127.0.0.1:5001`; `.env.local` currently points at port `5053`).

* `NEXT_PUBLIC_API_BASE` exists only to **bypass** that proxy for a deployment
  where the API lives on another origin. It is normally unset.
* Two paths are deliberately excluded from the rewrite and handled by local
  Route Handlers instead, because the rewrite proxy caps upstream at 30 s:
  `/api/v1/jobs/<id>/enrichment` and `/api/v1/jobs/<id>/result/download`.
  Subpaths (e.g. `…/enrichment/dotplot`) still rewrite through. The negative
  lookaheads in the rewrite `source` regex implement this — in Next.js,
  `afterFiles` rewrites run *before* dynamic routes, so a plain
  `/api/v1/:path*` would always preempt the handlers.
* Image and download URLs are always built same-origin, never with
  `NEXT_PUBLIC_API_BASE`: browsers block mixed-content image loads and
  downloads on an HTTPS page served by an HTTP backend.

### Wizard state

Wizard state is held in **Zustand**, split by workflow family. Both stores are ephemeral — state is not persisted beyond job creation (page refresh resets wizard progress).

**`stores/wizardStore.ts`** — single-miRNA workflows (`mir-target`, `mir-lncrna`).

* `workflow` is synced from the URL param `?workflow=` on every mount — do not rely on Zustand alone for workflow identity
* Canonical fields:
  * `step`, `workflow` — `"mir-target"` | `"mir-lncrna"`
  * `species`, `humanReference` — `humanReference` (`hg19` | `hg38`) is required only for `9606`
  * `mirnaId`, `preId`
  * `useCustomMirnaSeq`, `customMirnaSeq`, `customMirnaName` — custom-sequence mode; when on, `preId` is not submitted and the Operation step is skipped
  * `operationSubstep` (`"shift" | "modification"`), `modifications: ModificationInput[]`, `shiftLeft`, `shiftRight` — the raw operation editor state. There is **no** single `operation` field; the operation type is derived by `evaluateOperationState` (`lib/operation.ts`)
  * `tools`
  * `targetGeneIds` — free-text string; newline- or comma-separated gene labels (e.g. `TP53`) or RefSeq IDs (e.g. `NM_000546`) for `mir-target`, or Ensembl / FlyBase / WormBase IDs for `mir-lncrna`
  * `config` — `{ cores, maxRuntime, outputFormat }`
* ⚠️ There is exactly **one** store instance for both single-miRNA workflows, so
  switching workflows carries state across and can clobber it. This is a known
  defect with a recorded analysis and recommendation — read `TODO.md` before
  touching `setWorkflow`, `StepTools`' pruning effect, or `targetGeneIds`.

**`stores/networkWizardStore.ts`** — `mir-network` workflow.

* Canonical fields:
  * `species`, `humanReference`
  * `selectedMirnas: string[]`
  * `preIds: Record<mirnaId, preId>` — only populated for miRNAs mapping to >1 precursor
  * `variants: Record<mirnaId, NetworkVariantEditor[]>` — sparse; WT is implicit and never appears here. Each editor holds `{ key, shiftLeft, shiftRight, rows }`; `toJobPayload` serializes it to the backend's `NetworkVariantSpec[]` via `evaluateOperationState` (the shared validator used by the single-miRNA Operation step).
  * `step`, `pairsText`, `cores` — there is **no** `tools` field; the tool set is
    derived from `species` in `toJobPayload` via `networkToolsForSpecies`
  * `invalidPairTargets` — gene / lncRNA IDs that `/api/v1/targets/validate`
    rejected, recorded by `StepPairs` so `toJobPayload` refuses them too. An
    unknown gene would 400 at submit anyway; an unknown lncRNA is *accepted* and
    then bridges nothing, so the pair vanishes from the result unexplained —
    which is the whole reason the step validates up front
* Deselecting a miRNA prunes both its `preIds` entry and its `variants` entry, so submission never carries orphan data.

Both stores expose `toJobPayload()`, which is the **single validation gate**
before `POST /api/v1/jobs`: it returns `null` rather than a partial payload
whenever the run is not submittable. Keep new validation there, not only in a
step component, so a user who jumps back to Review cannot bypass it.

Shared domain logic lives in `lib/` and is deliberately shared between the two
wizards so they cannot drift from each other or from the backend —
`operation.ts` (`evaluateOperationState`), `shift.ts` (`resolveShiftedMature`,
mirroring the backend's `apply_shift`), `targets.ts`, `pairs.ts`. Reuse these
rather than writing a second parser or validator.

⚠️ LLMs must not introduce parallel state systems.

---

## 7. UX Rules (Strict)

LLM-generated UI code MUST follow these rules:

1. **Progressive disclosure**

   * Advanced configuration is collapsed by default
2. **Explicit confirmation**

   * Review & Run step is mandatory
3. **No silent defaults**

   * Defaults must be visible or documented
4. **Biology-aware language**

   * Avoid generic terms like “input data” when “miRNA” is correct

---

## 8. Results Model (Read-Only)

Results are:

* Job-scoped
* Read-only
* Structured into:

  * Summary
  * Predicted targets
  * Enrichment

LLMs must not mutate or reinterpret results client-side.

### How the job page renders them

`JobStatus` polls `GET /api/v1/jobs/<id>` until a terminal status
(`succeeded` / `failed` / `killed`), then mounts `JobResults`. What it shows is
workflow-dependent:

* `mir-network` → `NetworkPanel` / `NetworkGraph` (Cytoscape + klay) only, no
  tabs. Filtering is by **ceRNA score**, not by edge tool count: the score
  already folds in tool agreement on both sides, so a separate consensus-k
  threshold would leave the graph disagreeing with the scores in the table.
  Below the pair table sits `VerificationPanel` (see *Literature verification*
  below)
* otherwise → a **Predicted Targets** tab (`PredictedGenesTable`, plus
  `VennDiagram` / `UpSetPlot` / `ConsensusHistogram` when the backend returns
  `venn`), and an **Enrichment** tab only when `enrichmentOrganismForGenome`
  resolves and the workflow is not `mir-lncrna` (lncRNA targets have no
  gene-symbol identity)

### Literature verification (mir-network only)

A succeeded network job can be checked against PubMed through the backend's
`/api/v1/jobs/<id>/verification` endpoints (`lib/api.ts`:
`getVerificationConfig`, `runVerification`, `getVerification`,
`getVerificationDownloadUrl`; types under *Literature verification* in
`lib/types.ts`; helpers in `lib/verification.ts`). `VerificationPanel` owns the
whole lifecycle — config discovery, the run dialog, polling every 3 s while
`queued`/`running`, the triplet table and the per-triplet detail modal — and
reports a succeeded result upward through `onResult`, which `NetworkPanel` uses
for the **Literature** column of the pair table and the highlighted bridges of
the graph. Rules:

* **Show only what the deployment can do.** `GET /api/v1/verification/config`
  says whether the feature is enabled (NCBI key present), whether model review
  is available (gateway configured), and which genomes and tissue presets are
  accepted. The run button is hidden when disabled or the job's genome is not
  listed; the model-review checkbox is disabled, with the reason, when no
  gateway exists. Never hard-code the tissue list — it comes from the config.
  In the compose deployment those secrets (`NCBI_API_KEY`, `NCBI_EMAIL`,
  `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`) reach the backend through the
  git-ignored `.env` next to `docker-compose.yml` (`env_file:`, optional;
  start from the tracked `.env.template`). Never read them in the frontend.
* **One triplet = one pair × one bridge miRNA**, keyed to the network by
  `gene_id` (RefSeq), `mirna_node` (miRNA node id, variants included) and
  `lncrna_id` (Ensembl transcript) — `pairKey` / `tripletKey` in
  `lib/verification.ts`. Row ids are the rank; the JSON carries them as numbers
  and the verdict rows as strings, so always compare through `tripletId()`.
  Other row fields are mixed the same way (`arms_supported`, `same_paper_hit`,
  scores, `bridge_is_variant`) — go through the helpers, not raw comparisons.
* **Tiers are disease context, not strength.** Arm tier 1 = both symbols with
  the tissue's cancer terms, 2 = with any cancer term, 3 = symbols alone,
  `none`, or `unsearchable` when the lncRNA has no HGNC symbol (its Ensembl id
  never appears in abstracts — unknown, never "unsupported"). `triplet_tier` is
  the worst arm when all three hit, else `partial`/`none`. Only `same_paper_hit`
  points at one record naming the whole axis, and only a model verdict of
  `reported_interaction` with its quoted sentence says the paper reports it.
  Keep the "How to read" box in the panel consistent with the backend README.
* **The graph highlights, it does not filter.** `supportedEdgeIds` marks the
  bridges with a same-paper record or a reported-interaction verdict; the score
  slider stays the only filter so the drawn graph still agrees with the table.
* Polling goes through the normal rewrite proxy (each call is quick); the
  TSV download is a same-origin link like the result zip.

Two result-rendering details that are easy to break:

* `progress.tools_status` may arrive as a per-poll snapshot covering only the
  active tool, so `lib/toolProgress.ts` **accumulates** it across polls to keep
  finished tools' timings. Per tool, `elapsed` is the real time costed;
  `started_at`/`finished_at` only bracket the work and span other tools' runs.
* Tracked job IDs live in `localStorage` (`lib/jobStorage.ts`, key
  `isotar.job_ids`) — the job list is per-browser, not server-side.

---

## 9. Error Handling Philosophy

Errors should be:

* Explicit
* Actionable
* Job-scoped

Examples:

* Invalid miRNA ID
* Tool incompatibility
* Job execution failure

⚠️ Never hide failures behind generic messages.

