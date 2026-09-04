## Context

See `proposal.md` — Why. The repo currently contains only OpenSpec scaffolding.
This design covers a greenfield MVP with a cross-cutting shape (web + API +
rule/AI engines + pluggable AI provider + JSON persistence), one new external
dependency (Ollama), and a non-trivial data model shared across all parts —
so a design doc is warranted.

Fixed constraints from the request and `reference/Civic_Replay.md`:

- React + TypeScript frontend, Node + TypeScript backend, JSON-file persistence
  (no database) for the MVP.
- Single screen matching `reference/ui.jpg`.
- Replay = deterministic **Rule Engine** first, **AI Engine** (LLM) only for what
  rules cannot decide.
- AI runs against a **local Ollama** instance, model `gpt-oss:120b-cloud`, behind
  an abstraction layer that a future OpenAI provider can slot into.
- The full generalized pipeline (NL → sandbox → replay → interventions → diff)
  must run end to end; `heavy-rain-flooding` is the fixed scenario used for
  validation and demo.

## Goals / Non-Goals

**Goals:**

- One repo, three packages (`shared/`, `server/`, `web/`) with shared types as
  the single source of truth for the data model.
- Engine determinism: identical inputs + AI disabled ⇒ identical `ReplayResult`.
- AI isolation: no provider SDK type escapes `server/src/ai/providers/`.
- Every AI-derived conclusion carries `requiresHumanValidation: true` end to end
  to the UI notice.
- Runs with Ollama down (degraded mode), so the demo never hard-fails.

**Non-Goals:**

- Auth, multi-user, real-time collaboration, sharing links ("分享" is a stub).
- Database, migrations, job queue, worker pool.
- Streaming AI output to the UI (request/response is enough at this scale).
- Importing arbitrary external service definitions (only NL + built-in templates).
- Accessibility audit of the console itself beyond basic semantic markup.

## Decisions

### 1. Monorepo with npm workspaces: `shared/`, `server/`, `web/`

`shared/` exports the TypeScript types and the JSON schemas (via `zod`) for
`Sandbox`, `Persona`, `Service`, `ServiceStep`, `Intervention`, `CitizenState`,
`StepOutcome`, `ReplayResult`, `ReplayDiff`, `Finding`. Both `server` and `web`
import it. Zod schemas double as (a) runtime validation at the API boundary and
(b) the structured-output schemas handed to the AI provider.

_Alternatives:_ separate repos (rejected — sync overhead for a hackathon MVP);
types only in `server` and duplicated in `web` (rejected — drift).

### 2. Server: Node + Express (or Fastify) + `tsx`, JSON files via a tiny repo layer

A `JsonStore<T>` wraps read/write of a file under `data/` with an in-process
write lock (serialize writes, debounce) to avoid corrupting files under
concurrent requests. Files: `data/sandboxes.json` (keyed by id),
`data/replay-results.json` (append-only list), and read-only seeds
`data/seeds/scenario.heavy-rain-flooding.json`, `data/seeds/personas.json`,
`data/seeds/templates.json`.

_Alternatives:_ SQLite (rejected per constraint); one file per record (fine, but
a single keyed file is simpler at this volume). Kept behind `JsonStore` so a
later swap to Postgres touches one module.

### 3. API surface

```
POST /api/generate            { description, settings? }            -> Sandbox
POST /api/sandboxes           { sandbox }                           -> { id }
GET  /api/sandboxes                                                 -> Sandbox[]  (summary)
GET  /api/sandboxes/:id                                             -> Sandbox
PUT  /api/sandboxes/:id       { sandbox }                           -> Sandbox
GET  /api/sandboxes/:id/export                                      -> Sandbox (attachment)
POST /api/sandboxes/:id/interventions   { intervention }            -> Sandbox
DEL  /api/sandboxes/:id/interventions/:iid                          -> Sandbox
POST /api/replay              { sandboxId, useAi? }                  -> ReplayResult
POST /api/diff                { sandboxId, baselineId, afterId }    -> ReplayDiff
GET  /api/health/ai                                                 -> { provider, available, reason? }
GET  /api/templates                                                 -> Template[]
```

`useAi` defaults to true; tests pass `false` for determinism.

### 4. Replay pipeline

```
replay(sandbox, {useAi}):
  for each persona:
    state = initialCitizenState(sandbox.scenario, persona)
    outcomes = []
    for each step in sandbox.service.steps:
      ruleResult = ruleEngine.evaluate(step, persona, state, sandbox)   // deterministic
      if ruleResult.decided:
        outcome = ruleResult
      else if useAi:
        outcome = aiEngine.evaluate(step, persona, state, sandbox)       // structured LLM call
        outcome.requiresHumanValidation = true
      else:
        outcome = { status: NEED_HELP, reason: "undetermined (AI disabled)", requiresHumanValidation: true }
      state = applyStateChanges(state, outcome.stateChanges)
      outcomes.push(outcome)
      if outcome.status == BLOCKED: break     // stop unaided progress; record failure path
    personaResult = { outcomes, finalState: state, outcome: rollUp(outcomes), failurePath, rootCause }
  aggregate reached / ableToAct / unresolved
```

`rollUp`: `BLOCKED` if any step blocked; else `NEED_HELP` if any step needs help;
else `PASS`. `rootCause` for non-PASS personas is produced by the AI Engine from
the failure path (or a rule-based template when AI is disabled).

_Alternative:_ one big LLM call per persona doing the whole journey (rejected —
less inspectable, non-deterministic, loses the rule/AI split the spec requires).

### 5. Rule Engine

Pure functions over structured facts. Covers the deterministic cases named in the
spec:

- **Access:** `persona.conditions.uses_line == false` and step.kind == `alert`
  and `channels == ["line"]` → `BLOCKED`/`access` if no matching fallback/
  intervention, else `NEED_HELP`/`access`. Generalized to any
  channel/capability mismatch (`has_smartphone`, `has_internet`, `has_vehicle`).
- **Action:** `mobility == "limited"` + `has_vehicle == false` at step.kind
  `evacuate`/`obtain_result` requiring travel → `NEED_HELP` if transport
  assistance intervention exists, else `BLOCKED`/`action`.
- **Proxy:** `needs_proxy == true` at step.kind `verify_identity` → `BLOCKED`/
  `action` unless `family_proxy_assistance` intervention.
- Typical resident (no limiting conditions) → `PASS` for all steps without an
  AI call.

Anything about *language / comprehension of specific wording* is explicitly
left `undecided` for the AI Engine.

### 6. AI Engine + AI provider abstraction

`interface AIProvider { generateStructured<T>(schema: ZodSchema<T>, prompt, opts): Promise<T>; complete(prompt, opts): Promise<string>; health(): Promise<HealthStatus> }`

- `server/src/ai/providers/ollama.ts` — POSTs to `${OLLAMA_HOST}/api/chat` with
  `format: "json"` (or `/api/generate`), model `OLLAMA_MODEL` (default
  `gpt-oss:120b-cloud`). Parses content, `schema.safeParse`, one repair retry
  with the zod error embedded, then throws `AIStructuredOutputError`.
- `server/src/ai/providers/registry.ts` — `AI_PROVIDER` env (default `ollama`);
  unknown value → fail fast at startup listing registered providers.
- A future `openai.ts` implements the same interface; nothing else changes.
- The AI Engine builds a compact prompt: scenario + step + persona.conditions +
  current CitizenState + relevant service rule + active interventions, and asks
  for a `StepOutcome` (status, category, reason, evidence[], stateChanges).
- `generateStructured` failure → caller catches, records `NEED_HELP` +
  `requiresHumanValidation`, replay continues.

_Alternative:_ Ollama's native tool/function-calling (rejected — `format: json`
+ zod is simpler and model-agnostic).

### 7. Sandbox generation

One `generateStructured` call producing the whole `Sandbox` skeleton
(scenario, steps with `kind` mapped to the vocabulary, channels, eligibility
rules, fallback options, highlights), then a second call (or the same) producing
personas — but personas default to the **six canonical archetypes** loaded from
`data/seeds/personas.json` and only lightly adapted to the scenario, so the demo
is stable. `generatedBy: "ai" | "fallback"`. On provider failure, load the
closest template from `data/seeds/templates.json` and mark `fallback`.

Regeneration merge: keep a `userEdited` field-path set on the sandbox; after
regeneration, re-apply user-edited leaf values unless the containing setting
changed.

### 8. Risk Top 5, suggested interventions, estimated donut (preview panel)

Derived by a **dry static analysis** (not a full replay) so the preview is cheap
and instant: for each persona × step, run only the Rule Engine and a cached
heuristic; count likely NEED_HELP/BLOCKED, rank causes → Risk Top 5; map each top
risk to its catalog intervention → Suggested interventions; the donut is the
rule-only outcome distribution labelled "AI 估算". A real "Run Replay" replaces
estimates with actual numbers.

### 9. Frontend

Vite + React + TS, TanStack Query for API calls, Zustand (or context) for the
current-sandbox working copy, CSS modules / Tailwind for the three-column layout.
Components mirror the spec's UI sections: `ScenarioBar`, `GenerationSettings`,
`SandboxFlow` (flowchart / journey modes), `PersonaCard` + `PersonaDetail`,
`SandboxPreview` (Highlights, RiskTop5, SuggestedInterventions, ResultDonut),
`ReplayResults`, `ReplayDiff`, `ValidationNotice`. Donut via a small SVG (no
chart lib needed).

## Risks / Trade-offs

- **Ollama `gpt-oss:120b-cloud` latency / availability** → degraded mode
  (fallback generation, rule-only replay), `useAi:false` in tests, health
  endpoint drives a UI indicator. Demo can be pre-warmed with a saved sandbox.
- **LLM structured-output drift** → zod validation + one repair retry + typed
  error; schemas kept small and flat; low temperature.
- **JSON file corruption under concurrent writes** → single-process write
  serialization in `JsonStore`; acceptable for single-instance MVP.
- **Non-determinism leaking into "deterministic" tests** → CI/tests always pass
  `useAi:false`; the rule engine is pure and separately unit-tested.
- **Rule Engine over-reaching into comprehension** → explicit rule that any
  language/wording judgement returns `undecided`; covered by a test.
- **Scope creep from the generalized pipeline** → validation and demo target only
  `heavy-rain-flooding`; other templates are best-effort.
- **Prompt / persona data grows the context** → send only `conditions` diffs and
  the single relevant service rule per step, not the whole sandbox.

## Migration Plan

Greenfield — no migration. Deploy is local dev: `npm install` at root,
`npm run dev` runs `server` (port 8787) and `web` (port 5173) concurrently;
`web` proxies `/api` to the server. Env: `.env` with `OLLAMA_HOST`,
`OLLAMA_MODEL`, `AI_PROVIDER`. Seed JSON is committed. Rollback = revert the
branch; no persistent external state beyond the local `data/` directory
(gitignored except seeds).

## Open Questions

- Exact `gpt-oss:120b-cloud` JSON-mode behavior via Ollama (native `format`
  support vs. prompt-enforced) — resolved during implementation of the Ollama
  provider; does not affect specs or task breakdown.
- Whether journey mode needs per-persona lanes or a single generic journey for
  the MVP — start with a single generic journey; revisit if the demo needs more.
