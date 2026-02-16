import { create } from "zustand";

import { evaluateOperationState, type ModificationInput } from "@/lib/operation";
import type { CreateJobPayload, WizardConfig } from "@/lib/types";

interface WizardState {
  step: number;
  operationSubstep: "shift" | "modification";
  mirnaId: string;
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
  setHumanReference: (humanReference: "hg19" | "hg38" | "") => void;
  setOperationSubstep: (operationSubstep: "shift" | "modification") => void;
  addModificationRow: () => void;
  updateModificationRow: (index: number, patch: Partial<ModificationInput>) => void;
  removeModificationRow: (index: number) => void;
  setShiftLeft: (shiftLeft: string) => void;
  setShiftRight: (shiftRight: string) => void;
  toggleTool: (tool: string) => void;
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
  humanReference: "",
  modifications: [],
  shiftLeft: "",
  shiftRight: "",
  tools: [],
  species: "",
  config: {
    cores: 8,
    maxRuntime: "Default",
    outputFormat: "standard",
  },
};

export const useWizardStore = create<WizardState>((set, get) => ({
  ...initialState,
  setMirnaId: (mirnaId) => set({ mirnaId }),
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

    if (!state.mirnaId || !state.species || !state.tools.length || !opState.isValid) {
      return null;
    }

    const referenceFile =
      state.species === "9606" && state.humanReference ? state.humanReference : null;

    return {
      mirna_id: state.mirnaId,
      operation: opState.operationType ?? "shift",
      modifications: opState.formattedModifications,
      shift: opState.shift,
      tools: state.tools,
      species: state.species,
      configuration: {
        ...state.config,
        referenceFile,
      },
    };
  },
}));
