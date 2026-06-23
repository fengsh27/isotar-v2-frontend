"use client";

import { useEffect, useRef } from "react";
import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import { Button } from "@heroui/react";

import type { NetworkEdge, NetworkNode } from "@/lib/types";

interface Props {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

const TYPE_COLOR: Record<string, string> = {
  gene: "#0f766e", // teal-700
  mirna: "#b45309", // amber-700
  lncrna: "#7c3aed", // violet-600
};

// Columns of the tripartite layout: genes left, miRNAs center, lncRNAs right.
const COLUMN_X: Record<string, number> = { gene: 0, mirna: 460, lncrna: 920 };
const ROW_GAP = 46;

function buildElements(nodes: NetworkNode[], edges: NetworkEdge[]): ElementDefinition[] {
  // Lay out each column independently, vertically centered, so the three
  // partitions read left-to-right with miRNAs bridging the middle.
  const byType: Record<string, NetworkNode[]> = { gene: [], mirna: [], lncrna: [] };
  for (const n of nodes) (byType[n.type] ?? (byType[n.type] = [])).push(n);

  const els: ElementDefinition[] = [];
  for (const type of ["gene", "mirna", "lncrna"] as const) {
    const col = byType[type] ?? [];
    const height = (col.length - 1) * ROW_GAP;
    col.forEach((n, i) => {
      els.push({
        data: { id: n.id, label: n.label, type: n.type, title: n.name ?? n.label },
        position: { x: COLUMN_X[type], y: i * ROW_GAP - height / 2 },
      });
    });
  }
  for (const e of edges) {
    els.push({
      data: {
        id: `${e.source}__${e.target}__${e.side}`,
        source: e.source,
        target: e.target,
        weight: e.tool_count,
        tools: e.tools.join(", "),
      },
    });
  }
  return els;
}

export function NetworkGraph({ nodes, edges }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const cy = cytoscape({
      container: containerRef.current,
      elements: buildElements(nodes, edges),
      layout: { name: "preset", fit: true, padding: 30 },
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "font-size": 9,
            color: "#27272a",
            "text-valign": "center",
            width: 14,
            height: 14,
          },
        },
        {
          selector: 'node[type="gene"]',
          style: { "background-color": TYPE_COLOR.gene, "text-halign": "left", "text-margin-x": -4 },
        },
        {
          selector: 'node[type="mirna"]',
          style: { "background-color": TYPE_COLOR.mirna, "text-halign": "center" },
        },
        {
          selector: 'node[type="lncrna"]',
          style: { "background-color": TYPE_COLOR.lncrna, "text-halign": "right", "text-margin-x": 4 },
        },
        {
          selector: "edge",
          style: {
            width: "mapData(weight, 1, 6, 1.5, 6)",
            "line-color": "#cbd5e1",
            "curve-style": "bezier",
            opacity: 0.7,
          },
        },
        {
          selector: "node:selected",
          style: { "border-width": 3, "border-color": "#0d9488" },
        },
      ],
      minZoom: 0.1,
      maxZoom: 3,
      wheelSensitivity: 0.2,
    });
    cyRef.current = cy;
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [nodes, edges]);

  function exportPng() {
    const cy = cyRef.current;
    if (!cy) return;
    const uri = cy.png({ full: true, scale: 2, bg: "#ffffff" });
    const a = document.createElement("a");
    a.href = uri;
    a.download = "isotar-network.png";
    a.click();
  }

  return (
    <div className="relative">
      <div className="absolute right-2 top-2 z-10 flex gap-2">
        <Button size="sm" variant="flat" onPress={() => cyRef.current?.fit(undefined, 30)}>
          Fit
        </Button>
        <Button size="sm" variant="flat" onPress={exportPng}>
          Export PNG
        </Button>
      </div>
      <div
        ref={containerRef}
        className="h-[520px] w-full rounded-xl border border-zinc-200 bg-white"
      />
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-zinc-600">
        {(["gene", "mirna", "lncrna"] as const).map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: TYPE_COLOR[t] }}
            />
            {t === "mirna" ? "miRNA" : t === "lncrna" ? "lncRNA" : "gene"}
          </span>
        ))}
        <span className="text-zinc-400">Edge thickness ∝ tool consensus.</span>
      </div>
    </div>
  );
}
