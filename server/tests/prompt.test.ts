import { describe, expect, it } from "vitest";
import { initialCitizenState } from "../src/engine/citizenState.js";
import { buildStepPrompt } from "../src/engine/prompt.js";
import { floodSandbox } from "../src/seeds.js";

describe("buildStepPrompt", () => {
  it("includes the step, persona conditions, state and interventions", () => {
    const sb = floodSandbox();
    const persona = sb.personas.find((p) => p.id === "new_immigrant")!;
    const step = sb.service.steps.find((s) => s.id === "understand")!;
    const prompt = buildStepPrompt(
      step,
      persona,
      initialCitizenState(sb.scenario, persona),
      sb,
    );
    expect(prompt).toContain("kind: understand");
    expect(prompt).toContain('"chinese_reading":"limited"');
    expect(prompt).toContain("Current citizen state:");
    expect(prompt).toContain("Active interventions: none");
    expect(prompt).toMatchSnapshot();
  });
});
