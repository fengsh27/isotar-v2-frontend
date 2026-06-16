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
  "Configuration",
  "Review & Run",
] as const;

// Alias for backwards compatibility
export const WIZARD_STEPS = WIZARD_STEPS_LNCRNA;

// Matches the backend's ISOTAR_MAX_CORES_PER_JOB env in docker-compose.yml.
// Keep these two in sync when tuning.
export const MAX_CORES_PER_JOB = 8;

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
  4: "Advanced configuration is optional and collapsed by default. Optionally filter predictions to specific gene targets using the Select Target card — enter gene labels (e.g. TP53) or RefSeq IDs starting with NM (e.g. NM_000546).",
  5: "Review your run request, then start an immutable asynchronous job.",
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

/**
 * Species (by taxonomy-id value) for which TargetScan has prebuilt reference
 * data: Homo sapiens (hg19/hg38), mouse, zebrafish, fruitfly, roundworm, and
 * dog. For any other species TargetScan is disabled in the tool-selection step.
 */
export const TARGETSCAN_SPECIES = new Set<string>([
  "9606", // Homo sapiens (hg19 / hg38)
  "10090", // Mus musculus (mmu)
  "7955", // Danio rerio (dre)
  "7227", // Drosophila melanogaster (dme)
  "6239", // Caenorhabditis elegans (cel)
  "9615", // Canis lupus familiaris (cfa)
]);

/** Tool value of TargetScan in TOOL_OPTIONS (species-restricted). */
export const TARGETSCAN_TOOL = "Targetscan";

/** Whether a prediction tool is available for the given species. */
export function isToolSupportedForSpecies(
  toolValue: string,
  species: string,
): boolean {
  if (toolValue === TARGETSCAN_TOOL) {
    return TARGETSCAN_SPECIES.has(species);
  }
  return true;
}

/**
 * Tools that cannot run against a lncRNA target pool: TargetScan ignores the
 * target FASTA and reads its own precomputed 3' UTR datasets, and PITA scores
 * in a 3' UTR context. Mirrors LNCRNA_INCOMPATIBLE_TOOLS in the backend
 * (app_v1/app.py, v2/mirna_predicting.py), which rejects them at submission.
 */
export const LNCRNA_INCOMPATIBLE_TOOLS = new Set<string>(["Targetscan", "PITA"]);

/** Whether a prediction tool is available for the given workflow. */
export function isToolSupportedForWorkflow(
  toolValue: string,
  workflow: WorkflowType,
): boolean {
  if (workflow === "mir-lncrna") {
    return !LNCRNA_INCOMPATIBLE_TOOLS.has(toolValue);
  }
  return true;
}

export const SPECIES_OPTIONS = [
  { value: "9606",  label: "Homo sapiens",                        subtitle: "Homo sapiens — Human (Taxonomy ID: 9606)",                         genome: null,  file: "hg19 / hg38 (user choice)" },
  { value: "6239",  label: "Caenorhabditis elegans",              subtitle: "Caenorhabditis elegans — Roundworm (Taxonomy ID: 6239)",            genome: "cel", file: "cel_WBcel235_3UTRs.fasta" },
  { value: "9615",  label: "Canis lupus familiaris",              subtitle: "Canis lupus familiaris — Dog (Taxonomy ID: 9615)",                  genome: "cfa", file: "cfa_CanFam3.1_3UTRs.fasta" },
  { value: "7227",  label: "Drosophila melanogaster",             subtitle: "Drosophila melanogaster — Fruitfly (Taxonomy ID: 7227)",            genome: "dme", file: "dme_Release6_3UTRs.fasta" },
  { value: "7955",  label: "Danio rerio",                         subtitle: "Danio rerio — Zebrafish (Taxonomy ID: 7955)",                       genome: "dre", file: "dre_GRCz11_3UTRs.fasta" },
  { value: "13616", label: "Monodelphis domestica",               subtitle: "Monodelphis domestica — Gray short-tailed opossum (Taxonomy ID: 13616)", genome: "mdo", file: "mdo_MonDom5_3UTRs.fasta" },
  { value: "9544",  label: "Macaca mulatta",                      subtitle: "Macaca mulatta — Rhesus macaque (Taxonomy ID: 9544)",               genome: "mml", file: "mml_Mmul_8.0.1_3UTRs.fasta" },
  { value: "10090", label: "Mus musculus",                        subtitle: "Mus musculus — House mouse (Taxonomy ID: 10090)",                   genome: "mmu", file: "mmu_GRCm38_3UTRs.fasta" },
  { value: "9598",  label: "Pan troglodytes",                     subtitle: "Pan troglodytes — Chimpanzee (Taxonomy ID: 9598)",                  genome: "ptr", file: "ptr_Pan_tro3.0_3UTRs.fasta" },
  { value: "10116", label: "Rattus norvegicus",                   subtitle: "Rattus norvegicus — Norway rat (Taxonomy ID: 10116)",               genome: "rno", file: "rno_RGSC6_rn6_3UTRs.fasta" },
] as const;

/**
 * Enrichment (Enrichr) is only offered for species with a supported organism
 * gene-set library: human, mouse, and rat. The job's `genome` code maps to the
 * Enrichr organism name; any other species returns `null` and the enrichment
 * feature is hidden.
 */
export function enrichmentOrganismForGenome(genome?: string | null): string | null {
  switch (genome) {
    case "hg19":
    case "hg38":
      return "Human";
    case "mmu":
      return "Mouse";
    case "rno":
      return "Rat";
    default:
      return null;
  }
}

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
