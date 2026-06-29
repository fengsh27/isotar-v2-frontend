"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Chip, Spinner } from "@heroui/react";

import { MAX_NETWORK_MIRNAS } from "@/lib/constants";
import { loadMirnaDataset, speciesLabel, type MirnaDataset } from "@/lib/mirnaData";
import { useNetworkWizardStore } from "@/stores/networkWizardStore";

export function StepMirnas() {
  const species = useNetworkWizardStore((state) => state.species);
  const selectedMirnas = useNetworkWizardStore((state) => state.selectedMirnas);
  const preIds = useNetworkWizardStore((state) => state.preIds);
  const toggleMirna = useNetworkWizardStore((state) => state.toggleMirna);
  const setSelectedMirnas = useNetworkWizardStore((state) => state.setSelectedMirnas);
  const setPreId = useNetworkWizardStore((state) => state.setPreId);
  const back = useNetworkWizardStore((state) => state.back);
  const next = useNetworkWizardStore((state) => state.next);

  const [dataset, setDataset] = useState<MirnaDataset | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!species) {
        setDataset(null);
        return;
      }
      setLoading(true);
      setLoadError("");
      try {
        const ds = await loadMirnaDataset(species);
        if (!active) return;
        setDataset(ds ?? {});
        if (ds) {
          // Drop any selections no longer present in the new species catalog.
          setSelectedMirnas(selectedMirnas.filter((id) => id in ds));
        } else {
          setSelectedMirnas([]);
        }
      } catch {
        if (!active) return;
        setLoadError(`Unable to load the miRNA reference catalog for ${speciesLabel(species)}.`);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
    // selectedMirnas intentionally excluded — re-running on every toggle would thrash.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [species, setSelectedMirnas]);

  const mirnaIds = useMemo(
    () => (dataset ? Object.keys(dataset).sort((a, b) => a.localeCompare(b)) : []),
    [dataset],
  );

  const filteredIds = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? mirnaIds.filter((id) => id.toLowerCase().includes(term)) : mirnaIds;
  }, [mirnaIds, query]);

  // Selected miRNAs that map to more than one precursor — these need an
  // explicit precursor choice so the backend doesn't have to guess.
  const multiPrecursor = useMemo(
    () =>
      selectedMirnas
        .map((id) => ({ id, records: dataset?.[id] ?? [] }))
        .filter((m) => m.records.length > 1)
        .sort((a, b) => a.id.localeCompare(b.id)),
    [selectedMirnas, dataset],
  );

  const overLimit = selectedMirnas.length > MAX_NETWORK_MIRNAS;
  const canProceed = selectedMirnas.length > 0 && !overLimit;

  // Toggle selection, defaulting multi-precursor miRNAs to their first
  // precursor so a choice is always recorded before submission.
  const handleToggle = (id: string) => {
    const wasSelected = selectedMirnas.includes(id);
    toggleMirna(id);
    if (!wasSelected) {
      const records = dataset?.[id] ?? [];
      if (records.length > 1 && !preIds[id]) {
        setPreId(id, records[0].pre_id);
      }
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Select miRNAs</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Pick up to {MAX_NETWORK_MIRNAS} miRNAs. The job runs every selected miRNA against both
          the gene (3′ UTR) and lncRNA target pools.
        </p>
      </div>

      {loadError ? <Alert color="danger" variant="flat" title={loadError} /> : null}

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-800">Catalog: {speciesLabel(species)}</p>
        <span
          className={
            overLimit
              ? "text-xs font-medium text-red-600"
              : "text-xs text-zinc-500"
          }
        >
          {selectedMirnas.length} / {MAX_NETWORK_MIRNAS} selected
        </span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <Spinner size="sm" /> Loading {speciesLabel(species)} miRNAs…
        </div>
      ) : !dataset || mirnaIds.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No miRNA catalog is bundled for {speciesLabel(species)}.
        </p>
      ) : (
        <div className="space-y-3">
          {selectedMirnas.length ? (
            <div className="flex flex-wrap gap-1.5">
              {selectedMirnas.map((id) => (
                <Chip
                  key={id}
                  size="sm"
                  variant="flat"
                  color="primary"
                  onClose={() => handleToggle(id)}
                >
                  {id}
                </Chip>
              ))}
            </div>
          ) : null}

          <div className="rounded-xl border border-zinc-300 bg-zinc-100 px-3 py-2 transition-colors focus-within:border-zinc-400 focus-within:bg-white">
            <label htmlFor="net-mirna-filter" className="text-sm text-zinc-500">
              Filter miRNA IDs
            </label>
            <input
              id="net-mirna-filter"
              type="text"
              placeholder="e.g. miR-21"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full border-0 bg-transparent p-0 text-base text-zinc-700 placeholder:text-zinc-500 focus:outline-none"
            />
          </div>

          <div className="h-[260px] overflow-y-auto rounded-xl border border-zinc-200 bg-white/80 p-2">
            <p className="mb-2 px-1 text-xs text-zinc-500">
              Showing {filteredIds.length} of {mirnaIds.length}
            </p>
            <div className="grid gap-1">
              {filteredIds.map((id) => {
                const checked = selectedMirnas.includes(id);
                const disabled = !checked && selectedMirnas.length >= MAX_NETWORK_MIRNAS;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      if (disabled) return;
                      handleToggle(id);
                    }}
                    disabled={disabled}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${checked
                        ? "bg-teal-100 text-teal-900"
                        : disabled
                          ? "cursor-not-allowed text-zinc-400"
                          : "text-zinc-700 hover:bg-zinc-100"
                      }`}
                  >
                    <span className="inline-block w-4">{checked ? "✓" : ""}</span>
                    <span className="font-mono text-xs">{id}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {multiPrecursor.length ? (
            <div className="space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-3">
              <div>
                <p className="text-sm font-medium text-zinc-800">Precursor selection</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  These miRNAs map to multiple precursors. Choose which precursor each
                  should use; the rest default automatically.
                </p>
              </div>
              {multiPrecursor.map(({ id, records }) => (
                <div
                  key={id}
                  className="grid gap-1 sm:grid-cols-[180px_1fr] sm:items-center"
                >
                  <span className="font-mono text-xs text-zinc-700">{id}</span>
                  <select
                    aria-label={`Precursor for ${id}`}
                    value={preIds[id] ?? records[0].pre_id}
                    onChange={(e) => setPreId(id, e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                  >
                    {records.map((record) => (
                      <option
                        key={`${record.pre_id}-${record.pre_acc}`}
                        value={record.pre_id}
                      >
                        {record.pre_id} ({record.pre_acc})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {overLimit ? (
        <Alert
          color="warning"
          variant="flat"
          title={`Select at most ${MAX_NETWORK_MIRNAS} miRNAs.`}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="flat" onPress={back}>
          Back: Species
        </Button>
        <Button color="primary" onPress={next} isDisabled={!canProceed}>
          Next: ceRNA Pairs
        </Button>
      </div>
    </section>
  );
}
