# Console UI Specification

## Purpose

The single-screen Civic Replay Console where a designer describes a service,
reviews and edits the AI-generated sandbox, runs the replay, and reads the
outcomes and the before/after diff — matching the layout in `reference/ui.jpg`.

## Requirements

### Requirement: Scenario input and primary actions

The console SHALL present a natural-language scenario input with placeholder
guidance (e.g. "例如：普發現金、災害救助、育兒補助、疫苗預約") and primary actions
**Generate Sandbox（生成沙盤）** and **Run Replay（執行預演）**. "Run Replay" SHALL
be disabled until a sandbox exists.

#### Scenario: Generate then run

- **WHEN** the user types a scenario and clicks "Generate Sandbox"
- **THEN** the sandbox view populates and "Run Replay" becomes enabled

#### Scenario: Header state

- **WHEN** a sandbox is loaded
- **THEN** the header shows the current sandbox name, an editable indicator, the
  "由自然語言自動轉成規則與模擬流程" note, and save state with last-saved time

### Requirement: Generation-settings panel

The left panel SHALL show the AI-inferred generation settings as editable
sections: Scenario type, Service channels, Eligibility rules, Fallback options,
and Persona count, plus quick-apply scenario templates. Editing a section and
choosing "重新生成" SHALL regenerate the sandbox per the `sandbox-generation`
capability.

#### Scenario: Edit a setting

- **WHEN** the user expands "Fallback options", toggles an option, and clicks
  "重新生成"
- **THEN** the regenerated sandbox reflects the change and the center and right
  panels update

#### Scenario: Quick template

- **WHEN** the user clicks a template chip (e.g. "疫苗預約")
- **THEN** the input and settings are pre-filled from that template

### Requirement: Sandbox view with flowchart and journey modes

The center panel SHALL render the generated service flow as an ordered list of
numbered steps (icon, label, sub-label) and SHALL offer two view modes:
**流程圖模式 (flowchart)** and **旅程模式 (journey)**. It SHALL also render the
generated personas as cards showing name, age/household descriptor, condition
tags, and primary channel, with an action to add or adjust personas.

#### Scenario: Toggle view mode

- **WHEN** the user switches from flowchart mode to journey mode
- **THEN** the same service flow is re-rendered in the journey layout without
  data loss

#### Scenario: Persona card detail

- **WHEN** the user opens a persona card
- **THEN** it shows the persona's structured conditions and, after a replay, that
  persona's per-step outcomes (e.g. Alert received ✅, Alert understood ⚠️,
  Evacuation found ❌, Transport available ❌)

### Requirement: Sandbox preview panel

The right panel SHALL show a live "Sandbox Preview": AI-extracted highlights
(theme, service goal, core constraints, main channels), a **Risk detection Top 5**
list with severity labels, a **Suggested interventions** list, and an estimated
**result summary** as a donut chart with 順利完成 / 需協助完成 / 中途放棄
percentages. Estimated figures SHALL be labelled as AI estimates.

#### Scenario: Preview reflects the current sandbox

- **WHEN** a sandbox is generated or regenerated
- **THEN** the highlights, risk Top 5, suggested interventions, and estimated
  donut all update to match the current sandbox

#### Scenario: Apply a suggested intervention

- **WHEN** the user clicks a suggested intervention
- **THEN** it is added to the sandbox (per the `interventions` capability) and
  the preview updates

### Requirement: Replay results and diff view

After "Run Replay", the console SHALL show each persona's status
(🟢 PASS / 🟠 NEED HELP / 🔴 BLOCKED) and allow drilling into a persona's step
outcomes, failure path, and root cause. After interventions are added and a
second replay is run, the console SHALL show a **Replay Diff** with Before/After
`Reached` / `Able to act` / `Unresolved` counts and per-persona and
per-intervention impact.

#### Scenario: View persona outcomes

- **WHEN** a replay completes
- **THEN** each of the 6 personas shows a status dot and outcome, and clicking
  one reveals its step-by-step outcomes with reasons and evidence

#### Scenario: View the diff

- **WHEN** a baseline replay and a post-intervention replay both exist
- **THEN** the console shows the Before/After counts and highlights which
  intervention improved which persona's outcome

### Requirement: AI validation notice

Wherever AI-derived outcomes are shown, the console SHALL display the notice that
results are AI simulations still requiring human / local-authority validation.

#### Scenario: Notice is visible on results

- **WHEN** the user views replay results or a diff containing AI-decided outcomes
- **THEN** the "AI 模擬結果，仍需真人／地方單位驗證" notice is visible
