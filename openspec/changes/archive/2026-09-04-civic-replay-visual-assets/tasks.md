## 1. Curate and copy assets

- [x] 1.1 Copy `reference/Civic-Replay-assets/logos/mark.png` → `web/src/assets/logo/mark.png`. Verify the file exists and `sips -g pixelWidth -g pixelHeight` reports its original dimensions (no re-encode).
- [x] 1.2 Copy the 6 mapped step SVGs from `core-icons/svg/` (`notifications`, `insights`, `process-flow`, `export-report`, `profile`, `results`) into `web/src/assets/icons/` renamed to the step-kind keys (`alert.svg`, `understand.svg`, `choose-channel.svg`, `prepare.svg`, `verify-identity.svg`, `obtain-result.svg`) per design.md Decision 2. Verify all 6 files exist and each is a well-formed SVG (`xmllint --noout` or a JS `DOMParser` parse succeeds).
- [x] 1.3 Copy `status/{completed,blocker,failed}.png` → `web/src/assets/status/`. Verify all 3 files exist.
- [x] 1.4 Copy the 6 canonical persona avatars (`office-worker`, `senior-living-alone`, `new-resident`, `mobility-impaired`, `low-digital-literacy`, `family-representative`) → `web/src/assets/personas/`. Verify all 6 files exist and are transparent PNGs (mode RGBA).
- [x] 1.5 Copy the 4 mapped category icons (`public-safety`, `social-welfare`, `healthcare`, `housing`) → `web/src/assets/categories/`. Verify all 4 files exist.
- [x] 1.6 Copy the 3 mapped empty-state cards (`create-scenario-card`, `no-results-card`, `start-simulation-card`) → `web/src/assets/empty-states/`, and copy `labels.zh-TW.json` → `web/src/assets/labels.zh-TW.json`. Verify all 4 files exist and `labels.zh-TW.json` parses as JSON with the `emptyStates` key present.
- [x] 1.7 Add `web/src/assets/THIRD_PARTY_NOTICES.md` pointing at the copied Lucide license (copy `reference/Civic-Replay-assets/third-party/LUCIDE-LICENSE.txt` alongside it as `web/src/assets/third-party/LUCIDE-LICENSE.txt`). Verify both files exist.
- [x] 1.8 Confirm `web/src/assets/` is NOT covered by any `.gitignore` rule (unlike `reference/`) so these copies are committed. Verify `git check-ignore -v web/src/assets/logo/mark.png` reports no match.

## 2. Icon / avatar / category lookup module

- [x] 2.1 Create `web/src/assets/index.ts` exporting typed lookup maps: `STEP_ICONS: Record<StepKind, string>`, `STATUS_ICONS: Record<OutcomeStatus, string>`, `PERSONA_AVATARS: Record<string, string>` (keyed by the 6 canonical persona ids only), `CATEGORY_ICONS: Record<string, string>` (keyed by template id), and the imported `labels` JSON. Verify a unit test (`web/tests/assets.test.ts`) asserts each map has exactly the keys from design.md's mapping tables.
- [x] 2.2 Verify `PERSONA_AVATARS` has no entry for any id outside the 6 canonical ids (guards against accidentally mapping a 7th id later without an explicit design decision). Verify a test asserts `Object.keys(PERSONA_AVATARS)` equals the 6 canonical ids exactly.

## 3. Brand mark in header

- [x] 3.1 Render `logo/mark.png` in `App.tsx`'s `.brand` header block, to the left of the "Civic Replay" text. Verify a web test asserts an `<img>` with the mark's `src` is present in the header regardless of whether a sandbox is loaded.

## 4. Step icons in the sandbox flow

- [x] 4.1 Replace the `KIND_ICON` emoji map in `SandboxFlow.tsx` with `STEP_ICONS` image lookups (render as `<img>` inside the existing `.step .kind` slot), keeping the existing text kind label. Verify a web test asserts the rendered `alert`-kind step includes an `<img>` whose `src` matches `STEP_ICONS.alert`, in both flowchart and journey view modes.
- [x] 4.2 Handle an unknown/future `kind` by falling back to the existing neutral glyph (no broken image). Verify a test with a synthetic step of an unmapped kind renders the fallback, not a broken `<img>`.

## 5. Persona avatars

- [x] 5.1 In `Personas.tsx`, render `PERSONA_AVATARS[persona.id]` as the card's avatar image when present. Verify a web test asserts each of the 6 seed personas' cards renders an `<img>` with the matching avatar `src`.
- [x] 5.2 When `persona.id` has no entry in `PERSONA_AVATARS`, keep the current text/initial treatment and render no avatar image. Verify a test adds a custom persona (id not in the canonical 6) and asserts no avatar `<img>` is rendered for that card while its name/initials still show.

## 6. Status icons in replay results

- [x] 6.1 In `ReplayView.tsx`, render `STATUS_ICONS[outcome]` next to the existing `.dot` for each persona's result row, with `alt`/`title` text sourced from `labels.zh-TW.json` `status`. Verify a test asserts a PASS-outcome row shows the `completed` icon, a NEED_HELP row shows `blocker`, and a BLOCKED row shows `failed`.

## 7. Template category icons

- [x] 7.1 In `GenerationSettings.tsx`, render `CATEGORY_ICONS[template.id]` inside each quick-apply template chip when a mapping exists. Verify a test asserts the 4 mapped templates' chips include the matching category `<img>`, and a template with no mapping renders its chip with no icon (not a placeholder box).

## 8. Empty states

- [x] 8.1 Build `web/src/components/EmptyState.tsx` (`image`, `title`, `body`, optional `action` label + `onAction`). Verify a unit test renders it with and without `action` and asserts the button only appears when `onAction` is passed.
- [x] 8.2 Wire it into `SandboxFlow.tsx` for the "no sandbox yet" case using `create-scenario-card.png` and `labels.emptyStates.createScenario`, with the action focusing the scenario input. Verify a test asserts the empty state shows before generation and disappears once a sandbox loads.
- [x] 8.3 Wire it into `SandboxPreview.tsx`'s Risk Top 5 section for the zero-risk case using `no-results-card.png` and `labels.emptyStates.noResults`. Verify a test with an empty `risks` array asserts the empty-state copy renders instead of an empty list.
- [x] 8.4 Wire it into `ReplayView.tsx` for the "no replay yet" case using `start-simulation-card.png` and `labels.emptyStates.startSimulation`, with the action triggering "Run Replay" (disabled state unaffected if no sandbox exists yet). Verify a test asserts the empty state shows before any replay and the results list replaces it after one completes.

## 9. Verification

- [x] 9.1 Run `npm -w web run typecheck`, `npm -w web run build`, and `npm -w web run test`. Verify all pass and the production bundle includes the new asset files (check `dist/assets/` after build).
- [x] 9.2 Manually run `npm run dev`, generate the fixed flood scenario, run a replay, and visually compare the header/steps/personas/status/template-chips/empty-states against `reference/ui.jpg`. Record the result in `openspec/changes/civic-replay-visual-assets/notes.md`.
- [x] 9.3 Run `openspec validate --changes "civic-replay-visual-assets"` and confirm it passes.
