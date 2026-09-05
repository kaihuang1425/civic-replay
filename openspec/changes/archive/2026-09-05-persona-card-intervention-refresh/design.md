## Context

See proposal.md - Why for the full narrative, including why the first pass's
per-checkbox auto-replay approach was replaced. This section describes the
final architecture that shipped.

- `web/src/components/Personas.tsx` renders each persona's conditions and,
  after a replay, its per-step outcomes. `web/src/conditions.ts` provides
  `formatConditions`, a lookup table mapping each documented
  `PersonaConditionsSchema` key to a Chinese sentence fragment.
- `web/src/components/SandboxPreview.tsx` renders `preview.suggestedInterventions`
  merged with `sandbox.interventions` (so a checked-but-no-longer-suggested
  type stays visible) as checkboxes, plus a "重新模擬" button that calls the
  store's `runReplay`.
- `web/src/components/ReplayView.tsx` renders Replay Results and, once a
  second run exists, automatically diffs it against the lowest
  `interventionCount` run (`api.diff`) to annotate each persona's row with a
  before → after transition inline — no separate diff section.
- The server's rule engine (`server/src/engine/ruleEngine.ts`), AI-degraded
  fallback (`aiEngine.ts`, `replay.ts`), and diff summary (`diff.ts`) all
  generate user-visible `reason`/`evidence`/`summary` text, previously in
  English.
- `StepOutcome` (shared schema) gained `citedInterventionType`, an optional
  `InterventionType`, so `diff.ts` can attribute an improvement to a specific
  intervention without parsing `evidence` strings for a marker substring.

## Goals / Non-Goals

**Goals:**
- Every replay-engine-generated string a reviewer sees (persona conditions,
  step reasons/evidence, root cause, diff summaries) is plain Traditional
  Chinese, never mixed with English field names, enum values, or sentences.
- A reviewer can freely check/uncheck several suggested interventions before
  paying the cost of a replay, then trigger exactly one simulation for the
  whole batch.
- The before/after comparison a reviewer wants ("did this help, and who?") is
  answered inline in the same results list they already read, not a second
  section they have to open.

**Non-Goals:**
- Live/streaming diffing as checkboxes are toggled (explicitly rejected by
  this revision - see proposal.md - Why).
- Preserving the removed Replay Diff section's aggregate Before/After counts
  or per-intervention breakdown UI. The underlying data (`ReplayDiff.baseline`/
  `.after` aggregates, `.interventionImpacts`) still exists server-side; only
  its dedicated UI section was removed. A future change can resurface it if
  needed.
- Localizing AI-provider output beyond adding an explicit "reply in
  Traditional Chinese" prompt instruction; a live provider that ignores the
  instruction is out of scope here.

## Decisions

**1. Condition formatting: a small lookup table in `conditions.ts`.**
`formatConditions(conditions): string[]` maps each known
`PersonaConditionsSchema` key to a Chinese sentence fragment (age, living,
uses_line, has_smartphone, has_internet, digital_literacy, mobility,
has_vehicle, chinese_reading, needs_proxy). Because the schema is
`.passthrough()`, a custom/AI-generated key outside this table is skipped
rather than falling back to `key = value` text, which would reintroduce
English-mixing for an edge case not worth solving here.

**2. Suggested-intervention checkbox state derives from `sandbox.interventions`, merged with the server's suggestion list.**
A row is checked when `sandbox.interventions` contains a matching `type`.
Checking/unchecking calls `addIntervention`/`removeIntervention` directly and
nothing else. Because the server excludes already-applied types from
`suggestedInterventions` (it's no longer a "suggestion"), the rendered row
list is `mergeSuggestions(preview.suggestedInterventions, sandbox.interventions)`
so a checked row never disappears - a real bug in the first pass, since a
vanished row could not be unchecked.

**3. One explicit "重新模擬" replay per batch, not one replay per toggle.**
The Suggested Interventions section header carries a button that calls the
store's `runReplay`. Checkboxes disable only for the duration of their own
add/remove request (not the shared `busy` flag), so checking one suggestion
never disables another - the first pass's second real bug. The re-simulate
button itself does use the shared `busy` flag, since it deliberately affects
the whole sandbox's replay state.

**4. The before/after comparison lives in Replay Results, computed automatically.**
`ReplayView` already tracks every run this session in `store.runs`. Once a
second run exists, a `useEffect` diffs the latest run against the
lowest-`interventionCount` run and keeps the result in local state; each
persona's row looks up its own `personaTransitions` entry and renders
before → after only when `changed` is true, otherwise just the current
status. This removes the need for a user-initiated "compare" action -
diffing an already-computed pair of runs is cheap - and removes the separate
DiffPanel, `.diff-grid`/`.trans`/`.arrow` CSS, and the aggregate counts /
per-intervention breakdown UI along with it. A failed diff fetch is swallowed
silently (mirrors `refreshPreview`'s existing pattern); the row just shows
plain current status until a diff succeeds.

**5. Diff attribution uses a `citedInterventionType` field, not evidence-text parsing.**
`diff.ts` previously matched `evidence` strings against the literal substring
`intervention = <type>` to attribute an improvement to a specific
intervention. Once `evidence` became Chinese, that marker could not coexist
with human-readable text in the same string without reintroducing English.
`ruleEngine.ts`'s `decided()` helper now takes an optional
`citedInterventionType` parameter, set whenever an `assist` intervention
carried the outcome, and `diff.ts` matches on that field directly. This
decouples business logic from display text - future evidence wording changes
cannot silently break diff attribution again.

**6. Rule-engine and AI-prompt text: translate templates, don't wrap them.**
Every `reason`/`evidence` template string in `ruleEngine.ts`, the
AI-degraded fallback in `aiEngine.ts`/`replay.ts`, and the diff `summary` in
`diff.ts` was rewritten in Chinese at the source, rather than adding a
translation layer at render time - there is no other consumer of these
strings, and a translation layer would have to reverse-engineer meaning from
already-lossy English text. The AI prompts (`prompt.ts`) gained one added
instruction line each ("Write ... in Traditional Chinese") without touching
the existing English instructions, so prompt-driven test fixtures that match
on substrings of the original instructions keep working.

## Risks / Trade-offs

- **A custom/unmapped condition key silently disappears from the persona
  card** (Decision 1) → acceptable for this MVP; only the six canonical
  personas and their documented condition keys are the reviewed dataset
  today.
- **Removing the Replay Diff section drops the aggregate Reached/Able to
  act/Unresolved before/after counts and the per-intervention breakdown from
  the UI** → the underlying `ReplayDiff` data and `/api/diff` contract are
  unchanged (still exercised by the `interventions` capability's spec), so a
  future change can reintroduce a view for them without a backend change.
- **A live AI provider might still reply in English** if it ignores the
  added prompt instruction → outside this change's control; the instruction
  is best-effort, matching how the rest of the prompt's constraints are
  already just instructions, not enforced.
- **Checking many suggestions before clicking "重新模擬" means the reviewer
  sees no impact feedback until they do** → this is the intended trade-off
  (see Goals): batching cost is worth more than automatic diffing here,
  per explicit user feedback that the auto-replay approach ran the
  simulation "far more than wanted" and had two real bugs.

## Migration Plan

Frontend + server engine changes, no persisted-data migration. The new
`citedInterventionType` field is optional and additive; existing persisted
`ReplayResult`/`StepOutcome` records without it continue to validate and
simply have no cited intervention for diff attribution (falling back to the
existing category-based attribution in `diff.ts`, unchanged). Rollback is a
plain revert.
