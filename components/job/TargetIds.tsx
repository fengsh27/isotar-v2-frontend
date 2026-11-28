import type { CompareRow, GeneRecord } from "@/lib/types";

/** Rows from a backend whose result databases carry Ensembl ids (schema 3).
 *  Older backends omit the fields entirely, and the tables then fall back to
 *  the raw target id column they always showed. */
export function hasEnsemblIds(rows: Array<GeneRecord | CompareRow> | undefined): boolean {
  return !!rows?.some((r) => r.ensembl_gene !== undefined);
}

/** One Ensembl id per line; the backend '|'-joins the rare RefSeq record that
 *  maps to several. Shows an em dash when there is none (many RefSeq records
 *  have only a gene-level match, and non-Ensembl species often lack both). */
export function EnsemblIdCell({ value }: { value?: string | null }) {
  const ids = (value ?? "").split("|").filter(Boolean);
  return (
    <td className="px-4 py-2.5 font-mono text-xs text-zinc-600">
      {ids.length ? (
        ids.map((id) => (
          <span key={id} className="block whitespace-nowrap">
            {id}
          </span>
        ))
      ) : (
        <span className="text-zinc-300">—</span>
      )}
    </td>
  );
}

/** The gene label, or an em dash for a target without one (many lncRNAs). */
export function GeneLabelCell({ value }: { value?: string | null }) {
  return (
    <td className="px-4 py-2.5 font-mono text-zinc-800">
      {value || <span className="text-zinc-300">—</span>}
    </td>
  );
}
