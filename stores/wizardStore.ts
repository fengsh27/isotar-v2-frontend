import { create } from "zustand";

import { evaluateOperationState, type ModificationInput } from "@/lib/operation";
import type { CreateJobPayload, WizardConfig } from "@/lib/types";

interface WizardState {
  step: number;
  operationSubstep: "shift" | "modification";
  mirnaId: string;
  preId: string;
  humanReference: "hg19" | "hg38" | "";
  modifications: ModificationInput[];
  shiftLeft: string;
  shiftRight: string;
  tools: string[];
  species: string;
  config: {
    cores: WizardConfig["cores"];
    maxRuntime: WizardConfig["maxRuntime"];
    outputFormat: WizardConfig["outputFormat"];
  };
  setMirnaId: (mirnaId: string) => void;
  setPreId: (preId: string) => void;
  setHumanReference: (humanReference: "hg19" | "hg38" | "") => void;
  setOperationSubstep: (operationSubstep: "shift" | "modification") => void;
  addModificationRow: () => void;
  updateModificationRow: (index: number, patch: Partial<ModificationInput>) => void;
  removeModificationRow: (index: number) => void;
  setShiftLeft: (shiftLeft: string) => void;
  setShiftRight: (shiftRight: string) => void;
  toggleTool: (tool: string) => void;
  setTools: (tools: string[]) => void;
  setSpecies: (species: string) => void;
  setCores: (cores: number) => void;
  setMaxRuntime: (maxRuntime: string) => void;
  setOutputFormat: (outputFormat: "standard" | "extended") => void;
  goToStep: (step: number) => void;
  next: () => void;
  back: () => void;
  reset: () => void;
  toJobPayload: () => CreateJobPayload | null;
}

const TOTAL_STEPS = 6;

const initialState: Pick<
  WizardState,
  | "step"
  | "operationSubstep"
  | "mirnaId"
  | "preId"
  | "humanReference"
  | "modifications"
  | "shiftLeft"
  | "shiftRight"
  | "tools"
  | "species"
  | "config"
> = {
  step: 0,
  operationSubstep: "shift",
  mirnaId: "",
  preId: "",
  humanReference: "",
  modifications: [],
  shiftLeft: "",
  shiftRight: "",
  tools: [],
  species: "",
  config: {
    cores: 1,
    maxRuntime: "Default",
    outputFormat: "standard",
  },
};

export const useWizardStore = create<WizardState>((set, get) => ({
  ...initialState,
  setMirnaId: (mirnaId) => set({ mirnaId }),
  setPreId: (preId) => set({ preId }),
  setHumanReference: (humanReference) => set({ humanReference }),
  setOperationSubstep: (operationSubstep) => set({ operationSubstep }),
  addModificationRow: () =>
    set((state) => ({
      modifications: [
        ...state.modifications,
        {
          position: "",
          original: "",
          replacement: "G",
        },
      ],
    })),
  updateModificationRow: (index, patch) =>
    set((state) => ({
      modifications: state.modifications.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    })),
  removeModificationRow: (index) =>
    set((state) => ({
      modifications: state.modifications.filter((_, rowIndex) => rowIndex !== index),
    })),
  setShiftLeft: (shiftLeft) => set({ shiftLeft }),
  setShiftRight: (shiftRight) => set({ shiftRight }),
  toggleTool: (tool) =>
    set((state) => {
      const exists = state.tools.includes(tool);
      return {
        tools: exists ? state.tools.filter((item) => item !== tool) : [...state.tools, tool],
      };
    }),
  setTools: (tools) => set({ tools }),
  setSpecies: (species) => set({ species }),
  setCores: (cores) =>
    set((state) => ({
      config: {
        ...state.config,
        cores,
      },
    })),
  setMaxRuntime: (maxRuntime) =>
    set((state) => ({
      config: {
        ...state.config,
        maxRuntime,
      },
    })),
  setOutputFormat: (outputFormat) =>
    set((state) => ({
      config: {
        ...state.config,
        outputFormat,
      },
    })),
  goToStep: (step) =>
    set({
      step: Math.min(Math.max(step, 0), TOTAL_STEPS - 1),
    }),
  next: () =>
    set((state) => ({
      step: Math.min(state.step + 1, TOTAL_STEPS - 1),
    })),
  back: () =>
    set((state) => ({
      step: Math.max(state.step - 1, 0),
    })),
  reset: () => set({ ...initialState }),
  toJobPayload: () => {
    const state = get();
    const opState = evaluateOperationState(
      state.modifications,
      state.shiftLeft,
      state.shiftRight,
    );

    if (!state.mirnaId || !state.tools.length || !opState.isValid) {
      return null;
    }

    const payload: CreateJobPayload = {
      mirna_id: state.mirnaId,
      tools: state.tools,
      cores: state.config.cores,
    };

    // genome is only relevant for human; omit for other species (server defaults to "hg38")
    if (state.species === "9606" && state.humanReference) {
      payload.genome = state.humanReference;
    }

    if (opState.formattedModifications.length) {
      payload.modifications = opState.formattedModifications;
    }

    if (opState.shift) {
      payload.shift = opState.shift;
    }

    if (state.preId) {
      payload.pre_id = state.preId;
    }

    return payload;
  },
}));
