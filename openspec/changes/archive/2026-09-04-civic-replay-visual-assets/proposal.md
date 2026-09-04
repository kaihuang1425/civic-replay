## Why

The console currently stands in for the visual design in `reference/ui.jpg`
with emoji and CSS-only shapes (step icons, status dots, no persona artwork, no
brand mark). The designer has since delivered a finished asset pack at
`reference/Civic-Replay-assets/` (transparent PNG personas / category icons /
status icons / logo, Lucide-based SVG line icons, ready-made empty-state
copy+art, `manifest.json` + `labels.zh-TW.json`). This change wires that pack
into the console so the shipped UI matches the approved design instead of
placeholder glyphs.

## What Changes

- **New**: Brand mark (`logos/mark.png`) next to the existing wordmark in the
  header.
- **New**: The 6 service-flow steps render a core-icon (from
  `core-icons/svg/`) chosen by step `kind`, replacing the emoji lookup.
- **New**: Persona cards for the 6 canonical persona ids render the matching
  illustrated avatar (from `personas/`); any other persona id (custom-added or
  future AI-generated) falls back to the existing text/initial treatment — no
  avatar is guessed for unmapped ids.
- **New**: Replay status (PASS / NEED_HELP / BLOCKED) is shown with the
  matching status icon (`status/completed|blocker|failed.png`) alongside the
  existing colour coding.
- **New**: Scenario template chips show the matching service-category icon
  (from `service-categories/`) next to the template name.
- **New**: The three empty/placeholder spots in the console (no sandbox yet,
  no risks detected in the preview, no replay run yet) use the pack's
  ready-made empty-state illustration + copy from `labels.zh-TW.json` instead
  of a plain hint sentence.
- **Housekeeping**: vetted, used assets are copied from `reference/` (which is
  gitignored) into `web/src/assets/` so they ship with the app; the Lucide
  license notice travels with them.
- **Out of scope for this change**: the 7 marketing illustrations, the 6
  file-type icons, and the `misc-icons` set — none of these appear in
  `reference/ui.jpg`'s console screen. `manifest.json` also lists `badges/`,
  `brand-tags/`, and `ui-controls/` categories with no files on disk; nothing
  is built against them.

## Capabilities

### New Capabilities

_None — this is a visual/behavioral refinement of the existing console._

### Modified Capabilities

- `console-ui`: step icons, persona avatars, status icons, template category
  icons, and empty-state presentation now come from the delivered asset pack
  instead of emoji/plain text.

## Impact

- **Code**: `web/src/assets/` (new, vetted copies of the asset-pack files
  actually used), `web/src/components/SandboxFlow.tsx`,
  `web/src/components/Personas.tsx`, `web/src/components/ReplayView.tsx`,
  `web/src/components/GenerationSettings.tsx`, a new persona/step/category/
  status → asset lookup module, and an `EmptyState` component.
- **Data**: none — no changes to `shared/`, `server/`, or persisted schemas.
- **Assets/licensing**: `reference/Civic-Replay-assets/third-party/LUCIDE-LICENSE.txt`
  is copied alongside the SVGs it covers.
- **No behavior change** to the replay engine, sandbox generation, or API —
  this is presentation-only.
