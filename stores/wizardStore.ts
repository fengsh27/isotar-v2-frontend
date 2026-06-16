import { create } from "zustand";

import { evaluateOperationState, type ModificationInput } from "@/lib/operation";
import { MAX_CORES_PER_JOB, SPECIES_OPTIONS } from "@/lib/constants";
import { parseTargets } from "@/lib/targets";
import type { CreateJobPayload, WizardConfig, WorkflowType } from "@/lib/types";

interface WizardState {
  step: number;
  workflow: WorkflowType;
  operationSubstep: "shift" | "modification";
  mirnaId: string;
  customMirnaSeq: string;
  useCustomMirnaSeq: boolean;
  preId: string;
  humanReference: "hg19" | "hg38" | "";
  modifications: ModificationInput[];
  shiftLeft: string;
  shiftRight: string;
  tools: string[];
  targetGeneIds: string;
  species: string;
  config: {
    cores: WizardConfig["cores"];
    maxRuntime: WizardConfig["maxRuntime"];
    outputFormat: WizardConfig["outputFormat"];
  };
  setMirnaId: (mirnaId: string) => void;
  setCustomMirnaSeq: (seq: string) => void;
  setUseCustomMirnaSeq: (use: boolean) => void;
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
  setTargetGeneIds: (ids: string) => void;
  setSpecies: (species: string) => void;
  setWorkflow: (workflow: WorkflowType) => void;
  setCores: (cores: number) => void;
  setMaxRuntime: (maxRuntime: string) => void;
  setOutputFormat: (outputFormat: "standard" | "extended") => void;
  goToStep: (step: number) => void;
  next: () => void;
  back: () => void;
  reset: () => void;
  toJobPayload: () => CreateJobPayload | null;
}

function totalSteps(_wf: WorkflowType): number {
  return 6;
}

const initialState: Pick<
  WizardState,
  | "step"
  | "workflow"
  | "operationSubstep"
  | "mirnaId"
  | "customMirnaSeq"
  | "useCustomMirnaSeq"
  | "preId"
  | "humanReference"
  | "modifications"
  | "shiftLeft"
  | "shiftRight"
  | "tools"
  | "targetGeneIds"
  | "species"
  | "config"
> = {
  step: 0,
  workflow: "mir-lncrna",
  operationSubstep: "shift",
  mirnaId: "",
  customMirnaSeq: "",
  useCustomMirnaSeq: false,
  preId: "",
  humanReference: "",
  modifications: [],
  shiftLeft: "",
  shiftRight: "",
  tools: [],
  targetGeneIds: "",
  species: "",
  config: {
    cores: MAX_CORES_PER_JOB,
    maxRuntime: "Default",
    outputFormat: "standard",
  },
};

export const useWizardStore = create<WizardState>((set, get) => ({
  ...initialState,
  setMirnaId: (mirnaId) => set({ mirnaId }),
  setCustomMirnaSeq: (customMirnaSeq) => set({ customMirnaSeq }),
  setUseCustomMirnaSeq: (useCustomMirnaSeq) => set({ useCustomMirnaSeq }),
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
  setTargetGeneIds: (targetGeneIds) => set({ targetGeneIds }),
  setSpecies: (species) => set({ species }),
  setWorkflow: (workflow) => set({ workflow }),
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
    set((state) => ({
      step: Math.min(Math.max(step, 0), totalSteps(state.workflow) - 1),
    })),
  next: () =>
    set((state) => {
      // Skip Operation step (index 2) when using a custom miRNA sequence
      const increment = state.useCustomMirnaSeq && state.step === 1 ? 2 : 1;
      return { step: Math.min(state.step + increment, totalSteps(state.workflow) - 1) };
    }),
  back: () =>
    set((state) => {
      // Skip Operation step (index 2) when using a custom miRNA sequence
      const decrement = state.useCustomMirnaSeq && state.step === 3 ? 2 : 1;
      return { step: Math.max(state.step - decrement, 0) };
    }),
  reset: () => set({ ...initialState }),
  toJobPayload: () => {
    const state = get();
    const opState = evaluateOperationState(
      state.modifications,
      state.shiftLeft,
      state.shiftRight,
    );

    const hasMirna = state.useCustomMirnaSeq
      ? Boolean(state.customMirnaSeq.trim())
      : Boolean(state.mirnaId);
    const operationValid = state.useCustomMirnaSeq || opState.isValid;

    if (!hasMirna || !state.tools.length || !operationValid) {
      return null;
    }

    const payload: CreateJobPayload = {
      tools: state.tools,
      workflow: state.workflow,
      cores: Math.max(1, Math.min(state.config.cores, MAX_CORES_PER_JOB)),
    };

    if (state.useCustomMirnaSeq) {
      payload.mirna_seq = state.customMirnaSeq.trim().toUpperCase();
    } else {
      payload.mirna_id = state.mirnaId;
    }

    // Resolve genome: human uses the user's hg19/hg38 selection; all others have a fixed code.
    if (state.species === "9606") {
      if (state.humanReference) payload.genome = state.humanReference;
    } else {
      const speciesOption = SPECIES_OPTIONS.find((o) => o.value === state.species);
      if (speciesOption?.genome) payload.genome = speciesOption.genome;
    }

    if (opState.formattedModifications.length) {
      payload.modifications = opState.formattedModifications;
    }

    if (opState.shift) {
      payload.shift = opState.shift;
    }

    if (!state.useCustomMirnaSeq && state.preId) {
      payload.pre_id = state.preId;
    }

    if (state.workflow === "mir-target") {
      const targets = parseTargets(state.targetGeneIds);
      if (targets.length) payload.targets = targets;
    }

    return payload;
  },
}));
