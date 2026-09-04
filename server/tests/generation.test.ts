import { describe, expect, it } from "vitest";
import { SandboxSchema, StepKind } from "@civic-replay/shared";
import { FakeProvider } from "../src/ai/fakeProvider.js";
import { generateSandbox } from "../src/generation/generate.js";
import { analyzeSandbox } from "../src/generation/preview.js";
import { floodSandbox } from "../src/seeds.js";
import { fakeProvider } from "./helpers.js";

describe("generateSandbox", () => {
  it("turns free text into a schema-valid sandbox with the requested persona count", async () => {
    const sb = await generateSandbox(fakeProvider(), {
      description: "普發現金 1 萬元",
      settings: { personaCount: 6 },
    });
    expect(() => SandboxSchema.parse(sb)).not.toThrow();
    expect(sb.service.steps.length).toBeGreaterThan(0);
    for (const step of sb.service.steps) {
      expect(step.id).toBeTruthy();
      expect(step.label).toBeTruthy();
      expect(StepKind.options).toContain(step.kind);
    }
    expect(sb.service.channels.length).toBeGreaterThan(0);
    expect(sb.service.eligibilityRules.length).toBeGreaterThan(0);
    expect(sb.personas).toHaveLength(6);
    expect(sb.highlights.coreConstraints.length).toBeGreaterThan(0);
    expect(sb.generatedBy).toBe("ai");
  });

  it("falls back to a template-based sandbox when the provider is offline", async () => {
    const offline = new FakeProvider().setAvailable(false);
    const sb = await generateSandbox(offline, {
      description: "豪雨淹水後的居民通報與避難",
      settings: { personaCount: 6 },
    });
    expect(sb.generatedBy).toBe("fallback");
    expect(() => SandboxSchema.parse(sb)).not.toThrow();
  });

  it("keeps user edits on regeneration unless the controlling setting changed", async () => {
    const previous = floodSandbox();
    previous.service.eligibilityRules[0]!.text = "使用者手動修改的資格條件";
    previous.name = "使用者改過的名稱";
    previous.userEdited = ["service.eligibilityRules.0.text", "name"];

    const regenerated = await generateSandbox(fakeProvider(), {
      description: "豪雨淹水",
      settings: { personaCount: 4 },
      previous,
    });

    expect(regenerated.personas).toHaveLength(4);
    expect(regenerated.service.eligibilityRules[0]?.text).toBe(
      "使用者手動修改的資格條件",
    );
    expect(regenerated.name).toBe("使用者改過的名稱");
  });
});

describe("analyzeSandbox (preview)", () => {
  it("produces a non-empty Risk Top 5 and a matching suggested intervention", () => {
    const analysis = analyzeSandbox(floodSandbox());
    expect(analysis.risks.length).toBeGreaterThan(0);
    expect(analysis.risks.length).toBeLessThanOrEqual(5);
    expect(analysis.suggestedInterventions.length).toBeGreaterThan(0);
    const sum =
      analysis.estimatedDistribution.pass +
      analysis.estimatedDistribution.needHelp +
      analysis.estimatedDistribution.blocked;
    expect(sum).toBeGreaterThan(0.9);
  });
});
