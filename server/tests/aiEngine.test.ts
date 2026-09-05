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
});
