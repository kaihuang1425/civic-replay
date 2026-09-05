## MODIFIED Requirements

### Requirement: Sandbox view with flowchart and journey modes

The center panel SHALL render the generated service flow as an ordered list of
numbered steps, each showing a step icon selected by the step's `kind`, a
label, and a sub-label, and SHALL offer two view modes: **流程圖模式
(flowchart)** and **旅程模式 (journey)**. It SHALL also render the generated
personas as cards showing an avatar, name, age/household descriptor, condition
tags, and primary channel. The console SHALL NOT offer an action to add or
adjust personas from this panel. A persona card's condition detail SHALL
render as plain, human-readable Traditional Chinese sentences (e.g. "年齡 78
歲"、"獨居"、"沒有使用 LINE"、"數位能力：低") rather than raw `key = value` pairs,
and SHALL NOT mix English field names or enum values into the displayed text.
A persona card SHALL show the illustrated avatar matching one of the six
canonical persona ids; a persona whose id does not match a canonical persona
SHALL show the existing text/initial treatment instead of an avatar image.

#### Scenario: Toggle view mode

- **WHEN** the user switches from flowchart mode to journey mode
- **THEN** the same service flow is re-rendered in the journey layout without
  data loss

#### Scenario: Persona card detail

- **WHEN** the user opens a persona card
- **THEN** it shows the persona's conditions as human-readable Chinese
  sentences and, after a replay, that persona's per-step outcomes (e.g. Alert
  received ✅, Alert understood ⚠️, Evacuation found ❌, Transport available ❌)

#### Scenario: Conditions render as human-readable Chinese

- **WHEN** a persona card's condition detail renders (e.g. for conditions
  `age: 78`, `living: "alone"`, `uses_line: false`, `digital_literacy: "low"`)
- **THEN** each condition appears as a plain Chinese sentence fragment (e.g.
  "年齡 78 歲"、"獨居"、"沒有使用 LINE"、"數位能力：低") with no `key = value`
  formatting and no English field name or enum value left visible

#### Scenario: No persona add/adjust action

- **WHEN** the Persona panel renders, with or without existing personas
- **THEN** no button or control to add or adjust a persona is shown

#### Scenario: Step shows its icon

- **WHEN** the sandbox view renders a service step
- **THEN** the step's icon matches its `kind` (e.g. the alert step shows the
  alert-style icon), consistently in both flowchart and journey modes

#### Scenario: Canonical persona shows its avatar

- **WHEN** a persona card renders for one of the six canonical persona ids
  (general, elderly_alone, new_immigrant, mobility_impaired, no_smartphone,
  family_proxy)
- **THEN** the card shows that persona's illustrated avatar image

#### Scenario: Non-canonical persona has no guessed avatar

- **WHEN** a persona card renders for an id outside the six canonical ids (a
  user-added or AI-generated persona)
- **THEN** the card shows the existing text/initial placeholder and does not
  display any of the six illustrated avatars

### Requirement: Sandbox preview panel

The right panel SHALL show a live "Sandbox Preview": AI-extracted highlights
(theme, service goal, core constraints, main channels), a **Risk detection Top 5**
list with severity labels, a **Suggested interventions** list, and an estimated
**result summary** as a donut chart with 順利完成 / 需協助完成 / 中途放棄
percentages. Estimated figures SHALL be labelled as AI estimates. When no risks
are detected, the panel SHALL show the "no results" empty-state in place of the
Risk Top 5 list.

Each entry in the Suggested Interventions list SHALL present a checkbox
reflecting whether that intervention is currently applied to the sandbox.
Checking the box SHALL apply the intervention and unchecking it SHALL remove
it (per the `interventions` capability); neither action by itself SHALL run a
replay. A suggestion's row SHALL remain visible, checked, once applied even if
the server stops listing its type as a suggestion (an applied intervention is
no longer "suggested"), so the user can still uncheck it. The Suggested
Interventions section SHALL provide a "重新模擬" action in its header that runs
a single replay reflecting every currently-applied intervention; while that
replay runs, the action SHALL show a loading indicator and be disabled, and
each checkbox SHALL be disabled for the duration of its own add/remove
request.

#### Scenario: Preview reflects the current sandbox

- **WHEN** a sandbox is generated or regenerated
- **THEN** the highlights, risk Top 5, suggested interventions, and estimated
  donut all update to match the current sandbox

#### Scenario: Apply a suggested intervention

- **WHEN** the user checks a suggested intervention's checkbox
- **THEN** it is added to the sandbox (per the `interventions` capability)
  without running a replay, and the preview updates

#### Scenario: Uncheck an applied intervention

- **WHEN** the user unchecks a suggested intervention that is currently
  applied
- **THEN** it is removed from the sandbox (per the `interventions`
  capability) without running a replay, and the preview updates

#### Scenario: Checked suggestion stays visible once no longer suggested

- **WHEN** a checked intervention's type is no longer present in the sandbox
  preview's suggested-interventions list
- **THEN** its row and checkbox remain visible and checked, so the user can
  still uncheck it

#### Scenario: Re-simulate applies every toggled change at once

- **WHEN** the user checks or unchecks one or more suggestions and then
  clicks "重新模擬"
- **THEN** a single replay runs reflecting the sandbox's current intervention
  set, and Replay Results update accordingly (per the "Replay results and
  diff view" requirement)

#### Scenario: Re-simulate shows a loading state while running

- **WHEN** "重新模擬" is clicked and the replay it started has not yet
  completed
- **THEN** the button shows a loading indicator and is disabled, and the
  Suggested Interventions checkboxes are disabled until it settles

#### Scenario: No risks detected shows the empty state

- **WHEN** a preview analysis returns an empty Risk Top 5 list
- **THEN** the panel shows the "找不到相關結果" empty-state illustration and copy
  instead of an empty list

### Requirement: Replay results and diff view

After "Run Replay", the console SHALL show each persona's status
(🟢 PASS / 🟠 NEED HELP / 🔴 BLOCKED) using a single status icon — not also a
duplicate colour dot — and allow drilling into a persona's step outcomes,
failure path, and root cause. Once a second replay exists for the sandbox,
each persona's row SHALL show its outcome as an inline before → after
transition (e.g. "🟠 需要協助 → 🟢 順利完成") when that persona's outcome
differs from the lowest-intervention-count run, and its current status alone
when unchanged; there is no separate Replay Diff comparison section. Before
any replay has run, the results area SHALL show the "還沒有模擬紀錄"
empty-state with a call to action; while a replay triggered from this view is
running, that action SHALL show a loading indicator and be disabled.

#### Scenario: View persona outcomes

- **WHEN** a replay completes
- **THEN** each of the 6 personas shows a single status icon and outcome, and
  clicking one reveals its step-by-step outcomes with reasons and evidence

#### Scenario: View the diff

- **WHEN** a baseline replay and a later replay with a different intervention
  set both exist for the sandbox, and a persona's outcome differs between them
- **THEN** that persona's row shows its status as before → after (e.g.
  "🟠 需要協助 → 🟢 順利完成") instead of only its current status

#### Scenario: Unchanged persona shows only its current status

- **WHEN** a baseline and a later replay both exist but a persona's outcome
  is the same in both
- **THEN** that persona's row shows only its current status, with no arrow

#### Scenario: No replay yet shows the empty state

- **WHEN** the results panel renders and no replay has been run for the
  current sandbox
- **THEN** it shows the "還沒有模擬紀錄" illustration, body copy, and a "開始模擬"
  action instead of a plain hint sentence

#### Scenario: Replay action shows a loading state while running

- **WHEN** the user clicks "開始模擬" or "執行預演" and the replay it started
  has not yet completed
- **THEN** the clicked action shows a loading indicator and is disabled until
  the replay settles
