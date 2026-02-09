## 1. Project Overview

**isotar** is a web-based bioinformatics tool for **miRNA-centered target prediction and downstream enrichment analysis**.

### Core workflow
```

miRNA → operation → prediction tools → species → configuration → job → results

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
- Single miRNA per job (v1)
- Example: `hsa-miR-495-3p`
- Validated against authoritative sources (e.g., miRBase)
- Species-specific interpretation

### 4.2 Operation
Operations describe **what is done to the miRNA**, conceptually.

Allowed values:
- `shift`
- `modification`

Operations are:
- Required
- Mutually exclusive
- Chosen **before** tools

⚠️ Do not treat operations as optional flags.

---

### 4.3 Prediction Tools
- Examples: `targetscan`, `mirdb`, `mirwalk`
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
    - name: targetscan
      version: "8.0"
species:
  taxonomy_id: 9606
configuration:
  cores: 8
software:
  isotar_version: "0.1.0"
````

LLM agents must **never fabricate** manifest fields.

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

* Stored in **Zustand**
* Not persisted beyond job creation
* Canonical fields:

  * `mirnaId`
  * `operation`
  * `tools`
  * `species`
  * `config`

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

