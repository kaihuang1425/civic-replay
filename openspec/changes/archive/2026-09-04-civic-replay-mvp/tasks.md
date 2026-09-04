## 1. Monorepo & shared types

- [x] 1.1 Create npm workspace root (`package.json` with `workspaces: ["shared","server","web"]`), `tsconfig.base.json`, `.editorconfig`, `.gitignore` (ignore `data/*.json` except `data/seeds/**`), and `.env.example` with `AI_PROVIDER=ollama`, `OLLAMA_HOST`, `OLLAMA_MODEL=gpt-oss:120b-cloud`. Verify `npm install` at root succeeds and links workspaces.
- [x] 1.2 Scaffold `shared/` package (TS, builds with `tsc`). Verify `npm -w shared run build` emits `dist/`.
- [x] 1.3 In `shared/`, define zod schemas + inferred types for `Scenario`, `ServiceStep` (with `kind` enum: `alert`,`understand`,`choose_channel`,`prepare`,`verify_identity`,`obtain_result`), `Service`, `Persona` (+ `conditions`), `Intervention` (+ catalog type enum), `CitizenState`, `StepOutcome` (`status`,`category`,`reason`,`evidence[]`,`decidedBy`,`requiresHumanValidation`,`stateChanges`), `Sandbox` (+ `highlights`, `generatedBy`, `userEdited` paths), `ReplayResult`, `ReplayDiff`, `Template`. Verify a unit test round-trips a sample `Sandbox` through `SandboxSchema.parse`.
- [x] 1.4 Add root `dev` script running `server` + `web` concurrently and `test` script running all workspace tests. Verify `npm run dev` starts both and `npm test` runs.

## 2. Server foundation & persistence

- [x] 2.1 Scaffold `server/` (Express or Fastify, `tsx` for dev, `vitest` for tests). Verify `GET /api/health/ai` returns 200 with `{provider,available}`.
- [x] 2.2 Implement `JsonStore<T>` (read/write a file under `data/`, serialized writes / in-process lock, create-on-missing). Verify a concurrency test firing 20 parallel writes leaves valid JSON with all records.
- [x] 2.3 Create seed files `data/seeds/personas.json` (the 6 canonical archetypes with structured `conditions` from `reference/Civic_Replay.md`), `data/seeds/templates.json` (災害救助, 育兒補助, 疫苗預約, 租屋補貼, heavy-rain-flooding), `data/seeds/scenario.heavy-rain-flooding.json` (full pre-built `Sandbox`). Verify each parses against its `shared` schema in a test.
- [x] 2.4 Implement sandbox repo + routes: `POST /api/sandboxes`, `GET /api/sandboxes` (summary list), `GET/PUT /api/sandboxes/:id`, `GET /api/sandboxes/:id/export`. Verify integration tests: save → list shows it → get returns byte-equivalent → export returns the full object.
- [x] 2.5 Implement `GET /api/templates` from the seed. Verify it returns all 5 templates.

## 3. AI provider abstraction

- [x] 3.1 Define `AIProvider` interface (`generateStructured<T>(zodSchema, prompt, opts)`, `complete`, `health`) and `AIStructuredOutputError`. Verify a `FakeProvider` (returns canned objects) satisfies the interface and is used by tests.
- [x] 3.2 Implement `providers/ollama.ts` calling `${OLLAMA_HOST}/api/chat` with JSON output, model from `OLLAMA_MODEL`. Verify a test with a mocked HTTP layer returns a schema-valid object; a live smoke test (skipped in CI) hits a real Ollama.
- [x] 3.3 Implement `generateStructured` validate → one repair retry with embedded zod error → throw `AIStructuredOutputError`. Verify tests: valid passthrough; malformed-then-valid repaired; persistent-invalid throws typed error.
- [x] 3.4 Implement `providers/registry.ts` selecting from `AI_PROVIDER` (default `ollama`), fail-fast on unknown value listing registered providers. Verify tests: default resolves to ollama; `AI_PROVIDER=bogus` throws at startup with provider list.
- [x] 3.5 Implement `health()` for ollama + wire `GET /api/health/ai`. Verify test: unreachable host → `{available:false, reason}`.

## 4. Rule Engine

- [x] 4.1 Implement `initialCitizenState(scenario, persona)` and `applyStateChanges(state, changes)` as pure functions. Verify unit tests for accumulation across steps.
- [x] 4.2 Implement `ruleEngine.evaluate(step, persona, state, sandbox)` returning `{decided, outcome?}` covering: access (channel/capability mismatch: `uses_line`,`has_smartphone`,`has_internet`), action (`mobility`+`has_vehicle` travel steps), proxy (`needs_proxy` at `verify_identity`), typical-resident PASS. Verify unit tests for each spec scenario (BLOCKED alert with no fallback + evidence; NEED_HELP when a matching fallback/intervention exists; typical resident all-PASS).
- [x] 4.3 Ensure any language/wording/comprehension judgement returns `{decided:false}`. Verify a test that a `chinese_reading:"limited"` persona at `understand` is left undecided by rules.

## 5. AI Engine

- [x] 5.1 Implement prompt builder: scenario + single step + persona `conditions` + current `CitizenState` + relevant service rule + active interventions → compact prompt. Verify snapshot test of the built prompt for a sample input.
- [x] 5.2 Implement `aiEngine.evaluate(...)` calling `generateStructured(StepOutcomeSchema, ...)`, forcing `decidedBy:"ai"` and `requiresHumanValidation:true`. Verify test with `FakeProvider` returns a valid `StepOutcome`.
- [x] 5.3 Implement safe degradation: provider error/timeout → `NEED_HELP` + reason "undetermined (AI unavailable)" + `requiresHumanValidation:true`, replay continues. Verify test: failing provider yields that outcome and remaining steps still evaluate.

## 6. Replay pipeline & diff

- [x] 6.1 Implement `replay(sandbox, {useAi})`: per persona, per step → rule then AI-or-degrade, apply state changes, stop unaided progress on `BLOCKED`, roll up persona outcome, build `failurePath`. Verify: `useAi:false` twice on the flood seed produces identical `ReplayResult`.
- [x] 6.2 Implement aggregate counts (`reached`,`ableToAct`,`unresolved`) and `rootCause` (AI Engine from failure path, rule-template when AI disabled). Verify: flood seed rule-only replay gives 6 persona entries with counts consistent with per-persona outcomes; blocked persona has non-empty `rootCause`.
- [x] 6.3 Implement `POST /api/replay` persisting each `ReplayResult` with `{sandboxId, interventionFingerprint, timestamp}`. Verify integration test retrieves a stored result by sandbox id + fingerprint.
- [x] 6.4 Implement `computeDiff(baseline, after)` → `ReplayDiff` with before/after aggregate counts, per-persona outcome transitions (incl. unchanged), per-intervention impact attribution, and `requiresHumanValidation` when any transition was AI-decided. Verify tests: phone-fallback-only diff attributes improved personas to that intervention and reports no change for others; `unresolved` decreases on the flood seed.
- [x] 6.5 Implement `POST /api/diff {sandboxId, baselineId, afterId}`. Verify integration test end-to-end: replay → add intervention → replay → diff returns expected transitions.

## 7. Interventions

- [x] 7.1 Implement intervention catalog (`phone_fallback`, `volunteer_escalation`, `multilingual_instructions`, `family_proxy_assistance`) with `type/trigger/action/stepRef`. Verify schema test.
- [x] 7.2 Implement `POST /api/sandboxes/:id/interventions` and `DELETE .../:iid` mutating the sandbox and making interventions visible to both engines. Verify: adding `phone_fallback` to `alert` then re-replaying lifts a previously-BLOCKED persona to `NEED_HELP` with evidence citing the fallback.

## 8. Sandbox generation

- [x] 8.1 Implement `generateSandbox(description, settings?)`: `generateStructured(SandboxSkeletonSchema, ...)` for scenario/steps(kind-mapped)/channels/eligibility/fallbacks/highlights; personas default to the 6 seed archetypes lightly adapted. Set `generatedBy:"ai"`. Verify test with `FakeProvider`: free-text "普發現金 1 萬元" → sandbox with ordered steps (each with `id`,`label`,`kind` in vocabulary), ≥1 channel, ≥1 eligibility rule, exactly `personaCount` personas, populated `highlights`.
- [x] 8.2 Implement fallback path: provider unavailable → closest template from seeds, `generatedBy:"fallback"`. Verify test: with provider forced offline, generation returns a template-based sandbox marked `fallback`.
- [x] 8.3 Implement settings extraction + regeneration merge using `userEdited` field-path set (re-apply user-edited leaves unless the containing setting changed). Verify test: change `personaCount` 6→4 and edit an eligibility rule → regenerated sandbox has 4 personas, the edited rule, and retains an unrelated prior hand edit.
- [x] 8.4 Implement `POST /api/generate`. Verify integration test returns a schema-valid `Sandbox`.
- [x] 8.5 Implement preview analysis (rule-only dry pass): Risk Top 5 with severity, suggested interventions mapped from top risks, estimated outcome distribution for the donut (labelled AI estimate). Verify test on the flood seed produces a non-empty Risk Top 5 and a suggested intervention for the top risk.

## 9. Frontend — shell & sandbox

- [x] 9.1 Scaffold `web/` (Vite + React + TS, TanStack Query, state store, styling). Vite proxies `/api` → `http://localhost:8787`. Verify `npm -w web run dev` serves the shell and can call `GET /api/templates`.
- [x] 9.2 Build the three-column layout + header (`ScenarioBar` with NL input, placeholder text, `Generate Sandbox` / `Run Replay` buttons — Run Replay disabled until a sandbox exists; header shows sandbox name, editable indicator, NL→rules note, save state + last-saved time). Verify: clicking Generate populates center/right panels and enables Run Replay.
- [x] 9.3 Build `GenerationSettings` left panel: editable Scenario type, Service channels, Eligibility rules, Fallback options, Persona count, `重新生成` button, and quick-template chips. Verify: editing Fallback options + `重新生成` updates center and right panels; clicking a template chip pre-fills input + settings.
- [x] 9.4 Build `SandboxFlow` center: numbered service steps (icon/label/sub-label) with `流程圖模式` / `旅程模式` toggle. Verify: toggling modes re-renders the same flow with no data loss.
- [x] 9.5 Build `PersonaCard` grid + `PersonaDetail`: name, descriptor, condition tags, primary channel; add/adjust personas action; detail shows structured `conditions` and (after replay) per-step outcome icons. Verify: adding a persona persists it and it appears in the next replay.

## 10. Frontend — preview, results, diff

- [x] 10.1 Build `SandboxPreview` right panel: Highlights (theme, service goal, core constraints, main channels), Risk Top 5 with severity labels, Suggested interventions (clickable → adds to sandbox), estimated result donut (順利完成 / 需協助完成 / 中途放棄, labelled AI estimate). Verify: regenerating updates all four; clicking a suggested intervention adds it and updates the preview.
- [x] 10.2 Build `ReplayResults`: per-persona status dot (🟢/🟠/🔴) + outcome; drill-in shows step outcomes with reason + evidence, failure path, root cause. Verify: after Run Replay all 6 personas show a status and drill-in shows steps.
- [x] 10.3 Build `ReplayDiff` view: Before/After `Reached` / `Able to act` / `Unresolved` counts + per-persona transitions + per-intervention impact ("helped whom"). Verify: with a baseline and post-intervention replay, the view shows counts and highlights which intervention improved which persona.
- [x] 10.4 Add `ValidationNotice` ("AI 模擬結果，仍需真人／地方單位驗證") shown wherever AI-derived outcomes appear (results + diff), and a degraded-mode indicator driven by `GET /api/health/ai`. Verify: notice visible on results/diff with AI-decided outcomes; indicator shows when Ollama is down.
- [x] 10.5 Wire save / autosave + `我的沙盤` list (load by id) + `匯出沙盤` (download JSON). Verify: save → reload from list → byte-equivalent sandbox; export produces a re-importable JSON file.

## 11. End-to-end validation

- [x] 11.1 Write an e2e test (or scripted walkthrough) over the fixed `heavy-rain-flooding` sandbox: generate/load → Run Replay (rule-only) → assert 6 outcomes and aggregate counts → add phone fallback + volunteer escalation + multilingual → Run Replay → `POST /api/diff` → assert `unresolved` decreased and impact statements are non-empty. Verify the test passes in CI with `useAi:false`.
- [x] 11.2 Manual smoke with live Ollama (`gpt-oss:120b-cloud`): generate a sandbox from free-text "育兒補助", run replay with AI enabled, confirm AI-decided steps are flagged `requiresHumanValidation` and the console renders end to end. Record the result in the change notes.
- [x] 11.3 Run `openspec validate --changes "civic-replay-mvp"` and confirm all spec scenarios have corresponding tests or a documented manual-validation note. Verify validation passes and the traceability note is committed.
