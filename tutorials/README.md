# isoTar tutorial videos

Scripted screen recordings for the docs (`app/docs`). Each clip is made by
driving a running isoTar site with Playwright, so it can be re-recorded with one
command whenever the UI changes. No hand editing.

| Clip | Shown on | Covers |
|---|---|---|
| `network-setup` | `/docs/mir-network` | The miR-Network wizard, from species to Start Job |
| `network-results` | `/docs/mir-network` | The finished job: graph, pair table, ceRNA score, verification |
| `target-setup` | `/docs/mir-target` | The miR-Target wizard, from species to Start Job |
| `target-results` | `/docs/mir-target` | Predicted targets: consensus, UpSet, search; starting enrichment |
| `target-enrichment` | `/docs/mir-target` | Enrichment results: databases, terms, dotplot |

Each clip produces three files in `public/videos/`:

- `<name>.webm`: the video (1280×720, about 1 MB per 15 s)
- `<name>.vtt`: captions, timed to the steps and shown by default
- `<name>.jpg`: the poster shown before playback

## Re-record

```bash
cd tutorials
npm install                          # once; Playwright reuses the cached Chromium
ISOTAR_URL=http://127.0.0.1:9501 npm run record:network
ISOTAR_URL=http://127.0.0.1:9501 npm run record:target
```

Each script **submits one real job** to `ISOTAR_URL` and records its result once
it finishes; waits are not recorded.

- `record:network`: hsa-miR-141-5p with two ceRNA pairs on hg38. About 3–4 minutes.
- `record:target`: hsa-let-7a-5p on hg38 with four tools (miRanda, miRmap,
  TargetScan, DMISO), then an enrichment run on it. About 12 minutes, most of it
  the job. RNAhybrid is left out on purpose: it alone takes close to an hour
  genome-wide.

To redo only the enrichment clip on a job whose enrichment has already run (no
new job): `JOB_ID=<job id> node record-target.mjs enrichment`.

Environment variables:

- `ISOTAR_URL`: site to record (default `http://127.0.0.1:9501`)
- `OUT_DIR`: output directory (default `../public/videos`)
- `ZOOM`: page zoom (default `1.15`), so the UI stays legible when the clip
  is shown in a docs column

## Changing a clip

The steps and captions live in `record-network.mjs` and `record-target.mjs`; the
shared cursor, caption and clip helpers are in `clip.mjs`. `say()` shows a caption,
and `moveTo()` / `click()` / `type()` animate the cursor. After a UI change,
update the locators (button names, labels), re-record, then check the result on
`/docs/mir-network`. The example correlations are illustrative, and the captions
say so; keep it that way if you change them.
