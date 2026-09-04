## Why

A pass through the console against `reference/ui.jpg` surfaced four small
visual rough edges: two header buttons wrap their label text, the service-flow
cards show a redundant raw `kind` identifier next to the icon, the persona
card's name/descriptor lines aren't grouped next to the avatar the way the
design shows, and the risk-severity badges can grow to two lines for the
4-character labels. None of these change what the console does — only how it
looks.

## What Changes

- **Header buttons**: "✨ 生成沙盤" and "▶ 執行預演" no longer wrap their label
  onto a second line at the header's normal width.
- **Service-flow step cards**: remove the raw step-kind text (`alert`,
  `understand`, `choose_channel`, `prepare`, `verify_identity`,
  `obtain_result`) shown next to the step icon; the icon, numbered badge,
  label, and sub-label are unchanged.
- **Persona cards**: the name and descriptor lines both sit in a text column to
  the right of the avatar (matching `reference/ui.jpg`'s persona card), instead
  of the descriptor running full-width below the avatar+name row.
- **Risk severity badges** (`高風險` / `中高風險` / `中風險` / `低風險`): capped to
  a single line of text height; the label never wraps.
- **No behavior change**: no data, interaction, or capability changes — this is
  a CSS/markup-only visual adjustment to the existing console.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

_None — no spec-level (behavioral) requirement changes. This change sets
`skip_specs: true` in `.openspec.yaml`; see Impact below for the touched files._

## Impact

- **Code**: `web/src/styles.css` (button sizing, badge sizing/line-height,
  persona-card layout rules), `web/src/components/SandboxFlow.tsx` (drop the
  step-kind text node), `web/src/components/Personas.tsx` (regroup
  name+descriptor into a text column beside the avatar).
- **Tests**: existing web tests that assert on step-kind text or persona-card
  DOM structure may need updating to match the new markup; no new behavior to
  test.
- **No changes** to `shared/`, `server/`, data, or the API.
