## MODIFIED Requirements

### Requirement: Scenario input and primary actions

The console SHALL present a natural-language scenario input with placeholder
guidance (e.g. "例如：普發現金、災害救助、育兒補助、疫苗預約") and primary actions
**Generate Sandbox（生成沙盤）** and **Run Replay（執行預演）**. "Run Replay" SHALL
be disabled until a sandbox exists. The header SHALL display the Civic Replay
brand mark next to the wordmark.

#### Scenario: Generate then run

- **WHEN** the user types a scenario and clicks "Generate Sandbox"
- **THEN** the sandbox view populates and "Run Replay" becomes enabled

#### Scenario: Header state

- **WHEN** a sandbox is loaded
- **THEN** the header shows the current sandbox name, an editable indicator, the
  "由自然語言自動轉成規則與模擬流程" note, and save state with last-saved time

#### Scenario: Brand mark visible

- **WHEN** the console renders, with or without a loaded sandbox
- **THEN** the header shows the Civic Replay brand mark image next to the
  "Civic Replay" wordmark

### Requirement: Generation-settings panel

The left panel SHALL show the AI-inferred generation settings as editable
sections: Scenario type, Service channels, Eligibility rules, Fallback options,
and Persona count, plus quick-apply scenario templates. Editing a section and
choosing "重新生成" SHALL regenerate the sandbox per the `sandbox-generation`
capability. Each quick-apply template chip SHALL show a service-category icon
alongside its name; a template with no matching category SHALL render without
an icon rather than a placeholder.

#### Scenario: Edit a setting

- **WHEN** the user expands "Fallback options", toggles an option, and clicks
  "重新生成"
- **THEN** the regenerated sandbox reflects the change and the center and right
  panels update

#### Scenario: Quick template

- **WHEN** the user clicks a template chip (e.g. "疫苗預約")
- **THEN** the input and settings are pre-filled from that template

#### Scenario: Template chip shows its category icon

- **WHEN** the templates list renders and a template names a service category
  that has a matching icon in the asset pack
- **THEN** that template's chip shows the category icon next to its label

### Requirement: Sandbox view with flowchart and journey modes

The center panel SHALL render the generated service flow as an ordered list of
numbered steps, each showing a step icon selected by the step's `kind`, a
label, and a sub-label, and SHALL offer two view modes: **流程圖模式
(flowchart)** and **旅程模式 (journey)**. It SHALL also render the generated
personas as cards showing an avatar, name, age/household descriptor, condition
tags, and primary channel, with an action to add or adjust personas. A persona
card SHALL show the illustrated avatar matching one of the six canonical
persona ids; a persona whose id does not match a canonical persona SHALL show
the existing text/initial treatment instead of an avatar image.

#### Scenario: Toggle view mode

- **WHEN** the user switches from flowchart mode to journey mode
- **THEN** the same service flow is re-rendered in the journey layout without
  data loss

#### Scenario: Persona card detail

- **WHEN** the user opens a persona card
- **THEN** it shows the persona's structured conditions and, after a replay, that
  persona's per-step outcomes (e.g. Alert received ✅, Alert understood ⚠️,
  Evacuation found ❌, Transport available ❌)

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

#### Scenario: Preview reflects the current sandbox

- **WHEN** a sandbox is generated or regenerated
- **THEN** the highlights, risk Top 5, suggested interventions, and estimated
  donut all update to match the current sandbox

#### Scenario: Apply a suggested intervention

- **WHEN** the user clicks a suggested intervention
- **THEN** it is added to the sandbox (per the `interventions` capability) and
  the preview updates

#### Scenario: No risks detected shows the empty state

- **WHEN** a preview analysis returns an empty Risk Top 5 list
- **THEN** the panel shows the "找不到相關結果" empty-state illustration and copy
  instead of an empty list

### Requirement: Replay results and diff view

After "Run Replay", the console SHALL show each persona's status
(🟢 PASS / 🟠 NEED HELP / 🔴 BLOCKED) using both the existing colour coding and
a matching status icon, and allow drilling into a persona's step outcomes,
failure path, and root cause. After interventions are added and a second
replay is run, the console SHALL show a **Replay Diff** with Before/After
`Reached` / `Able to act` / `Unresolved` counts and per-persona and
per-intervention impact. Before any replay has run, the results area SHALL
show the "還沒有模擬紀錄" empty-state with a call to action.

#### Scenario: View persona outcomes

- **WHEN** a replay completes
- **THEN** each of the 6 personas shows a status icon and outcome, and clicking
  one reveals its step-by-step outcomes with reasons and evidence

#### Scenario: View the diff

- **WHEN** a baseline replay and a post-intervention replay both exist
- **THEN** the console shows the Before/After counts and highlights which
  intervention improved which persona's outcome

#### Scenario: No replay yet shows the empty state

- **WHEN** the results panel renders and no replay has been run for the
  current sandbox
- **THEN** it shows the "還沒有模擬紀錄" illustration, body copy, and a "開始模擬"
  action instead of a plain hint sentence

### Requirement: AI validation notice

Wherever AI-derived outcomes are shown, the console SHALL display the notice that
results are AI simulations still requiring human / local-authority validation.

#### Scenario: Notice is visible on results

- **WHEN** the user views replay results or a diff containing AI-decided outcomes
- **THEN** the "AI 模擬結果，仍需真人／地方單位驗證" notice is visible

## ADDED Requirements

### Requirement: No-sandbox empty state

Before any sandbox has been generated or loaded, the console's center panel
SHALL show the "尚未建立情境" empty-state illustration, its body copy, and a
"建立新情境" call-to-action, instead of the current plain hint sentence.

#### Scenario: Fresh session shows the create-scenario empty state

- **WHEN** the console loads with no sandbox generated or loaded yet
- **THEN** the center panel shows the "尚未建立情境" illustration and
  "點擊下方按鈕開始模擬" body copy, and the "建立新情境" action focuses the
  scenario input
