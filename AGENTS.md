# AGENTS.md

**The canonical model of this codebase lives in [`CLAUDE.md`](./CLAUDE.md).
Read it before editing anything here.**

This file used to carry its own copy of that model and fell out of date (it
still described a single-workflow, single-miRNA-per-job app). Rather than keep
two copies in sync, it is now a pointer. Put project rules in `CLAUDE.md`.

## Orientation (30 seconds)

**isotar** is a Next.js (App Router) frontend for a miRNA target-prediction
backend. Users compose a job through a wizard, submit it, and watch the async
run to completion.

Three workflows, on two routes:

| Workflow | Key ID | Route |
|---|---|---|
| miR-Target Prediction | `mir-target` | `/run?workflow=mir-target` |
| miR-LncRNA Prediction | `mir-lncrna` | `/run?workflow=mir-lncrna` |
| miR-Network Visualization | `mir-network` | `/network` |

```
species → miRNA(s) → [operation | pairs + variants] → prediction tools → configuration → job → results
```

Where things live:

```
app/            routes (run/, network/, jobs/, jobs/[jobId]/, docs/, about/)
components/     wizard/ (single-miRNA), wizard-network/, job/ (results)
stores/         wizardStore.ts, networkWizardStore.ts  (Zustand, ephemeral)
lib/            api.ts, constants.ts, types.ts + domain helpers
data/           per-species miRNA catalogs (JSON)
```

## The six things that bite

1. **The UI is not the source of truth.** Order of authority: job manifest →
   backend API contract → wizard store → UI components. See `CLAUDE.md` §3.
2. **`toJobPayload()` is the single submission gate.** Both stores return `null`
   instead of a partial payload. New validation belongs there, not only in a
   step component — a user can jump back to Review and skip the step.
3. **Don't add a second state system** or a second parser. Operation, shift,
   target and pair parsing are shared in `lib/` precisely so the two wizards
   cannot drift from each other or from the backend.
4. **Tool availability is rule-driven.** TargetScan is species-restricted
   (`TARGETSCAN_SPECIES`, must match the backend's `TARGETSCAN_GENOMES` or the
   API 400s) and lncRNA-incompatible. Go through
   `isToolSupportedForSpecies` / `isToolSupportedForWorkflow`.
5. **`mir-network` is the odd one out.** Exactly one miRNA, no tool step (the
   set follows the species, because the ceRNA score divides by it), and at
   least one ceRNA pair is mandatory. On the result, `score` is the *computed*
   ceRNA score, not anything the user typed — their correlations come back
   under `corr`. `CLAUDE.md` §5 has the formula and the WT-vs-variant rule.
6. **`mir-target` and `mir-lncrna` share one store instance.** This is a known
   defect with four documented symptoms, up to "a `mir-lncrna` job can be
   submitted with RefSeq gene targets". `TODO.md` has the analysis and the
   recommended fix — read it before touching `setWorkflow`, `StepTools`'
   pruning effect, or `targetGeneIds`.

## Checks

No test suite. `yarn lint` and `yarn build` are the automated checks.
Never fabricate manifest or payload fields.
