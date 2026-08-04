import { create } from "zustand";

import {
  MAX_CORES_PER_JOB,
  MAX_NETWORK_MIRNAS,
  MAX_NETWORK_PAIRS,
  SPECIES_OPTIONS,
} from "@/lib/constants";
import { evaluateOperationState, type ModificationInput } from "@/lib/operation";
import { parsePairs } from "@/lib/pairs";
import type { CreateNetworkJobPayload, NetworkVariantSpec } from "@/lib/types";

const TOTAL_STEPS = 6;

/** In-progress editor state for one variant. Raw input is preserved so users
 *  can navigate between steps without losing partial entries; serialization
 *  to backend `NetworkVariantSpec` happens in `toJobPayload`. */
export interface NetworkVariantEditor {
  /** Stable local key for React reconciliation; opaque to backend. */
  key: string;
  shiftLeft: string;
  shiftRight: string;
  rows: ModificationInput[];
}

function newVariantKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `v-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeEmptyVariant(): NetworkVariantEditor {
  return { key: newVariantKey(), shiftLeft: "", shiftRight: "", rows: [] };
}

interface NetworkWizardState {
  step: number;
  species: string;
  humanReference: "hg19" | "hg38" | "";
  selectedMirnas: string[];
  /** Per-miRNA precursor choice. Keyed by miRNA ID; only populated for miRNAs
   *  that map to multiple precursors (single-precursor miRNAs are unambiguous
   *  and need no entry). */
  preIds: Record<string, string>;
  /** Per-miRNA variant editors. Sparse: only miRNAs with ≥1 variant have an
   *  entry. WT is implicit — the backend always includes it, so there's no
   *  editor row for WT. */
  variants: Record<string, NetworkVariantEditor[]>;
  pairsText: string;
  tools: string[];
  cores: number;
  setSpecies: (species: string) => void;
  setHumanReference: (humanReference: "hg19" | "hg38" | "") => void;
  toggleMirna: (id: string) => void;
  setSelectedMirnas: (ids: string[]) => void;
  setPreId: (mirnaId: string, preId: string) => void;
  addVariant: (mirnaId: string) => void;
  removeVariant: (mirnaId: string, key: string) => void;
  updateVariant: (
    mirnaId: string,
    key: string,
    patch: Partial<Omit<NetworkVariantEditor, "key">>,
  ) => void;
  setPairsText: (text: string) => void;
  toggleTool: (tool: string) => void;
  setTools: (tools: string[]) => void;
  setCores: (cores: number) => void;
  goToStep: (step: number) => void;
  next: () => void;
  back: () => void;
  reset: () => void;
  toJobPayload: () => CreateNetworkJobPayload | null;
}

const initialState: Pick<
  NetworkWizardState,
  | "step"
  | "species"
  | "humanReference"
  | "selectedMirnas"
  | "preIds"
  | "variants"
  | "pairsText"
  | "tools"
  | "cores"
> = {
  step: 0,
  species: "",
  humanReference: "",
  selectedMirnas: [],
  preIds: {},
  variants: {},
  pairsText: "",
  tools: [],
  cores: MAX_CORES_PER_JOB,
};

export const useNetworkWizardStore = create<NetworkWizardState>((set, get) => ({
  ...initialState,
  setSpecies: (species) => set({ species }),
  setHumanReference: (humanReference) => set({ humanReference }),
  toggleMirna: (id) =>
    set((state) => {
      if (state.selectedMirnas.includes(id)) {
        // Deselecting — drop any precursor choice and variant editors held
        // for this miRNA so submission never carries orphan data.
        const preIds = Object.fromEntries(
          Object.entries(state.preIds).filter(([key]) => key !== id),
        );
        const variants = Object.fromEntries(
          Object.entries(state.variants).filter(([key]) => key !== id),
        );
        return {
          selectedMirnas: state.selectedMirnas.filter((m) => m !== id),
          preIds,
          variants,
        };
      }
      return { selectedMirnas: [...state.selectedMirnas, id] };
    }),
  setSelectedMirnas: (selectedMirnas) =>
    set((state) => {
      // Prune precursor choices and variant editors for miRNAs no longer
      // selected (e.g. after a species change drops out-of-catalog picks).
      const keep = new Set(selectedMirnas);
      const preIds = Object.fromEntries(
        Object.entries(state.preIds).filter(([id]) => keep.has(id)),
      );
      const variants = Object.fromEntries(
        Object.entries(state.variants).filter(([id]) => keep.has(id)),
      );
      return { selectedMirnas, preIds, variants };
    }),
  setPreId: (mirnaId, preId) =>
    set((state) => ({ preIds: { ...state.preIds, [mirnaId]: preId } })),
  addVariant: (mirnaId) =>
    set((state) => ({
      variants: {
        ...state.variants,
        [mirnaId]: [...(state.variants[mirnaId] ?? []), makeEmptyVariant()],
      },
    })),
  removeVariant: (mirnaId, key) =>
    set((state) => {
      const remaining = (state.variants[mirnaId] ?? []).filter((v) => v.key !== key);
      // Drop the miRNA's entry entirely when its last variant is removed, so
      // the map stays sparse.
      if (!remaining.length) {
        const { [mirnaId]: _dropped, ...rest } = state.variants;
        return { variants: rest };
      }
      return { variants: { ...state.variants, [mirnaId]: remaining } };
    }),
  updateVariant: (mirnaId, key, patch) =>
    set((state) => ({
      variants: {
        ...state.variants,
        [mirnaId]: (state.variants[mirnaId] ?? []).map((v) =>
          v.key === key ? { ...v, ...patch } : v,
        ),
      },
    })),
  setPairsText: (pairsText) => set({ pairsText }),
  toggleTool: (tool) =>
    set((state) => ({
      tools: state.tools.includes(tool)
        ? state.tools.filter((t) => t !== tool)
        : [...state.tools, tool],
    })),
  setTools: (tools) => set({ tools }),
  setCores: (cores) => set({ cores }),
  goToStep: (step) => set({ step: Math.min(Math.max(step, 0), TOTAL_STEPS - 1) }),
  next: () => set((state) => ({ step: Math.min(state.step + 1, TOTAL_STEPS - 1) })),
  back: () => set((state) => ({ step: Math.max(state.step - 1, 0) })),
  reset: () => set({ ...initialState }),
  toJobPayload: () => {
    const state = get();
    if (!state.selectedMirnas.length) return null;
    if (state.selectedMirnas.length > MAX_NETWORK_MIRNAS) return null;
    if (!state.tools.length) return null;
    if (state.species === "9606" && !state.humanReference) return null;
    if (!state.species) return null;

    const payload: CreateNetworkJobPayload = {
      workflow: "mir-network",
      mirna_ids: state.selectedMirnas,
      tools: state.tools,
      cores: Math.max(1, Math.min(state.cores, MAX_CORES_PER_JOB)),
    };

    if (state.species === "9606") {
      payload.genome = state.humanReference || undefined;
    } else {
      const speciesOption = SPECIES_OPTIONS.find((o) => o.value === state.species);
      if (speciesOption?.genome) payload.genome = speciesOption.genome;
    }

    // Refuse submission if any pair line is malformed — StepPairs already
    // gates Next, but this second layer keeps the payload honest if any
    // caller reaches Review with typed-but-invalid pair rows.
    const parsedPairs = parsePairs(state.pairsText);
    if (parsedPairs.malformed.length) return null;
    if (parsedPairs.pairs.length > MAX_NETWORK_PAIRS) return null;
    if (parsedPairs.pairs.length) {
      payload.pairs = parsedPairs.pairs;
      // With pairs, the graph only ever shows the pair bridges, so scanning the
      // whole reference computes ~120k interactions to keep ~40. Restrict each
      // pool to its own pair targets: same graph, hours -> seconds. Only valid
      // alongside pairs (the backend 400s otherwise), hence set here rather
      // than unconditionally. A discovery run has nothing to restrict to and
      // still scans the full reference.
      payload.restrict_to_pairs = true;
    }

    // Only forward precursor choices for currently-selected miRNAs. Backend
    // treats `pre_ids` as optional and defaults to its own resolution when an
    // entry is absent, so single-precursor miRNAs are intentionally omitted.
    const preIds = Object.fromEntries(
      Object.entries(state.preIds).filter(
        ([id, preId]) => preId && state.selectedMirnas.includes(id),
      ),
    );
    if (Object.keys(preIds).length) payload.pre_ids = preIds;

    // Assemble per-miRNA variant specs. Editors with only whitespace/no rows
    // are dropped silently (in-progress state); an editor with typed-but-
    // invalid content refuses the whole payload so submission stays blocked
    // until the user fixes it.
    const selectedSet = new Set(state.selectedMirnas);
    const variantsMap: Record<string, NetworkVariantSpec[]> = {};
    for (const [mirnaId, editors] of Object.entries(state.variants)) {
      if (!selectedSet.has(mirnaId)) continue;
      const specs: NetworkVariantSpec[] = [];
      for (const v of editors) {
        const ev = evaluateOperationState(v.rows, v.shiftLeft, v.shiftRight);
        if (!ev.isValid) return null;
        if (!ev.shift && ev.formattedModifications.length === 0) continue;
        const spec: NetworkVariantSpec = {};
        if (ev.shift) spec.shift = ev.shift;
        if (ev.formattedModifications.length) {
          spec.modifications = ev.formattedModifications;
        }
        specs.push(spec);
      }
      if (specs.length) variantsMap[mirnaId] = specs;
    }
    if (Object.keys(variantsMap).length) payload.variants = variantsMap;

    return payload;
  },
}));
