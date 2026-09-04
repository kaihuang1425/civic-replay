# Implementation notes — civic-replay-visual-assets

## Asset curation

Copied a curated subset of `reference/Civic-Replay-assets/` into `web/src/assets/`
per design.md's mapping tables (logo mark, 6 step SVGs, 3 status PNGs, 6
canonical persona avatars, 4 service-category icons, 3 empty-state cards +
`labels.zh-TW.json`, Lucide license notice).

**Deviation from design.md's size estimate**: the source `mobility-impaired.png`
persona avatar and the 3 empty-state cards ship at 1254×1254 (unlike the other
5 persona avatars, ~290×300) — up to 826 KB each, all displayed at 36–96 px in
the UI. Downscaled them with `sips -Z 400` (lossless dimensions-only resize,
no re-encode artifacts) before wiring them in:

| Asset | Before | After |
| --- | --- | --- |
| `personas/mobility-impaired.png` | 826.9 KB | 115.8 KB |
| `empty-states/create-scenario-card.png` | 383.3 KB | 52.5 KB |
| `empty-states/no-results-card.png` | 515.9 KB | 75.4 KB |
| `empty-states/start-simulation-card.png` | 343.3 KB | 53.3 KB |

Total `web/dist/assets/` after `npm -w web run build`: **1.1 MB** (was ~2.9 MB
before downscaling), corrected from design.md's original "<500 KB" estimate,
which didn't anticipate the size mismatch in the delivered pack.

## Task 9.2 — manual visual verification

Ran on 2026-09-04: `npm run dev` (server :8787 with a real Ollama
`gpt-oss:120b-cloud`, web via `vite`), then drove the app with a headless
Chrome (Playwright, dev-only tooling in the scratchpad — not a project
dependency) to click the "豪雨／淹水" template chip, wait for generation, run a
replay, and screenshot each stage.

Compared against `reference/ui.jpg`:

- ✅ **Brand mark**: the play-button ribbon logo renders in the header next to
  "Civic Replay", matching the reference.
- ✅ **Step icons**: all 6 steps show their mapped Lucide icon (bell / lightbulb
  / branch / download / person / bar-chart) crisply at small size, plus a
  status icon+label under a step once a replay has run (e.g. ❌ 失敗 under a
  BLOCKED alert step).
- ✅ **Persona avatars**: all 6 canonical personas render their illustrated
  avatar (elderly woman, hijab-wearing new immigrant, wheelchair user, etc.) in
  a circular frame, matching the reference's persona-card treatment closely.
- ✅ **Template chips**: each of the 4 mapped templates shows its category icon;
  the flood/disaster-relief chips both correctly show the same public-safety
  icon.
- ✅ **Status icons**: replay result rows show the completed/blocker/failed icon
  next to the colour dot.
- ✅ **Empty states**: verified all 3 — "尚未建立情境" (document icon) before any
  sandbox, "還沒有模擬紀錄" (sprout icon, "開始模擬" button) before a replay, and
  the create/run flow transitions between them correctly.
- No console errors or failed asset requests during the run.

One pre-existing (out-of-scope) observation: the step sub-label still shows the
raw `kind` string (e.g. "alert") next to the icon — that's existing behavior
from before this change, not something this change's spec touches.

## Task 9.3 — spec validation

`openspec validate --changes "civic-replay-visual-assets"` passes.
