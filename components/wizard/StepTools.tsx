"use client";

import { Button } from "@heroui/react";

import { TOOL_OPTIONS } from "@/lib/constants";
import { useWizardStore } from "@/stores/wizardStore";

export function StepTools() {
  const tools = useWizardStore((state) => state.tools);
  const toggleTool = useWizardStore((state) => state.toggleTool);
  const next = useWizardStore((state) => state.next);
  const back = useWizardStore((state) => state.back);

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
                <th className="px-4 py-3 text-sm font-semibold text-zinc-800">Tool</th>
                <th className="px-4 py-3 text-sm font-semibold text-zinc-800">Description</th>
              </tr>
            </thead>
            <tbody>
              {TOOL_OPTIONS.map((tool) => {
                const checked = tools.includes(tool.value);

                return (
                  <tr key={tool.value} className="border-b border-zinc-100 last:border-b-0">
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                      <label className="inline-flex cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTool(tool.value)}
                          className="h-4 w-4 rounded border-zinc-400 text-teal-700 focus:ring-teal-600"
                        />
                        {tool.label}
                      </label>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{tool.description}</td>
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
