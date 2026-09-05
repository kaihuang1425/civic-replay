## Why

The Persona card and the Suggested Interventions panel currently read like
debug output rather than a decision-support tool for a non-technical
reviewer: conditions render as raw `key = value` pairs (e.g. `age = 78`,
`digital_literacy = low`), mixing English field names with Chinese values,
and the manual "＋ 新增或調整 Persona" button adds a placeholder persona nobody
edits meaningfully. Separately, Suggested Interventions only offer a one-way
"＋ 加入" button with no way to remove an applied suggestion from that same
list, and no visible answer to the reviewer's real question: "if I apply
this, who does it actually help?" The team's first prototype (`../civic-replay/`,
`DiffScreen.tsx`) already solved the second problem with a checkbox list that
reveals per-persona before/after impact — this change brings both fixes into
the current console.

A first pass wired the checkbox to an automatic replay-and-diff on every
toggle, which turned out to have two real bugs (a checked suggestion could
vanish with no way to uncheck it, and checking one disabled every other
suggestion) and re-ran the simulation far more than a reviewer comparing
several interventions actually wants. It also surfaced that the replay
engine's per-step `reason`/`evidence` text — visible in the same Persona card
detail this change already touches — was itself in English, undermining the
same "present in Chinese" goal. This revision fixes both: interventions are
now toggled freely and simulated once via an explicit "重新模擬" action, the
before/after comparison is merged into the existing Replay Results view
instead of a separate diff panel, and the replay engine's generated text is
fully localized.

## What Changes

- Remove the "＋ 新增或調整 Persona" button and its `addPersona` action from the
  Persona panel. **BREAKING**: manually adding an ad-hoc persona from the
  console UI is no longer possible.
- Rewrite the Persona card's "條件與逐步結果" content so every condition renders
  as a plain-Chinese sentence fragment (e.g. "年齡 78 歲"、"獨居"、"沒有使用 LINE"、
  "數位能力：低") instead of `key = value` pairs, with no raw English field
  names or enum values left in the rendered text.
- Remove the leftmost colour dot from each persona row in "預演結果" — it
  duplicated the status icon shown right next to it.
- Rework the "建議介入措施" (Suggested Interventions) list in Sandbox Preview to
  use a checkbox per suggestion: checking applies the intervention, unchecking
  removes it, and the row stays visible (merged from `sandbox.interventions`)
  even after the server stops suggesting an already-applied type. Checking or
  unchecking no longer triggers a replay by itself — the card gets a
  "重新模擬" button (top-right of its header) that runs one replay for however
  many boxes were toggled, showing a spinner and disabling itself while it
  runs. **BREAKING** relative to the first pass of this change: the earlier
  per-checkbox auto-replay-and-show-impact behavior is replaced by this
  batched flow.
- Merge the "⇄ 比較前後（Replay Diff）" comparison into "預演結果" itself: once a
  second replay exists, each changed persona's row shows its outcome inline
  as before → after (e.g. "🟠 需要協助 → 🟢 順利完成") instead of a separate
  diff section with its own aggregate counts and per-intervention breakdown.
- Localize every rule-engine-generated `reason` and `evidence` string (and the
  AI-degraded fallback text, and the diff `summary` text) to Traditional
  Chinese — they were previously in English and showed up mixed into Persona
  card and Replay Results text (e.g. "Resident can use LINE 通知"). Diff
  attribution of which intervention helped which persona no longer parses
  this display text; it uses a new `citedInterventionType` field on
  `StepOutcome` instead.
- Rename the `phone_fallback` intervention's catalog label from "電話
  fallback" to "市內電話通知".
- Add a loading spinner + disabled state to the "執行預演" header button and
  the "開始模擬" empty-state action while a replay is running.
- Cap the suggested-intervention checkbox's width (`max-width: 20px`) — the
  page's generic `input { width: 100% }` rule was stretching it to fill its
  row.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `console-ui`: Persona cards drop the add/adjust-persona action, present
  conditions in human-readable Chinese, and no longer show a duplicate status
  dot. The Suggested Interventions list becomes a checkbox toggle with a
  manual "重新模擬" batch-replay action instead of per-checkbox auto-replay.
  The separate Replay Diff section is removed; its before/after comparison is
  now inline in each persona's Replay Results row. The replay-triggering
  actions show a loading indicator while busy.
- `replay-engine`: per-step `reason` and `evidence` text, the AI-unavailable
  degraded outcome, and diff-attribution SHALL be human-readable Traditional
  Chinese with no raw `key = value` pairs or English sentences; intervention
  attribution for diffing uses a dedicated `citedInterventionType` field
  rather than parsing evidence text.

## Impact

- `web/src/components/Personas.tsx`: removed `addPersona` and its button;
  conditions render through a human-readable Chinese formatter.
- `web/src/conditions.ts`: added the condition-to-Chinese-sentence formatter.
- `web/src/components/SandboxPreview.tsx`: suggested interventions render as
  checkboxes (merged from `preview.suggestedInterventions` and
  `sandbox.interventions`) with a "重新模擬" header button that calls
  `runReplay`; no per-row impact state or auto-replay-on-toggle remains.
- `web/src/components/ReplayView.tsx`: removed the "⇄ 比較前後" button and
  `DiffPanel`; added an automatic `api.diff` call (baseline vs. latest run)
  whose `personaTransitions` render inline in each persona's results row;
  removed the leftmost redundant status dot; added the replay-loading
  spinner to the empty-state action.
- `web/src/components/EmptyState.tsx`: added an optional `busy` prop (spinner
  + disabled action button).
- `web/src/App.tsx`: added the replay-loading spinner to the header's
  "執行預演" button.
- `web/src/styles.css`: added `.spinner`, capped the intervention checkbox's
  width, removed CSS now dead after the Diff panel's removal
  (`.diff-grid`/`.diff-cell`/`.trans`/`.arrow`/etc.).
- `shared/src/schemas.ts`: added `StepOutcome.citedInterventionType` (optional
  `InterventionType`).
- `shared/src/catalog.ts`: renamed `phone_fallback`'s label.
- `server/src/engine/ruleEngine.ts`: every `reason`/`evidence` string
  translated to Chinese; sets `citedInterventionType` where an intervention
  carried the outcome instead of embedding `intervention = <type>` in
  evidence text.
- `server/src/engine/aiEngine.ts`, `server/src/engine/replay.ts`: degraded
  (AI-unavailable) `reason`/`evidence` and the rule-only root-cause sentence
  translated to Chinese.
- `server/src/engine/diff.ts`: intervention-citation matching now reads
  `citedInterventionType` instead of parsing evidence strings; the
  per-intervention `summary` text translated to Chinese.
- `server/src/engine/prompt.ts`: added a Traditional Chinese output
  instruction to both AI prompts.
- Tests updated/added across `web/tests/*` and `server/tests/*` for all of
  the above; `server/tests/__snapshots__/prompt.test.ts.snap` regenerated.
