"use client";

import { Button, Card, CardBody, CardHeader, Tab, Tabs } from "@heroui/react";

import type { JobResultsData } from "@/lib/types";

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function renderRecordArray(records: Record<string, unknown>[] | undefined) {
  if (!records || records.length === 0) {
    return <p className="text-sm text-zinc-600">No records returned.</p>;
  }

  const columns = Array.from(
    records.slice(0, 10).reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-xs">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-600">
            {columns.map((column) => (
              <th key={column} className="px-2 py-2 font-semibold uppercase tracking-wide">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.slice(0, 10).map((row, index) => (
            <tr key={index} className="border-b border-zinc-100">
              {columns.map((column) => (
                <td key={`${index}-${column}`} className="px-2 py-2 text-zinc-700">
                  {stringifyValue(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {records.length > 10 ? (
        <p className="mt-2 text-xs text-zinc-500">Showing first 10 rows.</p>
      ) : null}
    </div>
  );
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(href);
}

export function JobResults({ results }: { results?: JobResultsData }) {
  const targetCount = results?.predicted_targets?.length ?? 0;
  const enrichedCount = results?.enrichment?.length ?? 0;
  const toolsUsed =
    typeof results?.summary?.tools_used === "number"
      ? results.summary.tools_used
      : typeof results?.summary?.tools_count === "number"
        ? results.summary.tools_count
        : "N/A";

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white/85 p-4">
      <h2 className="mb-3 text-xl font-semibold text-zinc-900">Results</h2>
      <Tabs aria-label="Result sections" variant="underlined">
        <Tab key="summary" title="Summary">
          <div className="mt-4 space-y-4">
            <Card className="border border-zinc-200 bg-white/80">
              <CardBody className="text-sm text-zinc-700">
                <p>• {targetCount} predicted targets</p>
                <p>• {toolsUsed} tools used</p>
                <p>• {enrichedCount} enriched pathways</p>
              </CardBody>
            </Card>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                [ Bar chart ]
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                [ Bubble plot ]
              </div>
            </div>

            <Card className="border border-zinc-200 bg-white/80">
              <CardHeader>
                <h3 className="text-base font-semibold text-zinc-900">Summary Payload</h3>
              </CardHeader>
              <CardBody>
                {results?.summary ? (
                  <pre className="overflow-x-auto text-xs text-zinc-700">
                    {JSON.stringify(results.summary, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-zinc-600">No summary payload returned.</p>
                )}
              </CardBody>
            </Card>
          </div>
        </Tab>

        <Tab key="targets" title="Targets">
          <Card className="mt-4 border border-zinc-200 bg-white/80">
            <CardHeader>
              <h3 className="text-base font-semibold text-zinc-900">Predicted Targets</h3>
            </CardHeader>
            <CardBody>{renderRecordArray(results?.predicted_targets)}</CardBody>
          </Card>
        </Tab>

        <Tab key="enrichment" title="Enrichment">
          <Card className="mt-4 border border-zinc-200 bg-white/80">
            <CardHeader>
              <h3 className="text-base font-semibold text-zinc-900">Enrichment</h3>
            </CardHeader>
            <CardBody>{renderRecordArray(results?.enrichment)}</CardBody>
          </Card>
        </Tab>

        <Tab key="downloads" title="Downloads">
          <Card className="mt-4 border border-zinc-200 bg-white/80">
            <CardBody className="flex flex-wrap gap-3">
              <Button
                variant="flat"
                onPress={() => downloadJson("isotar-summary.json", results?.summary ?? {})}
              >
                Download Summary
              </Button>
              <Button
                variant="flat"
                onPress={() =>
                  downloadJson("isotar-predicted-targets.json", results?.predicted_targets ?? [])
                }
              >
                Download Targets
              </Button>
              <Button
                variant="flat"
                onPress={() => downloadJson("isotar-enrichment.json", results?.enrichment ?? [])}
              >
                Download Enrichment
              </Button>
            </CardBody>
          </Card>
        </Tab>
      </Tabs>
    </section>
  );
}
