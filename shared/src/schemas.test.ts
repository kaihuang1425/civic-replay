import { describe, expect, it } from "vitest";
import {
  SandboxSchema,
  StepOutcomeSchema,
  type Sandbox,
} from "./index.js";

const sampleSandbox: Sandbox = {
  id: "sb_sample",
  name: "普發現金 1 萬元",
  description: "一次性現金給付政策",
  scenario: {
    theme: "政策給付",
    location: "Demo Community",
    event: "普發現金政策上路",
  },
  service: {
    steps: [
      {
        id: "s1",
        label: "知道政策",
        kind: "alert",
        intent: "接收資訊",
        channels: [],
        requiresTravel: false,
        jargon: [],
      },
      {
        id: "s2",
        label: "理解資格",
        kind: "understand",
        intent: "確認我符合嗎？",
        channels: [],
        requiresTravel: false,
        jargon: ["排富條款"],
      },
    ],
    channels: [
      { id: "online", label: "線上申請", requires: ["has_internet"] },
      { id: "window", label: "特定窗口", requires: [] },
    ],
    eligibilityRules: [{ id: "r1", text: "設籍中華民國國民" }],
    fallbackOptions: [{ id: "f1", label: "臨櫃協助" }],
  },
  personas: [
    {
      id: "p1",
      name: "一般居民",
      descriptor: "30–50 歲 / 雙薪家庭",
      primaryChannel: "online",
      tags: ["線上熟悉"],
      conditions: {
        age: 40,
        uses_line: true,
        has_smartphone: true,
        has_internet: true,
        digital_literacy: "normal",
        mobility: "normal",
        has_vehicle: true,
        chinese_reading: "normal",
      },
    },
  ],
  interventions: [],
  highlights: {
    theme: "普發現金 1 萬元",
    serviceGoal: "協助符合資格的國民順利領取現金給付",
    coreConstraints: ["資訊落差", "數位落差"],
    mainChannels: ["線上申請", "特定窗口"],
  },
  settings: {
    scenarioType: "一次性現金給付政策",
    channels: ["線上申請", "特定窗口"],
    eligibilityRules: ["設籍中華民國國民"],
    fallbackOptions: ["臨櫃協助"],
    personaCount: 1,
  },
  generatedBy: "manual",
  userEdited: [],
  createdAt: "2026-09-04T00:00:00.000Z",
  updatedAt: "2026-09-04T00:00:00.000Z",
};

describe("SandboxSchema", () => {
  it("round-trips a sample sandbox", () => {
    const parsed = SandboxSchema.parse(sampleSandbox);
    expect(parsed).toEqual(SandboxSchema.parse(parsed));
    expect(parsed.service.steps[0]?.kind).toBe("alert");
    expect(parsed.personas).toHaveLength(1);
  });

  it("rejects an unknown step kind", () => {
    const bad = structuredClone(sampleSandbox);
    // @ts-expect-error deliberately invalid
    bad.service.steps[0].kind = "teleport";
    expect(() => SandboxSchema.parse(bad)).toThrow();
  });
});

describe("StepOutcomeSchema", () => {
  it("accepts a valid outcome", () => {
    const outcome = StepOutcomeSchema.parse({
      stepId: "s1",
      status: "BLOCKED",
      category: "access",
      reason: "Resident does not use LINE",
      evidence: ["uses_line = false", "channels = [line]", "fallback = none"],
      decidedBy: "rule",
      requiresHumanValidation: false,
      stateChanges: { aware: false },
    });
    expect(outcome.status).toBe("BLOCKED");
  });
});
