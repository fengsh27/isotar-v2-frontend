## 1. Project Overview

**isotar** is a web-based bioinformatics tool for **miRNA-centered target prediction and downstream enrichment analysis**.

### Workflows

Three analysis workflows are supported, selected at wizard start:

| Workflow | Key ID | Steps |
|---|---|---|
| miR-Target Prediction | `mir-target` | Species → miRNA → Operation → Tools → Configuration → Review |
| miR-LncRNA Prediction | `mir-lncrna` | Species → miRNA → Operation → Tools → Configuration → Review |
| miR-Network Visualization | `mir-network` | Species → miRNAs → ceRNA Pairs → Tools → Configuration → Review |

Workflow-specific details:

- **`mir-target` / `mir-lncrna`** share a 6-step single-miRNA sequence. The Configuration step exposes an optional **Select Target** card for filtering predictions to specific gene labels / RefSeq IDs (`mir-target`) or Ensembl / FlyBase / WormBase IDs (`mir-lncrna`).
- **`mir-network`** runs up to `MAX_NETWORK_MIRNAS` miRNAs (currently 20) against both the gene and lncRNA target pools and renders the result as a tripartite Cytoscape graph. Its **Select miRNAs** step also hosts a per-miRNA **Variants** editor: users add any number of variants (shift and/or per-position modifications) per selected miRNA to compare the WT prediction against its variants in a single job. The `mir-network` wizard has no dedicated Operation step — variant operations live inline with miRNA selection.

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
- **Next.js (App Router)**
- **HeroUI** (component library)
- **Tailwind CSS**
- **Zustand** (wizard state management)

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
- Single miRNA per job for `mir-target` / `mir-lncrna`; up to `MAX_NETWORK_MIRNAS` per job for `mir-network`
- Example: `hsa-miR-495-3p`
- Validated against authoritative sources (e.g., miRBase)
- Species-specific interpretation

### 4.2 Operation
Operations describe **what is done to the miRNA**, conceptually.

Allowed values:
- `shift`
- `modification`

Operations are:
- Optional
- Chosen **before** tools (single-miRNA workflows)
- In `mir-network`, operations attach to **variants**, not the miRNA itself. Each selected miRNA may carry any number of variant specs (`{shift?, modifications?}`); the WT prediction is always included implicitly. A single job can compare WT against multiple variants of the same miRNA.

---

### 4.3 Prediction Tools
- Examples: `Targetscan`, `miRmap`, `miRanda`, `DMISO`, `PITA`, `RNAhybrid`
- Multiple tools MAY be selected
- Tool scores are preserved verbatim
- Aggregation happens **after prediction**

---

### 4.4 Species
- Mandatory
- Determines biological scope
- Changing species invalidates predictions

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
| `mirna_id` | string | validated miRNA ID (not custom seq) |
| `mirna_seq` | string | custom sequence mode |
| `modifications` | string[] | when modification operation is set |
| `shift` | string | when shift operation is set |
| `pre_id` | string | when a specific precursor is chosen |
| `targets` | string[] | when target IDs are specified (both `mir-target` and `mir-lncrna`) |

Network workflow (`mir-network`):

| Field | Type | When included |
|---|---|---|
| `mirna_ids` | string[] | always (1..`MAX_NETWORK_MIRNAS`) |
| `pre_ids` | Record<mirnaId, preId> | when any selected miRNA has an explicit precursor choice |
| `pairs` | `{gene, lncrna, score}[]` | when ceRNA pairs mode is used (else discovery mode); `score` is required per pair (finite number, not bool) and is forwarded verbatim to the backend — the frontend does not consume it yet |
| `variants` | Record<mirnaId, NetworkVariantSpec[]> | when ≥1 selected miRNA has ≥1 non-empty variant editor |

Where `NetworkVariantSpec = { shift?: string; modifications?: string[] }` — a variant with neither field is silently dropped; a variant with typed-but-invalid content blocks submission.

---

## 6. Frontend Architecture (Next.js)

### App Router structure

```
app/
  run/        → analysis wizard
  jobs/       → job list
  jobs/[id]/  → job status & results
```

### Wizard state

Wizard state is held in **Zustand**, split by workflow family. Both stores are ephemeral — state is not persisted beyond job creation (page refresh resets wizard progress).

**`stores/wizardStore.ts`** — single-miRNA workflows (`mir-target`, `mir-lncrna`).

* `workflow` is synced from the URL param `?workflow=` on every mount — do not rely on Zustand alone for workflow identity
* Canonical fields:
  * `workflow` — `"mir-target"` | `"mir-lncrna"`
  * `mirnaId`
  * `operation`
  * `tools`
  * `species`
  * `config`
  * `targetGeneIds` — free-text string; newline- or comma-separated gene labels (e.g. `TP53`) or RefSeq IDs (e.g. `NM_000546`) for `mir-target`, or Ensembl / FlyBase / WormBase IDs for `mir-lncrna`

**`stores/networkWizardStore.ts`** — `mir-network` workflow.

* Canonical fields:
  * `species`, `humanReference`
  * `selectedMirnas: string[]`
  * `preIds: Record<mirnaId, preId>` — only populated for miRNAs mapping to >1 precursor
  * `variants: Record<mirnaId, NetworkVariantEditor[]>` — sparse; WT is implicit and never appears here. Each editor holds `{ key, shiftLeft, shiftRight, rows }`; `toJobPayload` serializes it to the backend's `NetworkVariantSpec[]` via `evaluateOperationState` (the shared validator used by the single-miRNA Operation step).
  * `pairsText`, `tools`, `cores`
* Deselecting a miRNA prunes both its `preIds` entry and its `variants` entry, so submission never carries orphan data.

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

