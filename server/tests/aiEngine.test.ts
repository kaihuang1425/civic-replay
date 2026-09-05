import { describe, expect, it } from "vitest";
import { FakeProvider } from "../src/ai/fakeProvider.js";
import { initialCitizenState } from "../src/engine/citizenState.js";
import { evaluateStep } from "../src/engine/aiEngine.js";
import { replay } from "../src/engine/replay.js";
import { floodSandbox } from "../src/seeds.js";

const stepDecider = () =>
  new FakeProvider().on("Decide whether THIS resident", {
    status: "NEED_HELP",
    category: "comprehension",
    reason: "行政用語理解困難",
    evidence: ["chinese_reading = limited"],
    stateChanges: { understands: false },
  });

describe("AI Engine", () => {
  it("returns a valid StepOutcome flagged for human validation", async () => {
    const sb = floodSandbox();
    const persona = sb.personas.find((p) => p.id === "new_immigrant")!;
    const step = sb.service.steps.find((s) => s.id === "understand")!;
    const outcome = await evaluateStep(
      stepDecider(),
      step,
      persona,
      initialCitizenState(sb.scenario, persona),
      sb,
    );
    expect(outcome.status).toBe("NEED_HELP");
    expect(outcome.decidedBy).toBe("ai");
    expect(outcome.requiresHumanValidation).toBe(true);
  });

  it("degrades to NEED_HELP + human-validation and keeps going when the provider fails", async () => {
    const sb = floodSandbox();
    const failing = new FakeProvider().setAvailable(false);
    const result = await replay(sb, { useAi: true, provider: failing });
    const immigrant = result.personas.find((p) => p.personaId === "new_immigrant")!;
    const understand = immigrant.outcomes.find((o) => o.stepId === "understand")!;
    expect(understand.status).toBe("NEED_HELP");
    expect(understand.reason).toMatch(/AI 判讀暫時無法使用/);
    expect(understand.requiresHumanValidation).toBe(true);
    // Replay still evaluated later steps for this persona.
    expect(immigrant.outcomes.length).toBeGreaterThan(1);
  });

  it("caches a step's AI decision by prompt so a later call with the same inputs can't flip its answer", async () => {
    // Regression test: re-running a replay after adding an intervention that
    // doesn't apply to this persona/step must not change this step's
    // outcome, even if the (real, non-deterministic) model would answer
    // differently on a second call for the exact same question.
    const sb = floodSandbox();
    const persona = sb.personas.find((p) => p.id === "new_immigrant")!;
    const baseStep = sb.service.steps.find((s) => s.id === "understand")!;
    const step = { ...baseStep, id: "understand_cache_test" };
    const state = initialCitizenState(sb.scenario, persona);

    let calls = 0;
    const flaky = new FakeProvider().on("Decide whether THIS resident", () => {
      calls++;
      return calls === 1
        ? { status: "PASS", category: "comprehension", reason: "ok", evidence: [], stateChanges: {} }
        : { status: "BLOCKED", category: "comprehension", reason: "flaky", evidence: [], stateChanges: {} };
    });

    const first = await evaluateStep(flaky, step, persona, state, sb);
    const second = await evaluateStep(flaky, step, persona, state, sb);

    expect(first.status).toBe("PASS");
    expect(second.status).toBe("PASS");
    expect(calls).toBe(1);
  });
});
