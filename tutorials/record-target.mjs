// Records the three miR-Target tutorial clips shown on /docs/mir-target by
// driving a running isoTar site with Playwright:
//
//   target-setup       the wizard, from species to Start Job
//   target-results     the finished job's predicted targets, ending with an
//                      enrichment run being started
//   target-enrichment  the finished enrichment: databases, terms, dotplot
//
// The job submitted in the first clip is the one shown in the others. Waiting
// for the job (about 7 minutes with the four tools chosen) and for enrichment
// (about a minute) is not recorded. Settings and output files: see clip.mjs.
//
// Usage:  npm install && npm run record:target
//
// To redo only the enrichment clip on a finished job whose enrichment has
// already run (no new job is submitted):
//         JOB_ID=<job id> node record-target.mjs enrichment

import { BASE, runRecording, sleep, startClip, waitForJob } from "./clip.mjs";

// let-7a-5p has well-known targets; HMGA2 is predicted by three of the four
// tools below, so the search in the results clip finds a strong hit.
const MIRNA = "hsa-let-7a-5p";
const KNOWN_TARGET = "HMGA2";
// The four fastest tools on a genome-wide run. RNAhybrid alone took ~50 min for
// this miRNA, which would make re-recording impractical; the caption says why
// only four are chosen.
const TOOLS = ["miRanda", "miRmap", "TargetScan", "DMISO"];

async function recordSetup(browser) {
  const clip = await startClip(browser);
  const { page } = clip;
  await page.goto(`${BASE}/run?workflow=mir-target&new=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("combobox", { name: "Species" }).waitFor();
  await clip.say("miR-Target predicts the genes a miRNA targets with several tools, and shows where the tools agree.", 3500);

  await clip.say("Step 1: choose the species. For human, also choose the genome reference; we use hg38.");
  const species = page.getByRole("combobox", { name: "Species" });
  await clip.moveTo(species);
  await species.selectOption("9606");
  await sleep(600);
  await clip.moveTo(page.getByText("hg38", { exact: true }));
  await page.getByRole("radio", { name: "hg38" }).check();
  await sleep(500);
  await clip.click(page.getByRole("button", { name: "Next: miRNA" }));

  const filter = page.getByPlaceholder(/Type to filter/);
  await filter.waitFor();
  await clip.say("Step 2: pick the miRNA from the catalog. Type part of its name to filter.");
  await clip.type(filter, "let-7a-5p", 70);
  await clip.click(page.getByRole("button", { name: MIRNA, exact: true }));
  await clip.moveTo(page.getByRole("heading", { name: "miRNA Summary" }));
  await clip.say("The summary shows the mature sequence and where it sits on its precursor.");
  await clip.moveTo(page.getByRole("button", { name: "Custom Sequence" }));
  await clip.say("Or choose Custom Sequence to paste your own mature sequence (17–30 nt).");
  await clip.click(page.getByRole("button", { name: "Next: Operation" }));

  await page.getByRole("spinbutton", { name: "Left Shift" }).waitFor();
  await clip.say("Step 3 (optional): shift the mature sequence along its precursor, or change single bases.", 3000);
  await clip.moveTo(page.getByRole("spinbutton", { name: "Left Shift" }));
  await clip.say("Each variant is predicted alongside the wild type and can be compared with it. We keep the wild type here.", 3500);
  await clip.click(page.getByRole("button", { name: "Next: Modification" }));
  await clip.moveTo(page.getByRole("button", { name: "+ Add modification" }));
  await sleep(800);
  await clip.click(page.getByRole("button", { name: "Next: Prediction Tools" }));

  await page.getByRole("heading", { name: "Select Prediction Tools" }).waitFor();
  await clip.say("Step 4: choose the prediction tools. More tools give a stronger consensus.");
  for (const tool of TOOLS) {
    await clip.moveTo(page.getByRole("cell", { name: tool, exact: true }));
    await page.getByRole("checkbox", { name: tool, exact: true }).check();
    await sleep(350);
  }
  await clip.poster("target-setup");
  await clip.say("To keep this example quick we choose four. RNAhybrid takes the longest on a genome-wide run.", 3500);
  await clip.click(page.getByRole("button", { name: "Next: Configuration" }));

  const selectTarget = page.getByRole("button", { name: /Select Target \(optional\)/ });
  await selectTarget.waitFor();
  await clip.moveTo(selectTarget);
  await clip.say("Step 5: optionally limit predictions to genes you name. We predict genome-wide, which enrichment needs.", 3500);
  await clip.click(page.getByRole("button", { name: "Next: Review & Run" }));

  await page.getByRole("button", { name: "Start Job" }).waitFor();
  await clip.say("Step 6: review the job, then start it.");
  await clip.click(page.getByRole("button", { name: "Start Job" }));

  await page.waitForURL(/\/jobs\/[0-9a-f-]{36}/);
  const jobId = page.url().match(/\/jobs\/([0-9a-f-]{36})/)[1];
  await page.getByText(/Status:/).first().waitFor();
  await clip.moveTo(page.getByRole("progressbar").first());
  await clip.say("The job runs in the background and shows each tool's progress. Keep this page's link to come back.", 4000);
  await sleep(1500);
  await clip.finish("target-setup");
  return jobId;
}

async function recordResults(browser, jobId) {
  const clip = await startClip(browser);
  const { page } = clip;
  await page.goto(`${BASE}/jobs/${jobId}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Results" }).waitFor();
  await page.getByText("Consensus — targets by tool agreement").waitFor();
  await sleep(2000);

  await clip.moveTo(page.getByText("Consensus — targets by tool agreement"));
  await clip.poster("target-results");
  await clip.say("Consensus: how many targets at least 1, 2, 3 … of the tools predict.");
  await clip.moveTo(page.getByText("Tool overlap (UpSet)"));
  await clip.say("The UpSet plot shows which tools agree: each column is one combination of tools.", 3500);

  const search = page.getByRole("textbox", { name: /Filter by gene label/ });
  await clip.type(search, KNOWN_TARGET, 90);
  await sleep(1200);
  await clip.say(`Search by gene symbol, gene name or tool. ${KNOWN_TARGET} is a well-known let-7 target.`, 3500);
  await clip.moveTo(page.getByRole("row", { name: new RegExp(`^\\d+ ${KNOWN_TARGET} \\(`) }).first());
  await clip.say("Each row lists the tools that predict the target.");
  await clip.click(page.getByRole("button", { name: "clear input" }));
  await sleep(1200);
  await clip.moveTo(page.getByRole("columnheader", { name: /TOOLS/ }));
  await clip.say("Targets are sorted by how many tools predict them, so the best-supported come first.");

  await clip.moveTo(page.getByRole("button", { name: "Download Results (.zip)" }));
  await clip.say("Download every prediction as a zip.");

  await clip.click(page.getByRole("tab", { name: "Enrichment" }));
  const run = page.getByRole("button", { name: "Run Enrichment Analysis" });
  await run.waitFor();
  await clip.say("Enrichment tests the predicted genes against pathway and gene-set databases (human, mouse and rat).", 3500);
  await clip.click(run);
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await clip.moveTo(dialog.getByText("Organism").first());
  await clip.say("The organism follows the job's species. Keep the adjusted P-value cutoff at 0.05 and run.", 3500);
  await clip.click(dialog.getByRole("button", { name: "Run", exact: true }));
  await page.getByText(/Enrichment is (queued|running)/).waitFor();
  await clip.moveTo(page.getByText(/Enrichment is (queued|running)/));
  await clip.say("Enrichment runs in the background and usually takes about a minute.", 3500);
  await clip.finish("target-results");
}

async function waitForEnrichment(jobId, minutes = 10) {
  for (let i = 0; i < minutes * 12; i++) {
    const res = await fetch(`${BASE}/api/v1/jobs/${jobId}/enrichment`);
    const body = await res.json().catch(() => ({}));
    if (body.status === "succeeded" || (!body.status && body.databases)) return;
    if (body.status === "failed") throw new Error(`enrichment failed: ${body.error ?? "unknown error"}`);
    await sleep(5000);
  }
  throw new Error(`enrichment did not finish within ${minutes} minutes`);
}

async function recordEnrichment(browser, jobId) {
  const clip = await startClip(browser);
  const { page } = clip;
  await page.goto(`${BASE}/jobs/${jobId}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "Enrichment" }).click();
  const tabs = page.getByRole("tablist", { name: "Enrichment databases" });
  await tabs.waitFor();
  await sleep(1500);

  await clip.moveTo(page.getByText(/Enrichment computed across/));
  await clip.say("The summary line records how many genes went in, the organism and the cutoff.", 3500);
  await clip.moveTo(tabs);
  await clip.poster("target-enrichment");
  await clip.say("Each tab is one database. The table lists the enriched terms, most significant first.", 3500);

  const tabList = tabs.getByRole("tab");
  if ((await tabList.count()) > 1) {
    await clip.click(tabList.nth(1));
    await sleep(1200);
    await clip.say("Switch tabs to see the terms from another database.");
  }
  await clip.moveTo(page.getByRole("columnheader", { name: "Genes" }));
  await clip.say("The Genes column lists the predicted targets behind each term.");

  const dotplot = page.getByRole("img", { name: "Enrichment dotplot" });
  if (await dotplot.count()) {
    await clip.moveTo(dotplot);
    await clip.say("The dotplot shows the top GO Biological Process terms: further right is more significant, a bigger dot means more genes.", 4000);
  }
  await clip.moveTo(page.getByRole("button", { name: "Re-run Enrichment" }));
  await clip.say("Re-run with a different cutoff at any time; the results are saved with the job.", 3500);
  await clip.finish("target-enrichment");
}

const mode = process.argv[2] ?? "all";
if (mode === "enrichment") {
  const jobId = process.env.JOB_ID;
  if (!jobId) throw new Error("set JOB_ID to a finished job whose enrichment has run");
  await runRecording((browser) => recordEnrichment(browser, jobId));
  process.exit(0);
}
if (mode !== "all") throw new Error(`unknown mode "${mode}" (use "enrichment" or nothing)`);

await runRecording(async (browser) => {
  const jobId = await recordSetup(browser);
  console.log(`  job ${jobId} submitted; waiting for it to finish (not recorded)…`);
  await waitForJob(jobId, 45);
  await recordResults(browser, jobId);
  console.log("  enrichment started; waiting for it to finish (not recorded)…");
  await waitForEnrichment(jobId);
  await recordEnrichment(browser, jobId);
});
