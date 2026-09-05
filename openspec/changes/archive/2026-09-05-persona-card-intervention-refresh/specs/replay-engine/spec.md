## MODIFIED Requirements

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
