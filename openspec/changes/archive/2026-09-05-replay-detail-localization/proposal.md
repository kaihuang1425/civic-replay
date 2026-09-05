## Why

Each persona row in "預演結果" is clickable to expand its per-step detail, but
nothing in the row hints that it's expandable — a reviewer has to
click-and-see. Once expanded, the per-step line mixes raw English enum values
with Chinese (e.g. `NEED_HELP · access (rule)`), which is exactly the
English/Chinese-mixing problem already fixed elsewhere in this console (persona
conditions, replay reasons/evidence) but was missed for this one line.

## What Changes

- Add a disclosure arrow to each persona row in "預演結果" that flips between a
  collapsed and expanded glyph, so the row visibly signals it can be expanded.
- Replace the expanded step-detail line's raw `status · category (decidedBy)`
  text (e.g. `NEED_HELP · access (rule)`) with human-readable Traditional
  Chinese for all three parts — outcome status, failure category, and who
  decided it (rule engine vs. AI) — with no English left in the line.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `console-ui`: the "Replay results and diff view" requirement gains a
  visible expand/collapse affordance on each persona row, and its step-detail
  line (status · category · decided-by) renders entirely in Chinese instead
  of raw English enum values.

## Impact

- `web/src/components/ReplayView.tsx`: add a chevron/arrow indicator to
  `.results-row` reflecting `open === p.personaId`; replace the expanded
  step-detail line's `{o.status} · {o.category} {(AI)/(rule)}` with Chinese
  labels for status (reusing the existing `labels.status`/`STATUS_KEY`
  mapping already used for the status icon's alt/title text), a new
  Chinese label map for `FailureCategory` (`access` / `comprehension` /
  `action`), and Chinese wording for `decidedBy` (`ai` / `rule`).
- No server or shared-schema changes: `StepOutcome.status`, `.category`, and
  `.decidedBy` are unchanged data; only their on-screen presentation changes.
- Test coverage: extend `web/tests/replayView.test.tsx` to assert the
  expanded detail line contains no raw enum/English text and that the
  disclosure arrow reflects open/closed state.
