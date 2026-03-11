import type { JobStatusValue, OperationType, WorkflowType } from "@/lib/types";

export const WIZARD_STEPS_LNCRNA = [
  "Species",
  "miRNA",
  "Operation",
  "Prediction Tools",
  "Configuration",
  "Review & Run",
] as const;

export const WIZARD_STEPS_TARGET = [
  "Species",
  "miRNA",
  "Operation",
  "Prediction Tools",
  "Select Target",
  "Configuration",
  "Review & Run",
] as const;

// Alias for backwards compatibility
export const WIZARD_STEPS = WIZARD_STEPS_LNCRNA;

export const STEP_CONTEXT: Record<number, string> = {
  0: "Species defines biological scope first. For Homo sapiens, select reference file hg19 or hg38.",
  1: "Choose one miRNA identifier from the available list for the selected species.",
  2: "Configure optional Modification and Shift sub-steps. At least one must be provided.",
  3: "Select one or more prediction tools. Tool outputs are preserved as reported by each tool.",
  4: "Advanced configuration is optional and collapsed by default. Visible defaults keep runs reproducible.",
  5: "Review your run request, then start an immutable asynchronous job.",
};

export const STEP_CONTEXT_TARGET: Record<number, string> = {
  ...STEP_CONTEXT,
  4: "Optionally filter predictions to specific gene targets. Enter one or more gene IDs or symbols (e.g. TP53, ENSG00000141510), comma-separated. Leave blank to run against all predicted targets.",
  5: "Advanced configuration is optional and collapsed by default. Visible defaults keep runs reproducible.",
  6: "Review your run request, then start an immutable asynchronous job.",
};

export const WORKFLOW_LABELS: Record<WorkflowType, string> = {
  "mir-target": "miR-Target Prediction",
  "mir-lncrna": "miR-LncRNA Prediction",
};

export const OPERATION_OPTIONS: {
  value: OperationType;
  label: string;
  description: string;
  bullets: string[];
}[] = [
    {
      value: "shift",
      label: "Shift",
      description: "Shift miRNA binding position before target prediction.",
      bullets: ["Binding offset", "Seed move", "Positional exploration"],
    },
    {
      value: "modification",
      label: "Modification",
      description: "Modify miRNA sequence context before target prediction.",
      bullets: ["Sequence edit", "Mutation modeling", "Nucleotide modification"],
    },
  ];

export const TOOL_OPTIONS = [
  {
    value: "miRanda",
    label: "miRanda",
    description:
      "Scan for miRNA-mRNA complementarity using alignment, thermodynamics, and conservation.",
  },
  {
    value: "miRmap",
    label: "miRmap",
    description:
      "Predict and rank target repression strength with integrated scoring features.",
  },
  {
    value: "Targetscan",
    label: "TargetScan",
    description:
      "Predict conserved miRNA targets based on seed matching and repression context.",
  },
  {
    value: "RNAhybrid",
    label: "RNAhybrid",
    description:
      "Find energetically favorable miRNA-target duplexes (flexible parameter settings).",
  },
  {
    value: "PITA",
    label: "PITA",
    description:
      "Predict targets by accounting for site accessibility and hybrid free energy.",
  },
  {
    value: "DMISO",
    label: "DMISO",
    description:
      "Use deep learning to detect miRNA/isomiR-mRNA interactions with complex learned features.",
  },
] as const;

export const SPECIES_OPTIONS = [
  {
    value: "9606",
    label: "Homo sapiens",
    subtitle: "Homo sapiens (Taxonomy ID: 9606)",
  },
  {
    value: "10090",
    label: "Mus musculus",
    subtitle: "Mus musculus (Taxonomy ID: 10090)",
  },
  {
    value: "10116",
    label: "Rattus norvegicus",
    subtitle: "Rattus norvegicus (Taxonomy ID: 10116)",
  },
] as const;

export const OUTPUT_FORMAT_OPTIONS = [
  { value: "standard", label: "Standard" },
  { value: "extended", label: "Extended" },
] as const;

export const JOB_STAGE_SEQUENCE = ["Processing", "Predicting"] as const;

export const STATUS_COLOR: Record<
  JobStatusValue,
  "default" | "primary" | "success" | "warning" | "danger"
> = {
  queued: "warning",
  running: "primary",
  succeeded: "success",
  failed: "danger",
  killed: "default",
};
