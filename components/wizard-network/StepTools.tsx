"use client";

import { useEffect } from "react";
import { Button } from "@heroui/react";

import {
  SPECIES_OPTIONS,
  TARGETSCAN_TOOL,
  TOOL_OPTIONS,
  isToolSupportedForSpecies,
} from "@/lib/constants";
import { useNetworkWizardStore } from "@/stores/networkWizardStore";

export function StepTools() {
  const species = useNetworkWizardStore((state) => state.species);
  const tools = useNetworkWizardStore((state) => state.tools);
  const toggleTool = useNetworkWizardStore((state) => state.toggleTool);
  const setTools = useNetworkWizardStore((state) => state.setTools);
  const next = useNetworkWizardStore((state) => state.next);
  const back = useNetworkWizardStore((state) => state.back);

  // Network workflow allows TargetScan (the backend auto-skips it on the lncRNA pool),
  // so only species gating applies here — no workflow gating.
  const isAvailable = (toolValue: string) => isToolSupportedForSpecies(toolValue, species);

  const supportedToolValues = TOOL_OPTIONS.filter((tool) =>
    isAvailable(tool.value),
  ).map((tool) => tool.value);
  const allSelected =
    supportedToolValues.length > 0 &&
    supportedToolValues.every((tool) => tools.includes(tool));

  const speciesLabelText =
    SPECIES_OPTIONS.find((option) => option.value === species)?.label ?? "this species";

  // Drop selected tools that are not available for the current species
  // (e.g. after switching species).
  useEffect(() => {
    const filtered = tools.filter((tool) => isToolSupportedForSpecies(tool, species));
    if (filtered.length !== tools.length) {
      setTools(filtered);
    }
  }, [species, tools, setTools]);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Select Prediction Tools</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Choose at least one tool. TargetScan runs on the gene pool only — it&apos;s automatically
          skipped for lncRNA targets.
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
                const unavailableReason = !supported
                  ? `Not available for ${speciesLabelText}`
                  : null;
                const checked = supported && tools.includes(tool.value);
                const isTargetscan = tool.value === TARGETSCAN_TOOL;

                return (
                  <tr
                    key={tool.value}
                    className={`border-b border-zinc-100 last:border-b-0 ${supported ? "" : "bg-zinc-50/60"}`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                      <label
                        title={unavailableReason ?? undefined}
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
                      </label>
                    </td>
                    <td className={`px-4 py-3 text-sm ${supported ? "text-zinc-600" : "text-zinc-400"}`}>
                      {tool.description}
                      {isTargetscan ? (
                        <span className="ml-1 text-xs italic text-zinc-500">
                          (gene targets only)
                        </span>
                      ) : null}
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
          Back: ceRNA Pairs
        </Button>
        <Button color="primary" onPress={next} isDisabled={!tools.length}>
          Next: Configuration
        </Button>
      </div>
    </section>
  );
}
