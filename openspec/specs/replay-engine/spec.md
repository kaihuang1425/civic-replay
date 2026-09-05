# Replay Engine Specification

## Purpose

Replays each persona through a sandbox's service flow using a deterministic Rule
Engine plus an LLM-based AI Engine, tracking a per-persona Citizen State and
emitting per-step outcomes (PASS / NEED HELP / BLOCKED) with categories, reasons,
and evidence, so designers can see exactly where and why residents fall out of a
public service.

## Requirements

### Requirement: Replay a sandbox for all personas

The system SHALL, given a `Sandbox`, run every persona through every
`service.step` in order and return a `ReplayResult` containing, per persona: the
ordered list of `StepOutcome`s, the final `CitizenState`, an overall persona
`outcome` (`PASS` / `NEED_HELP` / `BLOCKED`), and a `failurePath` describing the
first step where the persona stopped being able to proceed unaided (if any).

The `ReplayResult` SHALL also contain aggregate counts: `reached` (personas who
got to the final step in any state), `ableToAct` (personas whose overall outcome
is `PASS`), and `unresolved` (personas whose overall outcome is `BLOCKED`).

#### Scenario: Full replay over the canonical sandbox

- **WHEN** the fixed `heavy-rain-flooding` sandbox with its 6 canonical personas
  is replayed with no interventions
- **THEN** the result contains 6 per-persona entries, each with a `StepOutcome`
  for every service step and one of the three overall outcomes
- **AND** the aggregate `reached`, `ableToAct`, and `unresolved` counts are
  consistent with the per-persona outcomes

#### Scenario: Deterministic given fixed inputs

- **WHEN** the same sandbox is replayed twice with the AI Engine disabled (rules
  only)
- **THEN** both `ReplayResult`s are identical

### Requirement: Per-step outcome classification

Each `StepOutcome` SHALL classify the step for that persona as:

- `PASS` — the persona can complete the step unaided.
- `NEED_HELP` — the persona cannot complete it unaided, but a fallback option or
  intervention in the sandbox can carry them through.
- `BLOCKED` — the persona cannot complete it and no fallback exists.

Each `StepOutcome` SHALL include: `stepId`, `status`, `category`
(`access` / `comprehension` / `action`), `reason` (short human-readable
sentence), `evidence` (list of the persona-condition / service-rule facts that
led to the decision), `decidedBy` (`rule` or `ai`), and
`requiresHumanValidation` (boolean). `reason` and every `evidence` string
SHALL be human-readable Traditional Chinese — never a raw `key = value` pair
(e.g. `uses_line = false`) and never an English sentence — for both
rule-decided and AI-decided outcomes, and for the degraded outcome produced
when the AI Engine is unavailable or disabled. When an outcome is carried by
a specific intervention, `StepOutcome` SHALL record that intervention's type
in a `citedInterventionType` field rather than requiring it be parsed out of
`evidence` text.

#### Scenario: Access failure with no fallback is BLOCKED

- **WHEN** a persona has `uses_line: false` and the `alert` step's channels are
  `["line"]` with no fallback
- **THEN** the `StepOutcome` for `alert` is `BLOCKED`, category `access`, with
  human-readable Chinese evidence naming the missing LINE access and that no
  fallback exists (e.g. "缺少使用 LINE"、"沒有備援方案")
- **AND** `decidedBy` is `rule`

#### Scenario: Comprehension difficulty with a fallback is NEED_HELP

- **WHEN** a persona has `chinese_reading: "limited"`, the `understand` step
  contains administrative jargon, and the sandbox has a `multilingual` fallback
  option
- **THEN** the `StepOutcome` for `understand` is `NEED_HELP`, category
  `comprehension`

#### Scenario: Typical resident passes

- **WHEN** a persona has a smartphone, normal connectivity, normal digital
  literacy, and a vehicle
- **THEN** every `StepOutcome` is `PASS` and the overall outcome is `PASS`

#### Scenario: An intervention carrying an outcome is recorded, not just described

- **WHEN** a step's `NEED_HELP` outcome is carried by an applied intervention
  (e.g. `phone_fallback`)
- **THEN** `StepOutcome.citedInterventionType` is set to that intervention's
  type, and `evidence` names the intervention in Chinese (e.g. "已套用介入措施：
  市內電話通知") rather than embedding a machine-parsed marker string

#### Scenario: AI-unavailable degraded outcome stays in Chinese

- **WHEN** a step falls back to the AI-disabled/AI-unavailable degraded
  outcome (per "AI Engine handles semantic reasoning")
- **THEN** its `reason` and `evidence` are human-readable Traditional Chinese,
  not English

### Requirement: Rule Engine decides deterministic conditions first

The system SHALL evaluate deterministic rules (matching persona `conditions`
against `service` channel/rule/fallback structures) before invoking the AI
Engine. A step whose outcome is fully determined by rules SHALL NOT be sent to the
AI Engine.

#### Scenario: Rule-decidable step skips the AI Engine

- **WHEN** a step's outcome is fully determined by `uses_line = false` against
  `channels = [line], fallback = []`
- **THEN** the `StepOutcome.decidedBy` is `rule` and no AI provider call is made
  for that step

### Requirement: AI Engine handles semantic reasoning

For steps not resolved by rules, the system SHALL call the AI Engine (via the
`ai-provider` capability) with the persona conditions, current Citizen State,
relevant service rule, and scenario, and SHALL require a structured response
containing `status`, `category`, `reason`, and derived state changes. The AI
Engine's outputs SHALL always be marked `requiresHumanValidation: true`.

#### Scenario: Jargon comprehension is delegated to the AI Engine

- **WHEN** deciding whether an administrative term blocks a
  `chinese_reading: "limited"` persona at the `understand` step
- **THEN** the system calls the AI Engine, records `decidedBy: "ai"`, and the
  resulting `StepOutcome` has `requiresHumanValidation: true`

#### Scenario: AI Engine failure degrades safely

- **WHEN** the AI provider errors or times out for a step
- **THEN** the step is recorded as `NEED_HELP` with `reason` noting the
  undetermined AI decision and `requiresHumanValidation: true`, and the replay
  continues for remaining steps and personas

### Requirement: Citizen State is tracked through the flow

The system SHALL maintain a `CitizenState` per persona, initialized (e.g.
`safe`, `location: "home"`, `aware: false`, `understands: null`), and updated
after each step from that step's derived state changes (e.g. `aware = true`,
`understands = false`, `evacuation_info = "unavailable"`,
`needs_assistance = true`). Each `StepOutcome` SHALL record the state changes it
applied.

#### Scenario: State accumulates across steps

- **WHEN** an elderly-living-alone persona is replayed and fails to receive the
  alert
- **THEN** after the `alert` step `CitizenState.aware` is `false`, and subsequent
  steps that depend on awareness reflect that state in their evidence

### Requirement: Failure path and root cause

For any persona whose overall outcome is `NEED_HELP` or `BLOCKED`, the
`ReplayResult` SHALL include a `failurePath` (the sequence of steps and
checks leading to the outcome) and a `rootCause` string explaining the systemic
gap (e.g. "LINE is the only alert channel; no fallback exists for residents who
do not use LINE").

#### Scenario: Blocked persona has a root cause

- **WHEN** a persona is `BLOCKED` at the `alert` step for lack of a non-LINE
  channel
- **THEN** the persona's `failurePath` names the `alert` step and the failed
  `uses_line` check, and `rootCause` is a non-empty sentence naming the missing
  fallback

### Requirement: Results are persisted and retrievable

The system SHALL persist each `ReplayResult` to JSON with the sandbox `id`, an
intervention-set fingerprint, and a timestamp, so a later diff can compare a
"before" and "after" run.

#### Scenario: Replay result stored for diffing

- **WHEN** a replay completes
- **THEN** a `ReplayResult` record is written that can be retrieved by sandbox id
  and intervention fingerprint
