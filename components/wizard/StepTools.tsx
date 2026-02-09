"use client";

import { Accordion, AccordionItem, Button, Checkbox, CheckboxGroup } from "@heroui/react";

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
          Select one or more tools. Tool-level scores are stored verbatim for downstream analysis.
        </p>
      </div>

      <CheckboxGroup
        label="Prediction tools"
        value={tools}
        onValueChange={(nextTools) => {
          const nextSet = new Set(nextTools);
          const currentSet = new Set(tools);

          for (const tool of TOOL_OPTIONS) {
            const inNext = nextSet.has(tool.value);
            const inCurrent = currentSet.has(tool.value);
            if (inNext !== inCurrent) {
              toggleTool(tool.value);
            }
          }
        }}
      >
        {TOOL_OPTIONS.map((tool) => (
          <Checkbox key={tool.value} value={tool.value}>
            <span className="flex flex-col">
              <span>{tool.label}</span>
              <span className="text-xs font-normal text-zinc-500">{tool.description}</span>
            </span>
          </Checkbox>
        ))}
      </CheckboxGroup>

      <Accordion variant="splitted">
        <AccordionItem
          key="tool-options"
          aria-label="Advanced tool options"
          title="Advanced tool options"
          subtitle="Collapsed by default"
        >
          <p className="text-sm text-zinc-600">
            Tool-level thresholds and compatibility toggles can be exposed here when backend
            contracts are finalized.
          </p>
        </AccordionItem>
      </Accordion>

      <div className="flex flex-wrap gap-3">
        <Button variant="flat" onPress={back}>
          Back
        </Button>
        <Button color="primary" onPress={next} isDisabled={!tools.length}>
          Next: Species
        </Button>
      </div>
    </section>
  );
}
