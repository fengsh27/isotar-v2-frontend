import { create } from "zustand";

import type { CreateJobPayload, OperationType, WizardConfig } from "@/lib/types";

interface WizardState {
  step: number;
  mirnaId: string;
  operation?: OperationType;
  tools: string[];
  species: string;
  config: {
    cores: WizardConfig["cores"];
    maxRuntime: WizardConfig["maxRuntime"];
    outputFormat: WizardConfig["outputFormat"];
  };
  setMirnaId: (mirnaId: string) => void;
  setOperation: (operation: OperationType) => void;
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
  "step" | "mirnaId" | "operation" | "tools" | "species" | "config"
> = {
  step: 0,
  mirnaId: "",
  operation: undefined,
  tools: [] as string[],
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
  setOperation: (operation) => set({ operation }),
  toggleTool: (tool) =>
    set((state) => {
      const exists = state.tools.includes(tool);
      return {
        tools: exists
          ? state.tools.filter((item) => item !== tool)
          : [...state.tools, tool],
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

    if (!state.mirnaId || !state.operation || !state.species || !state.tools.length) {
      return null;
    }

    return {
      mirna_id: state.mirnaId,
      operation: state.operation,
      tools: state.tools,
      species: state.species,
      configuration: state.config,
    };
  },
}));
