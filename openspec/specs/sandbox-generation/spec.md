# Sandbox Generation Specification

## Purpose

Turns a natural-language description of a public service (or a scenario template)
into a structured, editable `Sandbox` — the service flow, delivery channels,
eligibility rules, fallback options, resident personas, and AI-extracted
highlights — that the replay engine can run.

## Requirements

### Requirement: Generate a sandbox from natural language

The system SHALL accept a free-text description of a public-service scenario and
produce a `Sandbox` object containing: `scenario` (theme, location, event),
`service.steps` (ordered list of flow steps, each with an id, label, and
resident-facing intent), `service.channels`, `service.eligibilityRules`,
`service.fallbackOptions`, `personas` (default 6), and `highlights` (AI-extracted
theme, service goal, core constraints, main channels).

Each generated `service.step` MUST map to one of a known step-kind vocabulary
(e.g. `alert`, `understand`, `choose_channel`, `prepare`, `verify_identity`,
`obtain_result`) so the rule engine can reason about it deterministically.

#### Scenario: Free-text scenario produces a structured sandbox

- **WHEN** a user submits "普發現金 1 萬元" (or an English equivalent) as the
  scenario description and requests generation
- **THEN** the system returns a `Sandbox` with a non-empty ordered `service.steps`
  list, at least one channel, at least one eligibility rule, and exactly the
  requested number of personas (default 6)
- **AND** each step has a stable `id`, a human-readable `label`, and a
  `kind` drawn from the known step-kind vocabulary

#### Scenario: Highlights are extracted

- **WHEN** a sandbox is generated
- **THEN** `highlights` contains a `theme`, a `serviceGoal`, a non-empty
  `coreConstraints` list, and a non-empty `mainChannels` list

#### Scenario: AI provider unavailable

- **WHEN** the AI provider cannot be reached during generation
- **THEN** the system returns a deterministic fallback `Sandbox` built from a
  template matching the request (or the closest template), marked with
  `generatedBy: "fallback"`, rather than failing the request

### Requirement: Generation settings are editable and drive regeneration

The system SHALL expose the generation settings it inferred — scenario type,
service channels, eligibility rules, fallback options, and persona count — and
SHALL allow the user to edit any of them and regenerate. Regeneration MUST
preserve user edits that are not in conflict with the new settings.

#### Scenario: Edit settings and regenerate

- **WHEN** a user changes `personaCount` from 6 to 4 and edits an eligibility
  rule, then triggers "重新生成"
- **THEN** the returned sandbox has 4 personas and reflects the edited eligibility
  rule
- **AND** unrelated fields the user previously edited by hand are retained

### Requirement: Personas use structured conditions

Every `Persona` in a sandbox SHALL have an `id`, a display `name`, a short
`descriptor`, a `primaryChannel`, and a `conditions` object of typed key/value
constraints (e.g. `uses_line: false`, `digital_literacy: "low"`,
`mobility: "limited"`, `has_vehicle: false`, `chinese_reading: "limited"`,
`needs_proxy: true`). Personas SHALL be individually editable and the set SHALL
support add and remove.

#### Scenario: Default personas match the canonical set

- **WHEN** a sandbox is generated with the default persona count
- **THEN** the personas include the six canonical archetypes from the reference
  (general resident, elderly living alone, new immigrant, mobility-impaired
  resident, resident without a smartphone, family/proxy applicant), each with a
  populated `conditions` object

#### Scenario: Add and edit a persona

- **WHEN** a user adds a persona and sets `conditions.has_vehicle = false`
- **THEN** the sandbox persists the new persona and it is included in the next
  replay

### Requirement: Sandboxes are persisted, listed, and exportable

The system SHALL save sandboxes to JSON persistence, assign each a stable `id`
and `updatedAt`, list saved sandboxes ("我的沙盤"), load a sandbox by id, and
export a sandbox as a downloadable JSON document. Saving SHALL be explicit or
autosave, and the UI SHALL reflect the last saved time.

#### Scenario: Save and reload

- **WHEN** a user saves the current sandbox and later opens it from "我的沙盤"
- **THEN** the loaded sandbox is byte-equivalent to what was saved (same steps,
  personas, rules, interventions)

#### Scenario: Export

- **WHEN** a user exports a sandbox
- **THEN** the system produces a JSON file containing the full `Sandbox` object
  that can be re-imported to recreate the same sandbox

### Requirement: Scenario templates

The system SHALL provide selectable scenario templates (at minimum: 災害救助,
育兒補助, 疫苗預約, 租屋補貼, and the fixed validated `heavy-rain-flooding`
scenario). Selecting a template SHALL populate the NL input and generation
settings with template defaults, which the user can then edit or generate from.

#### Scenario: Apply a template

- **WHEN** a user selects the "災害救助" template
- **THEN** the scenario description and generation settings are pre-filled with
  that template's defaults and a sandbox can be generated without further input
