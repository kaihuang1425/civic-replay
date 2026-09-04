## Context

See `proposal.md` — Why/What Changes. Source material lives at
`reference/Civic-Replay-assets/` (gitignored — design working files, not
shipped code) with a `manifest.json` inventory and a `labels.zh-TW.json`
copy/label dictionary. This change selects the subset the console actually
uses, copies it into `web/src/assets/`, and wires it into the five affected
components (`SandboxFlow`, `Personas`, `ReplayView`, `GenerationSettings`, plus
a new shared `EmptyState`).

Two format families are provided:
- **PNG** (transparent, pre-composed): logo, persona avatars, service-category
  icons, status icons, empty-state art.
- **SVG** (Lucide-derived, `stroke="#0B1830"`, fixed navy): the 6 step/core
  icons this change uses.

## Goals / Non-Goals

**Goals:**
- Every element `reference/ui.jpg` shows as an icon or illustration on the
  actual console screen renders from the delivered asset, not emoji/CSS.
- No behavior change to data, API, or the replay/generation engines.
- Assets ship from `web/src/assets/` so the build has no runtime dependency on
  the gitignored `reference/` tree.
- Non-canonical personas degrade to the existing text/initial treatment, never
  a guessed avatar (per the user's explicit choice).

**Non-Goals:**
- Marketing illustrations, file-type icons, `misc-icons`, badges/brand-tags/
  ui-controls (not on the console screen; the latter three have no files on
  disk in the pack anyway).
- Re-theming the SVGs for dark mode or multiple accent colors — the console is
  light-themed only today (see `web/src/styles.css`).
- Any change to `shared/`, `server/`, or the replay/generation logic.

## Decisions

### 1. Copy a curated subset into `web/src/assets/`, not the whole pack

`reference/` is gitignored (design working files). Vite needs the files inside
`web/` to bundle them. Copy only what's referenced by the mapping tables below
into:

```
web/src/assets/
  logo/mark.png
  icons/{alert,understand,choose-channel,prepare,verify-identity,obtain-result}.svg
  status/{completed,blocker,failed}.png
  personas/{office-worker,senior-living-alone,new-resident,mobility-impaired,low-digital-literacy,family-representative}.png
  categories/{public-safety,social-welfare,healthcare,housing}.png
  empty-states/{create-scenario-card,no-results-card,start-simulation-card}.png
  THIRD_PARTY_NOTICES.md   (points at Lucide MIT license for the icons/ SVGs)
```

Renaming PNG/SVG files to the step-kind / category keys used in code (rather
than keeping the source `core-icons/process-flow.svg`-style names) keeps the
lookup tables below a direct 1:1 map with no separate alias layer.

_Alternative considered:_ import directly from `../../reference/...` — rejected;
`reference/` is gitignored (won't exist in a fresh clone or CI) and mixes
design-working-file lifecycle with shipped app code.

### 2. Step-icon mapping (core-icons SVG → `ServiceStep.kind`)

`core-icons` names are oriented around app navigation (Home, Services,
Settings…), not the 6 service-step semantics
(alert/understand/choose_channel/prepare/verify_identity/obtain_result). The
closest honest mapping, chosen for shape semantics over label text:

| `kind` | asset | why |
| --- | --- | --- |
| `alert` | `notifications.svg` (bell) | matches "receiving an alert" |
| `understand` | `insights.svg` (lightbulb) | matches "comprehension" |
| `choose_channel` | `process-flow.svg` (branching nodes) | matches "choosing a path" |
| `prepare` | `export-report.svg` (download/document arrow) | closest to "preparing materials" |
| `verify_identity` | `profile.svg` (person outline) | matches identity |
| `obtain_result` | `results.svg` (bar chart) | matches "final result" |

This replaces the ad-hoc emoji map in `SandboxFlow.tsx`
(`KIND_ICON: Record<string,string>`) with an `import` map to the copied SVGs.
Unknown/future `kind` values keep a neutral fallback glyph (existing `•`).

### 3. Status-icon mapping

| `OutcomeStatus` | asset | notes |
| --- | --- | --- |
| `PASS` | `status/completed.png` | |
| `NEED_HELP` | `status/blocker.png` | pack's "卡住／問題" is the closest of the 5 to "needs help" |
| `BLOCKED` | `status/failed.png` | |

`not-started` / `in-progress` are not used — every rendered `StepOutcome`
already has a final status; there is no mid-replay "in progress" state on
static data. Shown alongside (not replacing) the existing `.dot` colour swatch
so colour-blind users keep a secondary cue; the icon carries the label
(`alt`/`title` text from `labels.zh-TW.json`).

### 4. Persona-avatar mapping (canonical ids only)

| Persona id (`data/seeds/personas.json`) | asset |
| --- | --- |
| `general` | `personas/office-worker.png` |
| `elderly_alone` | `personas/senior-living-alone.png` |
| `new_immigrant` | `personas/new-resident.png` |
| `mobility_impaired` | `personas/mobility-impaired.png` |
| `no_smartphone` | `personas/low-digital-literacy.png` |
| `family_proxy` | `personas/family-representative.png` |

A plain `Record<string, AssetImport>` keyed by id; `Personas.tsx` looks up the
id and falls back to the current initials/name treatment on a miss — this
literally cannot render a "guessed" avatar for a stray id, satisfying the
user's choice without extra heuristic code to maintain. The four spare avatars
(`senior`, `new-parent`, `student`, `visually-impaired`) are left uncopied;
they only apply if the canonical persona set expands later.

### 5. Service-category icon mapping (template chips)

`data/seeds/templates.json` ids → `service-categories/` asset:

| Template id | category asset |
| --- | --- |
| `heavy-rain-flooding` | `public-safety.png` |
| `disaster-relief` | `public-safety.png` |
| `childcare-subsidy` | `social-welfare.png` |
| `vaccine-booking` | `healthcare.png` |
| `rent-subsidy` | `housing.png` |

Only these 4 categories are copied (of the 12 available) since only 4 distinct
templates exist today; adding a template with an unmapped category renders the
chip without an icon (per the modified spec scenario), not a placeholder box.

### 6. Empty states: a shared `EmptyState` component + 3 usages

```
web/src/components/EmptyState.tsx
  <EmptyState image={...} title body action? onAction? />
```

Copy comes verbatim from `labels.zh-TW.json` (`emptyStates.createScenario`,
`.noResults`, `.startSimulation`) so the shipped strings match what the
designer authored, not a re-transcription in code:

| Usage | component | image |
| --- | --- | --- |
| No sandbox yet | `SandboxFlow.tsx` (center panel, replacing the current `<div className="hint">`) | `create-scenario-card.png` |
| Preview has 0 risks | `SandboxPreview.tsx` risk section | `no-results-card.png` |
| No replay run yet | `ReplayView.tsx` | `start-simulation-card.png` |

The labels JSON is copied to `web/src/assets/labels.zh-TW.json` and imported
directly (small, static, no i18n framework needed for one locale).

### 7. Logo placement

`logos/mark.png` (210×216, square) rendered at the existing `.brand` spot in
`App.tsx`'s header, to the left of the "Civic Replay" text, replacing the bare
text-only brand. The horizontal lockup variants are not used — the header
already lays out the wordmark + subtitle in HTML/CSS, which stays editable and
theme-consistent; only the mark (icon) is an image.

## Risks / Trade-offs

- **Fixed-color SVGs** (`stroke="#0B1830"`) can't be recolored per state via
  CSS `currentColor` → they're used only in static-color contexts (step
  chips), never in a toggle/active state that needs a color change. If a
  future change needs a colored variant, re-export from the source or
  post-process the stroke attribute at copy time.
- **Step-icon semantic mismatch**: the pack's core icons are app-navigation
  icons, not purpose-built step glyphs (see Decision 2) — the mapping is a
  best-effort shape match, not a literal label match. Flagged for the
  designer as a follow-up if a closer icon set becomes available.
- **`manifest.json` lists missing files** (`badges/`, `brand-tags/`,
  `ui-controls/`) → nothing in this change reads those paths; if a later
  change wants them, re-request the asset pack revision from the designer
  first.
- **Bundle size**: ~15 PNGs at up to ~300×300 add a modest amount to the web
  bundle (est. <500KB total, well under Vite's default warning threshold);
  acceptable for a hackathon MVP.
- **License compliance**: the SVGs are Lucide-derived (MIT) — copying
  `LUCIDE-LICENSE.txt` alongside them keeps attribution intact.

## Migration Plan

No data migration. Purely additive UI change behind the existing build; a
revert removes `web/src/assets/*` and the import sites' fallback branches
(emoji maps, plain-text hints) reactivate unchanged since nothing that reads
them is deleted, only extended.
