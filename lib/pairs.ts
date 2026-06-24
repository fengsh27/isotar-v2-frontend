import type { NetworkPairInput } from "@/lib/types";

/** Parse a pasted pairs block: one "GENE<sep>LNCRNA" per line (tab/comma/space
 * separated). Blank lines and a leading header line are tolerated. */
export function parsePairs(text: string): NetworkPairInput[] {
  const pairs: NetworkPairInput[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const parts = line.split(/[\t,]|\s{1,}/).filter(Boolean);
    if (parts.length < 2) continue;
    const gene = parts[0].trim();
    const lncrna = parts[1].trim();
    if (/^gene$/i.test(gene) && /^lncrna$/i.test(lncrna)) continue;
    if (gene && lncrna) pairs.push({ gene, lncrna });
  }
  return pairs;
}
