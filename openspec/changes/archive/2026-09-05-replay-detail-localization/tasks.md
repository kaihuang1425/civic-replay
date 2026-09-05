## 1. Disclosure affordance on each persona row

- [x] 1.1 In `web/src/components/ReplayView.tsx`, add a disclosure arrow to
      each `.results-row` that reflects `open === p.personaId` (e.g. ▸
      collapsed / ▾ expanded); verify visually and with a test that the
      glyph changes when a row is clicked open/closed.

## 2. Localize the expanded step-detail line

- [x] 2.1 Add a Chinese label map for `FailureCategory`
      (`access` / `comprehension` / `action`) alongside the existing
      `OC_LABEL`/`STATUS_KEY` maps in `ReplayView.tsx`.
- [x] 2.2 Replace the step-detail line's `{o.status} · {o.category}
      {o.decidedBy === "ai" ? "(AI)" : "(rule)"}` with Chinese text for all
      three parts: outcome status (reuse `labels.status`/`STATUS_KEY`, the
      same mapping already used for the status icon's alt/title), the new
      category label map, and Chinese wording for `decidedBy` (`ai` →
      "AI 判讀", `rule` → "規則判定"); verify no raw English enum value
      (`NEED_HELP`, `access`, etc.) or English word remains in the line.
- [x] 2.3 Update `web/tests/replayView.test.tsx` to assert the expanded
      step-detail line for a rule-decided and an AI-decided outcome both
      render fully in Chinese (no raw enum/English text), and that the
      disclosure arrow's glyph reflects open/closed state; run the web test
      suite and verify it passes.

## 3. Verification

- [x] 3.1 Run the full monorepo test suite and typecheck and verify both
      pass; manually verify in the running app that persona rows in "預演
      結果" show a disclosure arrow and that expanding one shows a fully
      Chinese step-detail line for both rule-decided and AI-decided steps.
