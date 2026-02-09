"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Spinner } from "@heroui/react";

import { useWizardStore } from "@/stores/wizardStore";

type MirnaRecord = {
  pre_id: string;
  pre_seq: string;
  mature_seq: string;
  mature_loc_start: number;
  mature_loc_end: number;
  ext_pre_seq: string;
  ext_mature_loc_start: number;
  ext_mature_loc_end: number;
  mature_acc: string;
  pre_acc: string;
};

type MirnaDataset = Record<string, MirnaRecord[]>;

function speciesFromMirnaId(mirnaId: string): string {
  const prefix = mirnaId.split("-")[0]?.toLowerCase() ?? "";
  const mapping: Record<string, string> = {
    hsa: "Homo sapiens",
    mmu: "Mus musculus",
    rno: "Rattus norvegicus",
    dme: "Drosophila melanogaster",
    cel: "Caenorhabditis elegans",
  };

  return mapping[prefix] ?? prefix.toUpperCase();
}

function toFasta(id: string, record: MirnaRecord): string {
  return [
    `>${id}|${record.mature_acc}|mature`,
    record.mature_seq,
    `>${record.pre_id}|${record.pre_acc}|precursor`,
    record.pre_seq,
  ].join("\n");
}

export function StepMiRNA() {
  const mirnaId = useWizardStore((state) => state.mirnaId);
  const setMirnaId = useWizardStore((state) => state.setMirnaId);
  const setOperationSubstep = useWizardStore((state) => state.setOperationSubstep);
  const next = useWizardStore((state) => state.next);

  const [dataset, setDataset] = useState<MirnaDataset | null>(null);
  const [query, setQuery] = useState(mirnaId);
  const [selectedId, setSelectedId] = useState(mirnaId);
  const [selectedRecordIndex, setSelectedRecordIndex] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "done" | "error">("idle");

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const loaded = (await import("@/data/mature_pre_mirna_ext.json")).default as MirnaDataset;
        if (!active) {
          return;
        }

        setDataset(loaded);

        if (mirnaId && loaded[mirnaId]) {
          setSelectedId(mirnaId);
          setQuery(mirnaId);
        }
      } catch {
        if (!active) {
          return;
        }

        setLoadError(
          "Unable to load miRNA reference data. Check data/mature_pre_mirna_ext.json and retry.",
        );
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [mirnaId]);

  const ids = useMemo(() => {
    if (!dataset) {
      return [];
    }

    return Object.keys(dataset).sort((a, b) => a.localeCompare(b));
  }, [dataset]);

  const filteredIds = useMemo(() => {
    if (!query.trim()) {
      return ids;
    }

    const term = query.trim().toLowerCase();
    return ids.filter((id) => id.toLowerCase().includes(term));
  }, [ids, query]);

  useEffect(() => {
    if (!dataset) {
      return;
    }

    const exact = dataset[query.trim()];
    if (exact) {
      setSelectedId(query.trim());
      setSelectedRecordIndex(0);
      setMirnaId(query.trim());
    }
  }, [dataset, query, setMirnaId]);

  const records = selectedId && dataset ? dataset[selectedId] ?? [] : [];
  const selectedRecord = records[selectedRecordIndex] ?? null;

  const canProceed = Boolean(selectedId && selectedRecord);
  const copyButtonClass =
    copyState === "done"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
      : copyState === "error"
        ? "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
        : "border-teal-200 bg-white text-teal-800 hover:bg-teal-50";

  function chooseMirna(id: string) {
    setQuery(id);
    setSelectedId(id);
    setSelectedRecordIndex(0);
    setMirnaId(id);
    setCopyState("idle");
  }

  async function copyMatureSequence() {
    if (!selectedRecord) {
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedRecord.mature_seq);
      setCopyState("done");
      window.setTimeout(() => setCopyState("idle"), 1400);
    } catch {
      setCopyState("error");
    }
  }

  function downloadFasta() {
    if (!selectedRecord || !selectedId) {
      return;
    }

    const fasta = toFasta(selectedId, selectedRecord);
    const blob = new Blob([fasta], { type: "text/plain;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${selectedId}.fasta`;
    anchor.click();
    URL.revokeObjectURL(href);
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Select miRNA</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Choose a miRNA ID from the reference catalog. You can type to filter and select.
        </p>
      </div>

      {loadError ? <Alert color="danger" title={loadError} variant="flat" /> : null}

      {!dataset ? (
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <Spinner size="sm" /> Loading miRNA dataset...
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-zinc-300 bg-zinc-100 px-3 py-2 transition-colors focus-within:border-zinc-400 focus-within:bg-white">
            <label htmlFor="mirna-id-input" className="text-sm text-zinc-500">
              miRNA ID
            </label>
            <input
              id="mirna-id-input"
              type="text"
              placeholder="Type to filter (e.g. hsa-miR-1976)"
              value={query}
              onChange={(event) => {
                const value = event.target.value;
                setQuery(value);
                const trimmed = value.trim();
                if (!trimmed) {
                  setSelectedId("");
                  setMirnaId("");
                  return;
                }

                if (!dataset?.[trimmed]) {
                  setSelectedId("");
                  setMirnaId("");
                }
              }}
              className="w-full border-0 bg-transparent p-0 text-base text-zinc-700 placeholder:text-zinc-500 focus:outline-none"
            />
          </div>

          <div className="h-[200px] overflow-y-auto rounded-xl border border-zinc-200 bg-white/80 p-2">
            <p className="mb-2 px-1 text-xs text-zinc-500">
              Showing {filteredIds.length} matches
            </p>
            <div className="grid gap-1">
              {filteredIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => chooseMirna(id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${selectedId === id
                    ? "bg-teal-100 text-teal-900"
                    : "text-zinc-700 hover:bg-zinc-100"
                    }`}
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedRecord && selectedId ? (
        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white/80 p-4">
          {records.length > 1 ? (
            <div className="space-y-1">
              <label htmlFor="mirna-record" className="text-sm font-medium text-zinc-800">
                Precursor record
              </label>
              <select
                id="mirna-record"
                value={String(selectedRecordIndex)}
                onChange={(event) => setSelectedRecordIndex(Number(event.target.value))}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              >
                {records.map((record, index) => (
                  <option key={`${record.pre_id}-${record.pre_acc}`} value={index}>
                    {record.pre_id} ({record.pre_acc})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-zinc-900">miRNA Summary</h3>
            <p className="text-sm text-zinc-900">
              <strong>{selectedId}</strong>{" "}
              <span className="italic text-zinc-600">({speciesFromMirnaId(selectedId)})</span>
            </p>

            <div>
              <p className="text-sm font-semibold text-zinc-800">
                Mature sequence ({selectedRecord.mature_seq.length} nt)
              </p>
              <code className="mt-1 inline-block rounded bg-zinc-100 px-2 py-1 text-sm text-zinc-900">
                {selectedRecord.mature_seq}
              </code>
            </div>

            <p className="text-sm text-zinc-800">
              <strong>Precursor:</strong> {selectedRecord.pre_id} ({selectedRecord.pre_acc})
            </p>
            <p className="text-sm text-zinc-800">
              <strong>Mature accession:</strong> {selectedRecord.mature_acc}
            </p>
            <p className="text-sm text-zinc-800">
              <strong>Location on precursor:</strong> {selectedRecord.mature_loc_start}–
              {selectedRecord.mature_loc_end}
            </p>

            <div>
              <p className="text-sm font-semibold text-zinc-800">Precursor sequence</p>
              <pre className="mt-1 overflow-x-auto rounded-lg bg-zinc-50 p-2 text-xs text-zinc-800">
                {selectedRecord.pre_seq}
              </pre>
            </div>

            <p className="text-sm text-zinc-800">
              <strong>Extended mature location:</strong> {selectedRecord.ext_mature_loc_start}–
              {selectedRecord.ext_mature_loc_end}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onPress={downloadFasta}
              className="h-10 rounded-xl border border-zinc-300 bg-gradient-to-br from-white to-zinc-50 px-4 text-sm font-semibold text-zinc-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md hover:shadow-teal-900/10 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            >
              Download miRNA FASTA
            </Button>
            <Button
              onPress={copyMatureSequence}
              className={`h-10 rounded-xl border px-4 text-sm font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-teal-900/10 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 ${copyButtonClass}`}
            >
              {copyState === "done"
                ? "Copied"
                : copyState === "error"
                  ? "Copy failed"
                  : "Copy Mature Sequence"}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap justify-end gap-3">
        <Button
          color="primary"
          onPress={() => {
            setOperationSubstep("modification");
            next();
          }}
          isDisabled={!canProceed}
        >
          Next: Operation
        </Button>
      </div>
    </section>
  );
}
