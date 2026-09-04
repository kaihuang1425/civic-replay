## 1. Header buttons don't wrap

- [x] 1.1 In `web/src/styles.css`, make `.scenario-bar button` (`✨ 生成沙盤` / `▶ 執行預演`) `white-space: nowrap` and `flex-shrink: 0` so their labels stay on one line at the header's normal width. Verify visually (`npm run dev`) at the layout's normal width and note the result in `notes.md`.

## 2. Drop the raw step-kind text on service-flow cards

- [x] 2.1 In `web/src/components/SandboxFlow.tsx`, remove the `{step.kind}` text node from the `.step .kind` span (keep the icon/fallback glyph; drop the now-unneeded trailing space between them). Verify `npm -w web run test -- sandboxFlow` still passes unmodified (no test asserts the raw kind text, so none should need updating) and visually confirm `alert`/`understand`/`choose_channel`/`prepare`/`verify_identity`/`obtain_result` no longer render as text next to the icon.

## 3. Persona card: name + descriptor beside the avatar

- [x] 3.1 In `web/src/components/Personas.tsx`, move the `.desc` descriptor line inside `.persona-head`, in a text column next to the avatar (avatar image/initials on the left; name + status dot on the first line, descriptor on the second line, both to the right of the avatar) — matching `reference/ui.jpg`'s persona card for e.g. "一般居民" / "30–50 歲 / 雙薪家庭". Verify `npm -w web run test -- personas` still passes and visually confirm the layout against `reference/ui.jpg`.

## 4. Risk severity badges stay one line tall

- [x] 4.1 In `web/src/styles.css`, stop `.sev` from stretching to the height of its sibling risk-title text (which can wrap to 2 lines) — align the `.risk` row's items to the top instead of the flex default (`stretch`) so each `.sev` badge (`高風險` / `中高風險` / `中風險` / `低風險`) stays exactly one line tall regardless of the title's height. Verify visually against a sandbox whose risk titles wrap to 2 lines (e.g. the flood scenario) and note the result in `notes.md`.

## 5. Verification

- [x] 5.1 Run `npm -w web run typecheck`, `npm -w web run build`, and `npm -w web run test`. Verify all pass.
- [x] 5.2 Manually run `npm run dev`, generate the fixed flood scenario, and visually confirm all 4 fixes together (header buttons, step cards, persona cards, risk badges). Record the result in `openspec/changes/console-ui-polish/notes.md`.
