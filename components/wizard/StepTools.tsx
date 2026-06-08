"use client";

import { useEffect } from "react";
import { Button } from "@heroui/react";

import {
  SPECIES_OPTIONS,
  TOOL_OPTIONS,
  isToolSupportedForSpecies,
} from "@/lib/constants";
import { useWizardStore } from "@/stores/wizardStore";

export function StepTools() {
  const species = useWizardStore((state) => state.species);
  const tools = useWizardStore((state) => state.tools);
  const toggleTool = useWizardStore((state) => state.toggleTool);
  const setTools = useWizardStore((state) => state.setTools);
  const next = useWizardStore((state) => state.next);
  const back = useWizardStore((state) => state.back);

  // Tools available for the selected species (TargetScan is species-restricted).
  const supportedToolValues = TOOL_OPTIONS.filter((tool) =>
    isToolSupportedForSpecies(tool.value, species),
  ).map((tool) => tool.value);
  const allSelected =
    supportedToolValues.length > 0 &&
    supportedToolValues.every((tool) => tools.includes(tool));

  const speciesLabel =
    SPECIES_OPTIONS.find((option) => option.value === species)?.label ?? "this species";

  // Drop any selected tool that is not supported for the current species
  // (e.g. switching to a species where TargetScan has no reference data).
  useEffect(() => {
    const filtered = tools.filter((tool) =>
      isToolSupportedForSpecies(tool, species),
    );
    if (filtered.length !== tools.length) {
      setTools(filtered);
    }
  }, [species, tools, setTools]);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Select Prediction Tools</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Select target prediction algorithms to use. Choose at least one tool before proceeding.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4">
        <h3 className="text-base font-semibold text-zinc-900">Tool Selection</h3>

        <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-3 text-sm font-semibold text-zinc-800">
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => setTools(allSelected ? [] : supportedToolValues)}
                      className="h-4 w-4 rounded border-zinc-400 text-teal-700 focus:ring-teal-600"
                    />
                    Tool
                  </label>
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-zinc-800">Description</th>
              </tr>
            </thead>
            <tbody>
              {TOOL_OPTIONS.map((tool) => {
                const supported = isToolSupportedForSpecies(tool.value, species);
                const checked = supported && tools.includes(tool.value);

                return (
                  <tr
                    key={tool.value}
                    className={`border-b border-zinc-100 last:border-b-0 ${supported ? "" : "bg-zinc-50/60"}`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                      <label
                        className={`inline-flex items-center gap-3 ${supported ? "cursor-pointer" : "cursor-not-allowed"}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!supported}
                          onChange={() => toggleTool(tool.value)}
                          className="h-4 w-4 rounded border-zinc-400 text-teal-700 focus:ring-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <span className={supported ? "" : "text-zinc-400"}>{tool.label}</span>
                        {!supported ? (
                          <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                            Not available for {speciesLabel}
                          </span>
                        ) : null}
                      </label>
                    </td>
                    <td className={`px-4 py-3 text-sm ${supported ? "text-zinc-600" : "text-zinc-400"}`}>
                      {tool.description}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className={`mt-4 text-sm ${tools.length ? "text-zinc-700" : "font-medium text-red-600"}`}>
          The user must select <strong>at least one</strong> prediction tool before proceeding.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="flat" onPress={back}>
          Back: Operation
        </Button>
        <Button color="primary" onPress={next} isDisabled={!tools.length}>
          Next: Configuration
        </Button>
      </div>
    </section>
  );
}
