import { create } from "zustand";

import { MAX_CORES_PER_JOB, MAX_NETWORK_MIRNAS, SPECIES_OPTIONS } from "@/lib/constants";
import { parsePairs } from "@/lib/pairs";
import type { CreateNetworkJobPayload } from "@/lib/types";

const TOTAL_STEPS = 6;

interface NetworkWizardState {
  step: number;
  species: string;
  humanReference: "hg19" | "hg38" | "";
  selectedMirnas: string[];
  pairsText: string;
  tools: string[];
  cores: number;
  setSpecies: (species: string) => void;
  setHumanReference: (humanReference: "hg19" | "hg38" | "") => void;
  toggleMirna: (id: string) => void;
  setSelectedMirnas: (ids: string[]) => void;
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
  | "pairsText"
  | "tools"
  | "cores"
> = {
  step: 0,
  species: "",
  humanReference: "",
  selectedMirnas: [],
  pairsText: "",
  tools: [],
  cores: MAX_CORES_PER_JOB,
};

export const useNetworkWizardStore = create<NetworkWizardState>((set, get) => ({
  ...initialState,
  setSpecies: (species) => set({ species }),
  setHumanReference: (humanReference) => set({ humanReference }),
  toggleMirna: (id) =>
    set((state) => ({
      selectedMirnas: state.selectedMirnas.includes(id)
        ? state.selectedMirnas.filter((m) => m !== id)
        : [...state.selectedMirnas, id],
    })),
  setSelectedMirnas: (selectedMirnas) => set({ selectedMirnas }),
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

    const pairs = parsePairs(state.pairsText);
    if (pairs.length) payload.pairs = pairs;

    return payload;
  },
}));
