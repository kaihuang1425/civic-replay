## Why

Public services look fine when a "typical" resident uses them, but residents with
different real-world constraints (no LINE, limited Chinese, no vehicle, limited
mobility, acting on behalf of a relative) can fall through the cracks — and this
is only discovered after the service launches or after a disaster happens.

**Civic Replay** lets a government/agency designer describe a public service in
natural language, have AI generate a testable "sandbox" (service flow + resident
personas + rules), replay every persona through the full flow, see who is
**PASS / NEED HELP / BLOCKED** and why, then modify the service and replay again
to see a before/after diff of who got caught by the safety net.

This change bootstraps the product from an empty repo to a working end-to-end MVP
matching `reference/ui.jpg`, with one scenario fixed for validation but the full
generalized pipeline running.

## What Changes

- **New**: React + TypeScript "Civic Replay Console" web app (Vite) implementing
  the single-screen layout in `reference/ui.jpg`: natural-language scenario input,
  editable generation-settings panel, AI-generated sandbox view (flowchart mode /
  journey mode), 6 persona cards, and a right-hand sandbox-preview panel
  (extracted highlights, risk Top 5, suggested interventions, estimated result
  donut).
- **New**: Node + TypeScript API / Replay Engine service with JSON-file
  persistence (`data/*.json`; no database).
- **New**: **Sandbox generation** — turn a natural-language service description
  (or a scenario template) into a structured `Sandbox` = service steps + channels
  + eligibility rules + fallback options + personas + AI-extracted highlights.
  Generation settings and personas are editable; sandboxes can be saved, listed
  ("我的沙盤"), re-generated, and exported as JSON.
- **New**: **Replay engine** — a hybrid **Rule Engine** (deterministic) +
  **AI Engine** (LLM reasoning) that runs each persona through each service step,
  tracks a per-persona **Citizen State**, and emits a per-step outcome
  (`PASS` / `NEED_HELP` / `BLOCKED`) with failure category (access / comprehension
  / action), reason, evidence, and a `requires_human_validation` flag, plus an
  overall persona outcome and a failure path.
- **New**: **Interventions & Replay Diff** — add interventions (phone fallback,
  volunteer escalation, multilingual instructions, family/proxy assistance) to a
  sandbox, re-run the replay, and produce a Before/After diff (Reached / Able to
  act / Unresolved counts) plus per-persona impact statements ("this fix helped
  whom").
- **New**: **AI provider abstraction** — a provider-agnostic AI interface used by
  the AI Engine and sandbox generation. Default provider talks to a local
  **Ollama** instance (`gpt-oss:120b-cloud`); the interface is designed so an
  OpenAI-API provider can be added later without touching engine code.
- **New**: Seed data — a fixed validated scenario (`heavy-rain-flooding`) and the
  6 canonical personas from `reference/Civic_Replay.md`, used for tests and demo.

## Capabilities

### New Capabilities

- `sandbox-generation`: Natural-language / template → structured `Sandbox`
  (service steps, channels, eligibility rules, fallback options, personas,
  AI-extracted highlights); editing, saving, listing, re-generating, exporting.
- `replay-engine`: Hybrid Rule Engine + AI Engine that replays personas through a
  sandbox's service flow, tracking Citizen State and emitting per-step outcomes,
  failure categories, evidence, failure paths, and overall persona outcomes.
- `interventions`: Adding interventions to a sandbox and producing a Before/After
  Replay Diff with per-persona impact analysis.
- `console-ui`: The single-screen React console — NL input, generation-settings
  panel, sandbox view (flowchart / journey modes), persona cards, sandbox-preview
  panel, and the replay diff view.
- `ai-provider`: Provider-agnostic AI interface with an Ollama default provider
  (`gpt-oss:120b-cloud`), structured-output helpers, and graceful degradation
  when the provider is unavailable.

### Modified Capabilities

<!-- None — greenfield project, no existing specs. -->

## Impact

- **New codebase** (repo currently contains only OpenSpec scaffolding):
  - `web/` — Vite + React + TypeScript console app.
  - `server/` — Node + TypeScript API + Replay Engine (Rule Engine, AI Engine,
    AI provider abstraction).
  - `shared/` — shared TypeScript types (`Sandbox`, `Persona`, `Service`,
    `Intervention`, `ReplayResult`, `CitizenState`, `Finding`).
  - `data/` — JSON persistence (`sandboxes.json`, seed `scenario.*.json`,
    `personas.json`, `replay-results.json`).
- **External dependencies**: a reachable Ollama endpoint with the
  `gpt-oss:120b-cloud` model for full AI behavior; `OLLAMA_HOST` (and later
  `OPENAI_API_KEY`) configured via env.
- **APIs**: new internal HTTP API between `web/` and `server/`
  (`/api/sandboxes`, `/api/generate`, `/api/replay`, `/api/interventions`,
  `/api/diff`).
- **Out of scope / Future Work** (per `Civic_Replay.md` §18): real government
  accounts or resident data, operating production government sites, browser
  agents, PDF parsing, persona generator, Redis/Docker/CI-CD, full accessibility
  audit, legal/policy determination, sharing ("分享"), 100+ personas, PostgreSQL.
