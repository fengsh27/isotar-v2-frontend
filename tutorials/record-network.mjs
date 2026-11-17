// Records the two miR-Network tutorial clips shown on /docs/mir-network by
// driving a running isoTar site with Playwright:
//
//   network-setup    the wizard, from species to Start Job
//   network-results  the finished job: graph, pair table, score, verification
//
// Each clip is written to public/videos as <name>.webm, <name>.vtt (captions
// timed to the steps) and <name>.jpg (the poster shown before playback; a
// clip's first frames are a blank page still loading). The job submitted in the first clip is the one
// shown in the second; the wait for it to finish is not recorded.
//
//   ISOTAR_URL  site to record (default http://127.0.0.1:9501)
//   OUT_DIR     output directory (default ../public/videos)
//   ZOOM        page zoom, so the UI stays legible when the clip is shown in a
//               docs column (default 1.15)
//
// Usage:  npm install && npm run record:network

import { chromium } from "playwright";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = (process.env.ISOTAR_URL || "http://127.0.0.1:9501").replace(/\/$/, "");
const OUT = path.resolve(process.env.OUT_DIR || path.join(HERE, "../public/videos"));
const RAW = path.join(HERE, ".raw");
const SIZE = { width: 1280, height: 720 };
const ZOOM = Number(process.env.ZOOM || 1.15);

// Example inputs. The correlations are illustrative, and the captions say so.
const MIRNA = "hsa-miR-141-5p";
const PAIRS = [
  "gene,lncRNA,corr_mirna_gene,corr_mirna_lncrna,corr_gene_lncrna",
  "QKI, ENST00000651976, 0.62, 0.55, 0.71",
  "FMO2, ENST00000668474, , 0.48, 0.66",
].join("\n");

// A visible cursor and a ripple on every click, since headless video shows no
// pointer of its own.
const CURSOR_SCRIPT = `
  window.addEventListener("DOMContentLoaded", () => {
    document.documentElement.style.zoom = "${ZOOM}";
    const style = document.createElement("style");
    style.textContent = \`
      #tut-cursor { position: fixed; left: 0; top: 0; width: 22px; height: 22px; margin: -11px 0 0 -11px;
        border-radius: 50%; background: rgba(13,148,136,.25); border: 2px solid #0f766e;
        pointer-events: none; z-index: 2147483647; transition: transform .12s ease-out; }
      #tut-cursor.down { transform: scale(.7); }
      .tut-ripple { position: fixed; width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 50%;
        border: 3px solid #0f766e; pointer-events: none; z-index: 2147483646; animation: tut-ripple .6s ease-out forwards; }
      @keyframes tut-ripple { to { transform: scale(3); opacity: 0; } }
    \`;
    document.head.appendChild(style);
    const dot = document.createElement("div");
    dot.id = "tut-cursor";
    document.body.appendChild(dot);
    window.addEventListener("mousemove", (e) => { dot.style.left = e.clientX + "px"; dot.style.top = e.clientY + "px"; }, true);
    window.addEventListener("mousedown", (e) => {
      dot.classList.add("down");
      const r = document.createElement("div");
      r.className = "tut-ripple";
      r.style.left = e.clientX + "px"; r.style.top = e.clientY + "px";
      document.body.appendChild(r);
      setTimeout(() => r.remove(), 700);
    }, true);
    window.addEventListener("mouseup", () => dot.classList.remove("down"), true);
  });
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** One recorded clip: a page, its caption cues and the helpers that animate it. */
async function startClip(browser) {
  const context = await browser.newContext({
    viewport: SIZE,
    recordVideo: { dir: RAW, size: SIZE },
  });
  await context.addInitScript(CURSOR_SCRIPT);
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const t0 = Date.now(); // recording starts with the page
  const cues = [];
  let mouse = { x: SIZE.width / 2, y: SIZE.height / 2 };

  const now = () => Date.now() - t0;
  const closeCue = () => {
    if (cues.length && cues[cues.length - 1].end == null) cues[cues.length - 1].end = now();
  };

  return {
    page,
    /** Show a caption and hold long enough to read it (~3 words a second). */
    async say(text, minHold = 2200) {
      closeCue();
      cues.push({ start: now(), end: null, text });
      await sleep(Math.max(minHold, text.split(/\s+/).length * 330));
    },
    async scrollTo(locator) {
      await locator.evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }));
      await sleep(800);
    },
    /** Glide the cursor to the centre of an element. */
    async moveTo(locator) {
      await this.scrollTo(locator);
      const box = await locator.boundingBox();
      if (!box) return;
      const to = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      await page.mouse.move(mouse.x, mouse.y);
      await page.mouse.move(to.x, to.y, { steps: 22 });
      mouse = to;
      await sleep(250);
    },
    async click(locator) {
      await this.moveTo(locator);
      await page.mouse.down();
      await sleep(90);
      await page.mouse.up();
      await sleep(500);
    },
    /** Save the current view as the clip's poster image. */
    async poster(name) {
      await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: "jpeg", quality: 82 });
    },
    async type(locator, text, delay = 35) {
      await this.click(locator);
      await locator.pressSequentially(text, { delay });
      await sleep(400);
    },
    /** Close the clip, then move its video and captions into OUT. */
    async finish(name) {
      closeCue();
      await sleep(600);
      const video = page.video();
      await context.close();
      await video.saveAs(path.join(OUT, `${name}.webm`));
      writeFileSync(path.join(OUT, `${name}.vtt`), toVtt(cues));
      console.log(`  ✓ ${name}.webm + ${name}.vtt (${(now() / 1000).toFixed(0)} s, ${cues.length} captions)`);
    },
  };
}

function stamp(ms) {
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms % 1000, 3)}`;
}

function toVtt(cues) {
  const body = cues.map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`).join("\n");
  return `WEBVTT\n\n${body}`;
}

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

async function waitForJob(jobId) {
  for (let i = 0; i < 120; i++) {
    const res = await fetch(`${BASE}/api/v1/jobs/${jobId}`);
    const { status } = await res.json();
    if (status === "succeeded") return;
    if (status === "failed" || status === "killed") throw new Error(`job ${jobId} ${status}`);
    await sleep(5000);
  }
  throw new Error(`job ${jobId} did not finish within 10 minutes`);
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

mkdirSync(OUT, { recursive: true });
rmSync(RAW, { recursive: true, force: true });
const browser = await chromium.launch();
try {
  console.log(`Recording against ${BASE}`);
  const jobId = await recordSetup(browser);
  console.log(`  job ${jobId} submitted; waiting for it to finish (not recorded)…`);
  await waitForJob(jobId);
  await recordResults(browser, jobId);
} finally {
  await browser.close();
  rmSync(RAW, { recursive: true, force: true });
}
