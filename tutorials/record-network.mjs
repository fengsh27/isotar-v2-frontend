// Records the two miR-Network tutorial clips shown on /docs/mir-network by
// driving a running isoTar site with Playwright:
//
//   network-setup    the wizard, from species to Start Job
//   network-results  the finished job: graph, pair table, score, verification
//
// The job submitted in the first clip is the one shown in the second; the wait
// for it to finish is not recorded. Settings and output files: see clip.mjs.
//
// Usage:  npm install && npm run record:network

import { BASE, runRecording, sleep, startClip, waitForJob } from "./clip.mjs";

// Example inputs. The correlations are illustrative, and the captions say so.
const MIRNA = "hsa-miR-141-5p";
const PAIRS = [
  "gene,lncRNA,corr_mirna_gene,corr_mirna_lncrna,corr_gene_lncrna",
  "QKI, ENST00000651976, 0.62, 0.55, 0.71",
  "FMO2, ENST00000668474, , 0.48, 0.66",
].join("\n");

async function recordSetup(browser) {
  const clip = await startClip(browser);
  const { page } = clip;
  await page.goto(`${BASE}/network`, { waitUntil: "domcontentloaded" });
  await page.getByText("Choose Species").waitFor();
  await clip.say("miR-Network tests ceRNA hypotheses: does one miRNA bridge your gene–lncRNA pairs?", 3500);

  await clip.say("Step 1: choose the species. For human, also choose the genome reference; we use hg38.");
  const species = page.getByRole("combobox", { name: "Species" });
  await clip.moveTo(species);
  await species.selectOption("9606");
  await sleep(600);
  await clip.moveTo(page.getByText("hg38", { exact: true }));
  await page.getByRole("radio", { name: "hg38" }).check();
  await sleep(500);
  await clip.click(page.getByRole("button", { name: "Next: miRNA" }));

  await page.getByPlaceholder("e.g. miR-21").waitFor();
  await clip.say("Step 2: pick exactly one miRNA. Type part of its name to filter the catalog.");
  await clip.type(page.getByPlaceholder("e.g. miR-21"), "miR-141-5p", 70);
  await clip.click(page.getByRole("button", { name: MIRNA, exact: true }));
  await clip.moveTo(page.getByRole("button", { name: "+ Add variant" }));
  await clip.say("Optional: add shifted or modified variants to compare with the wild type in the same job.");
  await clip.click(page.getByRole("button", { name: "Next: ceRNA Pairs" }));

  const pairsBox = page.getByLabel("Pairs (one per line)");
  await pairsBox.waitFor();
  await clip.say("Step 3: paste gene–lncRNA pairs, one per line. lncRNAs must be Ensembl transcript IDs (ENST…).", 3500);
  await clip.type(pairsBox, PAIRS, 18);
  await clip.say("Correlations are optional magnitudes from 0 to 1 (these are example values). An empty column counts as 1.", 3500);
  await page.getByText("What will be submitted", { exact: true }).waitFor();
  await clip.moveTo(page.getByRole("cell", { name: "1(default)" }));
  await clip.poster("network-setup");
  await clip.say("'What will be submitted' shows exactly how each line was read.");
  await clip.click(page.getByRole("button", { name: "Next: Configuration" }));

  await page.getByText("Configure Job").waitFor();
  await clip.say("Step 4: the default settings suit almost every job.");
  await clip.click(page.getByRole("button", { name: "Next: Review & Run" }));

  await page.getByRole("button", { name: "Start Job" }).waitFor();
  await clip.say("Step 5: review the job before starting it.");
  await clip.moveTo(page.getByText("Tools:", { exact: true }));
  await clip.say("Every tool available for the species runs, so ceRNA scores are comparable between jobs.", 3000);
  await clip.click(page.getByRole("button", { name: "Start Job" }));

  await page.waitForURL(/\/jobs\/[0-9a-f-]{36}/);
  const jobId = page.url().match(/\/jobs\/([0-9a-f-]{36})/)[1];
  await page.getByText(/Status:/).first().waitFor();
  await clip.say("The job runs in the background. Keep this page's link to come back to the result.", 4000);
  await clip.moveTo(page.getByRole("heading", { level: 1 }));
  await sleep(2500);
  await clip.finish("network-setup");
  return jobId;
}

async function recordResults(browser, jobId) {
  const clip = await startClip(browser);
  const { page } = clip;
  await page.goto(`${BASE}/jobs/${jobId}`, { waitUntil: "domcontentloaded" });
  await page.getByText("Min. ceRNA score").first().waitFor();
  await sleep(2500); // let the graph lay out

  await clip.moveTo(page.locator("canvas").last());
  await clip.poster("network-results");
  await clip.say("The network shows only the pairs the miRNA bridges: genes, the miRNA and lncRNAs.", 3500);
  await clip.moveTo(page.getByText("Edge thickness ∝ tool consensus."));
  await clip.say("Edge thickness shows how many prediction tools agree.");

  await clip.moveTo(page.getByRole("columnheader", { name: "ceRNA score" }));
  await clip.say("Each bridged pair gets a ceRNA score from your correlations and the tool agreement on both sides.", 3500);
  await clip.moveTo(page.getByText("How the ceRNA score is computed").first());
  await clip.say("The formula is shown under the table. A pair's score is always the wild type's.", 3000);

  const slider = page.getByRole("slider", { name: /Min\. ceRNA score/ });
  await clip.moveTo(slider);
  await clip.say("Raise Min. ceRNA score to hide weaker pairs; the graph and table stay in step.");
  await slider.focus();
  // Step 0.01: 0.17 hides the weaker pairs of this example.
  for (let i = 0; i < 17; i++) {
    await page.keyboard.press("ArrowRight");
    await sleep(160);
  }
  await sleep(1200);
  await clip.scrollTo(page.getByRole("columnheader", { name: "ceRNA score" }));
  await sleep(1500);
  await clip.scrollTo(slider);
  await page.keyboard.press("Home");
  await sleep(800);

  await clip.moveTo(page.getByRole("button", { name: "Download Results (.zip)" }));
  await clip.say("Download the predictions for your pairs' targets as a zip.");

  await clip.moveTo(page.getByRole("button", { name: "Verify against literature" }));
  await clip.say("For human jobs, check each gene–miRNA–lncRNA axis against PubMed.", 3500);
  await clip.finish("network-results");
}

await runRecording(async (browser) => {
  const jobId = await recordSetup(browser);
  console.log(`  job ${jobId} submitted; waiting for it to finish (not recorded)…`);
  await waitForJob(jobId);
  await recordResults(browser, jobId);
});
