// Shared helpers for the tutorial recorders (record-*.mjs): settings, the
// on-screen cursor, one recorded clip with timed captions, and the run wrapper.
//
//   ISOTAR_URL  site to record (default http://127.0.0.1:9501)
//   OUT_DIR     output directory (default ../public/videos)
//   ZOOM        page zoom, so the UI stays legible when the clip is shown in a
//               docs column (default 1.15)
//
// Each clip is written to OUT_DIR as <name>.webm, <name>.vtt (captions timed to
// the steps) and <name>.jpg (the poster shown before playback; a clip's first
// frames are a blank page still loading).

import { chromium } from "playwright";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const BASE = (process.env.ISOTAR_URL || "http://127.0.0.1:9501").replace(/\/$/, "");
export const OUT = path.resolve(process.env.OUT_DIR || path.join(HERE, "../public/videos"));
export const RAW = path.join(HERE, ".raw");
export const SIZE = { width: 1280, height: 720 };
export const ZOOM = Number(process.env.ZOOM || 1.15);

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

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** One recorded clip: a page, its caption cues and the helpers that animate it. */
export async function startClip(browser) {
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

export async function waitForJob(jobId, minutes = 10) {
  for (let i = 0; i < minutes * 12; i++) {
    const res = await fetch(`${BASE}/api/v1/jobs/${jobId}`);
    const { status } = await res.json();
    if (status === "succeeded") return;
    if (status === "failed" || status === "killed") throw new Error(`job ${jobId} ${status}`);
    await sleep(5000);
  }
  throw new Error(`job ${jobId} did not finish within ${minutes} minutes`);
}

/** Launch Chromium, run `record(browser)`, and always clean up raw video. */
export async function runRecording(record) {
  mkdirSync(OUT, { recursive: true });
  rmSync(RAW, { recursive: true, force: true });
  const browser = await chromium.launch();
  try {
    console.log(`Recording against ${BASE}`);
    await record(browser);
  } finally {
    await browser.close();
    rmSync(RAW, { recursive: true, force: true });
  }
}
