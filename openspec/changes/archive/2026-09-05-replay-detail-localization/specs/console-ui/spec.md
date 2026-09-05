## MODIFIED Requirements

### Requirement: Replay results and diff view

After "Run Replay", the console SHALL show each persona's status
(🟢 PASS / 🟠 NEED HELP / 🔴 BLOCKED) using a single status icon — not also a
duplicate colour dot — and allow drilling into a persona's step outcomes,
failure path, and root cause. Each persona row SHALL show a disclosure arrow
that reflects whether that row is currently expanded, so the row visibly
signals it can be expanded. The expanded step-detail line (outcome status,
failure category, and whether a rule or the AI decided it) SHALL render
entirely in human-readable Traditional Chinese — no raw English enum value
(e.g. `NEED_HELP`, `access`) and no English word (e.g. `(rule)`) left in the
line. Once a second replay exists for the sandbox, each persona's row SHALL
show its outcome as an inline before → after transition (e.g. "🟠 需要協助 →
🟢 順利完成") when that persona's outcome differs from the
lowest-intervention-count run, and its current status alone when unchanged;
there is no separate Replay Diff comparison section. Before any replay has
run, the results area SHALL show the "還沒有模擬紀錄" empty-state with a call
to action; while a replay triggered from this view is running, that action
SHALL show a loading indicator and be disabled.

#### Scenario: View persona outcomes

- **WHEN** a replay completes
- **THEN** each of the 6 personas shows a single status icon and outcome, and
  clicking one reveals its step-by-step outcomes with reasons and evidence

#### Scenario: Persona row shows a disclosure affordance

- **WHEN** a persona row renders, collapsed or expanded
- **THEN** the row shows a disclosure arrow (e.g. ▸ collapsed / ▾ expanded)
  that reflects its current state, distinct from the status icon

#### Scenario: Step detail renders entirely in Chinese

- **WHEN** the user expands a persona row and reads a step's detail line
  (e.g. for a `NEED_HELP` outcome, category `access`, decided by the rule
  engine)
- **THEN** the line shows the outcome status, category, and decided-by facts
  as Traditional Chinese text (e.g. "需要協助・管道（規則判定）") with no raw
  English enum value or English word visible

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
