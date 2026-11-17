# isoTar tutorial videos

Scripted screen recordings for the docs (`app/docs`). Each clip is made by
driving a running isoTar site with Playwright, so it can be re-recorded with one
command whenever the UI changes. No hand editing.

| Clip | Shown on | Covers |
|---|---|---|
| `network-setup` | `/docs/mir-network` | The miR-Network wizard, from species to Start Job |
| `network-results` | `/docs/mir-network` | The finished job: graph, pair table, ceRNA score, verification |

Each clip produces three files in `public/videos/`:

- `<name>.webm`: the video (1280×720, about 1 MB per 15 s)
- `<name>.vtt`: captions, timed to the steps and shown by default
- `<name>.jpg`: the poster shown before playback

## Re-record

```bash
cd tutorials
npm install                          # once; Playwright reuses the cached Chromium
ISOTAR_URL=http://127.0.0.1:9501 npm run record:network
```

The script **submits one real network job** to `ISOTAR_URL` (hsa-miR-141-5p,
two ceRNA pairs, hg38) and records its result once it finishes. The wait is not
recorded. A run takes about 3–4 minutes.

Environment variables:

- `ISOTAR_URL`: site to record (default `http://127.0.0.1:9501`)
- `OUT_DIR`: output directory (default `../public/videos`)
- `ZOOM`: page zoom (default `1.15`), so the UI stays legible when the clip
  is shown in a docs column

## Changing a clip

The steps and captions live in `record-network.mjs`: `say()` shows a caption,
and `moveTo()` / `click()` / `type()` animate the cursor. After a UI change,
update the locators (button names, labels), re-record, then check the result on
`/docs/mir-network`. The example correlations are illustrative, and the captions
say so; keep it that way if you change them.
