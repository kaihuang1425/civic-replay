## 1. Persona card: remove add/adjust action, localize conditions

- [x] 1.1 Remove the "＋ 新增或調整 Persona" button and the `addPersona` handler
      from `web/src/components/Personas.tsx`; verify no button/control to add
      or adjust a persona renders (manual check + updated test in 1.4).
- [x] 1.2 Add `formatConditions(conditions: PersonaConditions): string[]` to
      `web/src/conditions.ts` implementing the Chinese sentence mapping from
      design.md - Decision 1 (age, living, uses_line, has_smartphone,
      has_internet, digital_literacy, mobility, has_vehicle,
      chinese_reading, needs_proxy), skipping unmapped keys; verify with a
      unit test covering each of the six seed personas in
      `data/seeds/personas.json` plus one persona with an unmapped custom
      key.
- [x] 1.3 In `Personas.tsx`, replace the `canonicalConditionEntries(...).map`
      `key = value` list under "條件與逐步結果" with the sentence list from
      `formatConditions`; verify visually (dev server) that no persona card
      shows a raw `key = value` pair or an English field/enum name.
- [x] 1.4 Update `web/tests/personas.test.tsx` (and add cases if needed) to
      assert: no add/adjust-persona control renders, and a persona card's
      condition detail contains the expected Chinese sentences (e.g. for
      `elderly_alone`: "年齡 78 歲"、"獨居"、"沒有使用 LINE"、"數位能力：低") with no
      `=` sign or raw English condition text present.

## 2. Suggested Interventions: checkbox toggle

- [x] 2.1 In `web/src/components/SandboxPreview.tsx`, replace each suggested
      intervention's "＋ 加入" button with a checkbox; derive its checked
      state from whether `sandbox.interventions` contains an entry whose
      `type` matches the suggestion; verify by rendering a sandbox with an
      already-applied intervention type and confirming its checkbox is
      checked.
- [x] 2.2 Wire checking a box to `addIntervention(type, defaultStepRef)` and
      unchecking to `removeIntervention(id)` (looking up the matching
      `sandbox.interventions` entry by `type`); verify via a test that
      toggling calls the expected store action and the sandbox's
      `interventions` list updates accordingly.
- [x] 2.3 Remove the now-redundant `sandbox.interventions` tag list at the
      bottom of the Suggested Interventions section (design.md notes the
      checkbox state already communicates "applied"); verify the section
      renders without duplicate applied-intervention indicators.

## 3. Suggested Interventions: show who a checked suggestion helps

- [x] 3.1 Add a helper (co-located with `SandboxPreview.tsx` or in
      `store.ts`, per design.md - Decision 3) that, after an
      `addIntervention`/`removeIntervention` call settles, triggers
      `runReplay`, then - if a run with a lower `interventionCount` exists
      in `store.runs` - calls `api.diff(sandbox.id, baseline.result.id,
      latest.result.id)` the same way `ReplayView.tsx` selects its
      baseline; verify with a unit test that the correct baseline/after run
      ids are passed to `api.diff`.
- [x] 3.2 Render, under a checked suggestion, the `movedPersonas` from the
      matching `ReplayDiff.interventionImpacts` entry (matched by `type`) as
      "persona 名稱：之前狀態 → 之後狀態"; verify with a test that checking a
      suggestion whose diff shows a moved persona displays that persona's
      name and before/after status.
- [x] 3.3 Show a pending indicator on a checked suggestion while its
      replay+diff round-trip is in flight or before any diff-eligible
      baseline exists, and clear a suggestion's impact list immediately when
      it is unchecked; verify with tests for both the pending state and the
      clear-on-uncheck behavior.
- [x] 3.4 Ensure overlapping toggles do not race concurrent replay runs:
      rely on the existing `busy` store field to serialize
      addIntervention/removeIntervention/runReplay calls (design.md -
      Decision 4); verify by checking two suggestions in quick succession in
      a test and confirming only one replay+diff round-trip is in flight at
      a time and both checkboxes still end up reflecting sandbox state
      correctly.

## 4. Test and manual verification

- [x] 4.1 Update `web/tests/sandboxPreview.test.tsx` to cover the new
      checkbox rendering, toggle behavior, and impact display added in
      Sections 2-3; run `npm test` (web workspace) and verify it passes.
- [x] 4.2 Run the app (`npm run dev` or project's dev script) and manually
      verify: the Persona panel has no add/adjust button, every persona
      card's conditions read as plain Chinese sentences, and checking a
      Suggested Intervention shows the affected personas' before/after
      status while unchecking removes both the intervention and its impact
      list.

## 5. Follow-up fixes (post-implementation bug reports)

- [x] 5.1 Localize every rule-engine `reason`/`evidence` string in
      `server/src/engine/ruleEngine.ts` to Traditional Chinese; verify with
      unit tests and a manual replay against the running server showing no
      English text in any step's reason/evidence.
- [x] 5.2 Add `StepOutcome.citedInterventionType` (shared schema) and have
      `ruleEngine.ts`'s `decided()` helper set it wherever an intervention
      carries the outcome; update `server/src/engine/diff.ts` to attribute
      diff impact via this field instead of parsing `evidence` text for an
      `intervention = <type>` marker; verify with `ruleEngine.test.ts` and
      `replay.test.ts`.
- [x] 5.3 Localize the AI-unavailable/AI-disabled degraded outcome
      (`aiEngine.ts`, `replay.ts`) and the rule-only root-cause sentence
      (`replay.ts`) to Chinese; localize the diff `summary` text
      (`diff.ts`); add a Traditional-Chinese output instruction to both AI
      prompts (`prompt.ts`) without altering their existing instruction
      lines; verify with `aiEngine.test.ts` and the regenerated
      `prompt.test.ts` snapshot.
- [x] 5.4 Localize the "Root cause" label in `ReplayView.tsx` to "根本原因".
- [x] 5.5 Rename the `phone_fallback` intervention's catalog label
      (`shared/src/catalog.ts`) from "電話 fallback" to "市內電話通知"; update
      fixture labels across affected tests.
- [x] 5.6 Fix the Suggested Interventions checkbox disappearing once
      checked: merge `sandbox.interventions` into the rendered suggestion
      list (`mergeSuggestions` in `SandboxPreview.tsx`) so a checked,
      no-longer-suggested row stays visible and can be unchecked; verify
      with a test.
- [x] 5.7 Fix checking one Suggested Intervention disabling every other
      checkbox: track each row's own in-flight add/remove request
      (`togglingTypes`) instead of gating on the shared store `busy` flag;
      verify with a test that checking one suggestion leaves another
      enabled.
- [x] 5.8 Remove the per-checkbox auto-replay-and-diff behavior from
      `SandboxPreview.tsx` (checking/unchecking now only calls
      `addIntervention`/`removeIntervention`); add a "重新模擬" button to the
      Suggested Interventions section header that runs one `runReplay` for
      the whole batch, with a loading spinner and disabled state while it
      runs; remove the now-unneeded per-checkbox "模擬中，稍候查看受影響的角色…"
      pending text; verify with tests.
- [x] 5.9 Remove the separate "⇄ 比較前後（Replay Diff）" button and
      `DiffPanel` from `ReplayView.tsx`; add an automatic `api.diff` call
      (baseline vs. latest run, via `useEffect`) and render each changed
      persona's row as an inline before → after transition (e.g.
      "🟠 需要協助 → 🟢 順利完成"), leaving unchanged personas' rows as plain
      current status; remove the now-dead `.diff-grid`/`.diff-cell`/`.trans`/
      `.arrow` CSS; verify with tests.
- [x] 5.10 Remove the redundant leftmost colour dot from each persona row in
      `ReplayView.tsx` (duplicated the status icon shown next to it).
- [x] 5.11 Add a loading spinner (`.spinner` CSS) and disabled state to the
      header's "執行預演" button (`App.tsx`) and the "開始模擬" empty-state
      action (`EmptyState.tsx` `busy` prop, wired from `ReplayView.tsx`)
      while a replay is running; verify with tests.
- [x] 5.12 Cap the Suggested Interventions checkbox's width
      (`max-width: 20px`) so the page's generic `input { width: 100% }` rule
      no longer stretches it.
- [x] 5.13 Update/add tests across `web/tests/*` and `server/tests/*` for
      5.1-5.12; run the full monorepo test suite and typecheck and verify
      both pass; manually verify the rule-engine text, diff attribution, and
      re-simulate flow against the real running server.
