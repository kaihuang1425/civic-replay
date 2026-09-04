# Implementation notes — civic-replay-mvp

## Structure

- `shared/` — zod schemas + inferred types + intervention catalog (`@civic-replay/shared`).
- `server/` — Express API, JSON-file persistence, Rule Engine + AI Engine, AI provider abstraction (Ollama).
- `web/` — Vite + React console (three-column layout per `reference/ui.jpg`).
- `data/seeds/` — 6 canonical personas, 5 templates, the fixed `heavy-rain-flooding` sandbox.

Run: `cp .env.example .env` then `npm install && npm run dev` (server :8787, web :5173).

## Task 11.2 — live Ollama smoke (`gpt-oss:120b-cloud`)

Run on 2026-09-04 against local Ollama.

- `POST /api/generate` with `"育兒補助 每月發放育兒津貼…"` → `generatedBy: "ai"`, a
  well-formed 6-step service flow (`alert → understand → choose_channel → prepare
  → verify_identity → obtain_result`), 6 personas, populated highlights.
- `POST /api/replay` with `useAi: true` → completed in ~48s (per undecided
  step/persona AI call). Aggregate `{reached: 4, ableToAct: 1, unresolved: 3}`.
- Every AI-decided `StepOutcome` had `decidedBy: "ai"` and
  `requiresHumanValidation: true`; result-level `requiresHumanValidation: true`.
- Rule Engine correctly short-circuited deterministic cases with no AI call
  (mobility-impaired blocked at the travel step; family-proxy blocked at identity
  verification).
- AI reasoning was on-topic (e.g. "limited Chinese reading makes it hard to
  understand eligibility", "lacks internet and smartphone but can visit the
  community centre").

Note: the health check reports `reason: "Model … not pulled"` because
`gpt-oss:120b-cloud` is a cloud-routed alias not listed in `/api/tags`;
generation and replay still succeed against it.

## Task 11.3 — spec ↔ test traceability

`openspec validate --changes "civic-replay-mvp"` passes. Coverage of spec
scenarios:

| Spec | Scenario | Covered by |
| --- | --- | --- |
| sandbox-generation | Free-text → structured sandbox | `server/tests/generation.test.ts`, `api.test.ts` (POST /api/generate) |
| sandbox-generation | Highlights extracted | `generation.test.ts` |
| sandbox-generation | AI provider unavailable → fallback | `generation.test.ts` ("falls back to a template-based sandbox") |
| sandbox-generation | Edit settings and regenerate | `generation.test.ts` ("keeps user edits on regeneration") |
| sandbox-generation | Default personas match canonical set | `seeds.test.ts`, `generation.test.ts` |
| sandbox-generation | Add/edit a persona | `web/tests/app.test.tsx` + `Personas.tsx`; server accepts via PUT (`api.test.ts`) |
| sandbox-generation | Save / reload / export | `api.test.ts` ("saves, lists, gets and exports") |
| sandbox-generation | Scenario templates | `seeds.test.ts`, `api.test.ts` (GET /api/templates) |
| replay-engine | Full replay over canonical sandbox | `replay.test.ts`, `e2e.test.ts` |
| replay-engine | Deterministic given fixed inputs | `replay.test.ts` ("is deterministic across runs") |
| replay-engine | Access failure with no fallback → BLOCKED + evidence | `ruleEngine.test.ts` |
| replay-engine | Comprehension difficulty with fallback → NEED_HELP | `ruleEngine.test.ts` (multilingual assist), rule `evaluateComprehension` |
| replay-engine | Typical resident passes | `ruleEngine.test.ts` ("passes every rule-decidable step") |
| replay-engine | Rule-decidable step skips AI Engine | `ruleEngine.test.ts` (`decidedBy: "rule"`); replay path only calls AI when `!decided` |
| replay-engine | Jargon comprehension delegated to AI | `aiEngine.test.ts`, task 11.2 live smoke |
| replay-engine | AI Engine failure degrades safely | `aiEngine.test.ts` ("degrades to NEED_HELP + human-validation") |
| replay-engine | Citizen state accumulates | `ruleEngine.test.ts` ("citizen state"), `replay.ts` `applyStateChanges` |
| replay-engine | Failure path + root cause | `replay.test.ts` ("non-PASS persona … non-empty root cause"), `e2e.test.ts` |
| replay-engine | Results persisted / retrievable | `api.test.ts` (GET /api/sandboxes/:id/replays, fingerprint check) |
| interventions | Add / remove interventions | `api.test.ts`, `sandboxRepo.addIntervention` |
| interventions | Re-replay with interventions applied | `ruleEngine.test.ts` ("downgrades the alert to NEED_HELP"), `replay.test.ts` |
| interventions | Replay Diff — counts + transitions | `replay.test.ts`, `api.test.ts`, `e2e.test.ts` |
| interventions | Attribute impact to a specific intervention | `replay.test.ts` ("attributes an improvement to phone_fallback alone") |
| interventions | AI results flagged; validation notice | `web/tests/app.test.tsx` + `ReplayView.tsx`; `computeDiff` `requiresHumanValidation` |
| console-ui | Scenario input + primary actions; Run disabled until sandbox | `web/tests/app.test.tsx` |
| console-ui | Header state | `App.tsx` subheader; manual |
| console-ui | Generation-settings panel + regenerate + templates | `web/tests/app.test.tsx` (chip), `GenerationSettings.tsx` |
| console-ui | Sandbox view flowchart / journey modes | `SandboxFlow.tsx` (view-mode toggle, same data) |
| console-ui | Persona cards + detail | `Personas.tsx`, `web/tests/app.test.tsx` (flood steps rendered) |
| console-ui | Sandbox preview panel | `web/tests/app.test.tsx` ("風險偵測 Top 5"), `SandboxPreview.tsx` |
| console-ui | Replay results + diff view | `ReplayView.tsx`; server diff covered by `e2e.test.ts` |
| console-ui | AI validation notice | `ReplayView.tsx` (`VALIDATION_NOTICE`) |
| ai-provider | Provider-agnostic interface | `aiProvider.test.ts`; engine imports only `AIProvider` |
| ai-provider | Ollama default provider / configurable | `aiProvider.test.ts` (mocked HTTP), task 11.2 |
| ai-provider | Provider selection / fail-fast | `aiProvider.test.ts` ("fails fast on an unknown provider") |
| ai-provider | Structured-output validation + repair | `aiProvider.test.ts` (repair loop: passthrough / repaired / typed error) |
| ai-provider | Availability check + graceful degradation | `aiProvider.test.ts` ("reports unavailable"), `generation.test.ts`, `aiEngine.test.ts` |

Manual-only (no automated assertion): journey-mode visual layout, export file
download in a real browser, degraded-mode indicator styling. All exercised
during the task 11.2 smoke and dev-server run.
