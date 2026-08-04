# TODO

Known issues and deferred work. Each entry records the analysis so it can be
picked up without re-deriving it.

---

## miR-Target and miR-LncRNA share one wizard draft

**Status:** deferred (analysed, not fixed)
**Since:** 0.1.27 (`84fece0`, "keep wizard state and replay the animation on workflow switch")
**Scope:** `mir-target` / `mir-lncrna` only — `mir-network` has its own store and is unaffected.

### Root cause

There is exactly one Zustand store for both workflows (`stores/wizardStore.ts`).
`workflow` is just another field in it, not a partition key. Before `84fece0`
the two workflows *appeared* separate only because the nav links carried
`&new=1`, which made `RunPageClient` call `reset()` on every switch. Removing
`new=1` to preserve state did not create the sharing — it exposed it.

### Symptoms

1. **Shared inputs get clobbered.** Configure Species/miRNA/Operation in
   miR-Target, switch to miR-LncRNA and pick a different species — picking a
   species calls `setMirnaId("")` (`components/wizard/StepSpecies.tsx:37-38`),
   so the miR-Target miRNA is wiped. Switch back and you see the lncRNA values,
   silently, with no way to recover the originals.

2. **`targetGeneIds` carries an incompatible vocabulary.** One string field,
   two ID namespaces (`components/wizard/StepConfig.tsx:90-112`): gene labels /
   RefSeq (`TP53`, `NM_000546`) for `mir-target`, Ensembl / FlyBase / WormBase
   (`ENST…`, `ENSG…`) for `mir-lncrna`. Text typed under one workflow shows up
   under the other, fails `findMalformedTargets`, and disables Next
   (`StepConfig.tsx:123`, `:328`) on a step the user never touched.

3. **`tools` is pruned silently.** TargetScan is in `LNCRNA_INCOMPATIBLE_TOOLS`
   (`lib/constants.ts:177`). `StepTools` has a `useEffect` that deletes
   unsupported tools *from the store* (`StepTools.tsx:49-59`). Select TargetScan
   under miR-Target, switch to miR-LncRNA, let step 3 render — TargetScan is
   gone, and it stays gone when you switch back. Violates the "no silent
   defaults" rule (CLAUDE.md §7.3).

4. **A bad job can be submitted.** `step` carries over too. Reach Review
   (step 5) in miR-Target with valid gene targets, then switch to miR-LncRNA:
   you land directly on Review & Run, so Config never re-renders and its
   malformed-target gate never fires. `StepIndicator` only allows jumping
   backward (`isJumpable = isComplete`, line 30), so nothing forces you through
   Config again. `run()` only checks `toJobPayload()`, which validates
   miRNA/tools/operation but never target shape (`StepReview.tsx:135-141`,
   `stores/wizardStore.ts:232-235`). Result: a `mir-lncrna` job submitted with
   `targets: ["TP53", "NM_000546"]`.

### Options considered

| # | Approach | Fixes | Cost |
|---|---|---|---|
| 1 | Namespace `tools` + `targetGeneIds` per workflow (`Record<WorkflowType, …>`), keep the rest shared | 2, 3 | store restructure + `StepConfig`, `StepTools`, `StepReview`, `toJobPayload` |
| 2 | Clear `targetGeneIds` and prune `tools` inside `setWorkflow` when the workflow actually changes, with a visible note explaining what was cleared | 2, 3 | small, contained; loses those two inputs on every switch |
| 3 | **Per-workflow drafts** — turn `wizardStore.ts` into a `createWizardStore()` factory, hold `{ "mir-target": store, "mir-lncrna": store }` in a provider, resolve in `useWizardStore` | 1, 2, 3, 4 | moderate but mechanical; the ~8 `useWizardStore(s => s.field)` call sites are unchanged |

Options 1 and 2 keep a single store instance, so **neither fixes symptom 1** —
species / miRNA / operation / config still clobber across workflows.

### Recommendation

Option 3. It matches the "two independent tabs" mental model and is the only
one that survives the clobbering scenario. `step`, `tools`, and `targetGeneIds`
become per-draft, so symptoms 2–4 fall out as side effects with no
special-casing. Tradeoff: species and miRNA no longer carry across — address
later with an explicit "copy inputs from miR-Target" action, which is preferable
to the implicit carry-over anyway.

If options 1 or 2 are chosen instead, also clamp `step` on a workflow change
(send it back to the first step whose inputs are now incomplete) so symptom 4 is
closed.
