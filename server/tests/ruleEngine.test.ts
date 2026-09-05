import { describe, expect, it } from "vitest";
import type { Persona, Sandbox } from "@civic-replay/shared";
import { initialCitizenState, applyStateChanges } from "../src/engine/citizenState.js";
import { evaluate } from "../src/engine/ruleEngine.js";
import { floodSandbox } from "../src/seeds.js";

const flood = (): Sandbox => floodSandbox();
const persona = (id: string, sb: Sandbox): Persona =>
  sb.personas.find((p) => p.id === id)!;
const step = (id: string, sb: Sandbox) => sb.service.steps.find((s) => s.id === id)!;

describe("citizen state", () => {
  it("accumulates changes across steps", () => {
    const sb = flood();
    let s = initialCitizenState(sb.scenario, persona("general", sb));
    expect(s.aware).toBe(false);
    s = applyStateChanges(s, { aware: true });
    s = applyStateChanges(s, { understands: false });
    expect(s).toMatchObject({ aware: true, understands: false, safe: true });
  });
});

describe("rule engine", () => {
  it("BLOCKS the alert when the resident does not use LINE and there is no fallback", () => {
    const sb = flood();
    const s = initialCitizenState(sb.scenario, persona("elderly_alone", sb));
    const r = evaluate(step("alert", sb), persona("elderly_alone", sb), s, sb);
    expect(r.decided).toBe(true);
    expect(r.outcome?.status).toBe("BLOCKED");
    expect(r.outcome?.category).toBe("access");
    expect(r.outcome?.decidedBy).toBe("rule");
    expect(r.outcome?.evidence).toEqual(
      expect.arrayContaining([expect.stringContaining("使用 LINE")]),
    );
    expect(r.outcome?.evidence).toEqual(
      expect.arrayContaining([expect.stringContaining("沒有備援方案")]),
    );
    expect(r.outcome?.citedInterventionType).toBeUndefined();
  });

  it("downgrades the alert to NEED_HELP when a phone fallback intervention exists", () => {
    const sb = flood();
    sb.interventions.push({
      id: "iv1",
      type: "phone_fallback",
      label: "市內電話通知",
      trigger: "line_no_response",
      action: "call_resident",
      stepRef: "alert",
    });
    const s = initialCitizenState(sb.scenario, persona("elderly_alone", sb));
    const r = evaluate(step("alert", sb), persona("elderly_alone", sb), s, sb);
    expect(r.outcome?.status).toBe("NEED_HELP");
    expect(r.outcome?.citedInterventionType).toBe("phone_fallback");
    expect(r.outcome?.evidence).toEqual(
      expect.arrayContaining([expect.stringContaining("市內電話通知")]),
    );
  });

  it("passes every rule-decidable step for a typical resident", () => {
    const sb = flood();
    const p = persona("general", sb);
    let s = initialCitizenState(sb.scenario, p);
    for (const st of sb.service.steps) {
      const r = evaluate(st, p, s, sb);
      expect(r.decided, `${st.id} should be rule-decided`).toBe(true);
      expect(r.outcome?.status, `${st.id}`).toBe("PASS");
      s = applyStateChanges(s, r.outcome!.stateChanges);
    }
  });

  it("leaves wording comprehension undecided for a limited-reading resident", () => {
    const sb = flood();
    const p = persona("new_immigrant", sb);
    const s = initialCitizenState(sb.scenario, p);
    const r = evaluate(step("understand", sb), p, s, sb);
    expect(r.decided).toBe(false);
  });
});
