## Purpose

Lets a designer add service-flow interventions (phone fallback, volunteer
escalation, multilingual instructions, family/proxy assistance) to a sandbox,
re-run the replay, and see a Before/After diff that shows which residents each
change helped.

## ADDED Requirements

### Requirement: Add and remove interventions on a sandbox

The system SHALL allow adding interventions to a sandbox from a known catalog, at
minimum: `phone_fallback` (trigger `line_no_response` → call resident),
`volunteer_escalation` (flag to village head / volunteer for manual contact),
`multilingual_instructions` (multi-language step content), and
`family_proxy_assistance` (allow a relative to perform / verify steps). Each
intervention SHALL record its `type`, `trigger`, `action`, and the `stepId`(s) or
step-kind it attaches to. Interventions SHALL be removable.

#### Scenario: Add a phone fallback

- **WHEN** a user adds `phone_fallback` to the `alert` step
- **THEN** the sandbox's `service.fallbackOptions` (or `interventions` list)
  includes an entry with `trigger: "line_no_response"` and
  `action: "call_resident"` attached to the `alert` step

### Requirement: Re-replay with interventions applied

The system SHALL run a replay in which active interventions are visible to both
the Rule Engine and the AI Engine, such that a step previously `BLOCKED` for lack
of a fallback becomes `NEED_HELP` when a matching intervention exists.

#### Scenario: Phone fallback lifts a BLOCKED alert to NEED_HELP

- **WHEN** the `heavy-rain-flooding` sandbox is replayed after adding
  `phone_fallback` to `alert`
- **THEN** a persona previously `BLOCKED` at `alert` for `uses_line = false` is
  now `NEED_HELP` at that step, with evidence citing the phone fallback

### Requirement: Replay Diff

The system SHALL produce a `ReplayDiff` comparing a baseline `ReplayResult`
(no / prior interventions) with a post-intervention `ReplayResult`, containing:

- aggregate before/after counts for `reached`, `ableToAct`, and `unresolved`;
- per-persona outcome transitions (e.g. `BLOCKED → NEED_HELP`), including
  personas whose outcome is unchanged;
- per-intervention `impact` statements attributing which personas each
  intervention moved and by how much.

#### Scenario: Diff reports counts and transitions

- **WHEN** a diff is generated between the baseline flood replay and a replay
  with phone fallback + volunteer escalation + multilingual instructions added
- **THEN** the `ReplayDiff` shows `unresolved` decreasing, lists each persona's
  before→after outcome, and includes at least one non-empty per-intervention
  impact statement

#### Scenario: Attribute impact to a specific intervention

- **WHEN** only `phone_fallback` is added and a diff is generated
- **THEN** the diff's impact section names the personas whose outcome improved
  and states that the phone fallback was the cause, and reports no change for
  personas it did not affect

### Requirement: AI results in a diff remain flagged for validation

Any diff conclusion that depends on an AI-Engine decision SHALL carry
`requiresHumanValidation: true`, and the UI SHALL display the notice that results
are AI simulations pending real / local-authority validation.

#### Scenario: Diff surfaces the validation notice

- **WHEN** a diff includes an outcome transition decided by the AI Engine
- **THEN** that transition is marked as requiring human validation and the
  overall diff view shows the "AI 模擬結果，仍需真人／地方單位驗證" notice
