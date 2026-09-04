import { describe, expect, it } from "vitest";
import {
  PersonaSchema,
  SandboxSchema,
  TemplateSchema,
} from "@civic-replay/shared";
import { canonicalPersonas, floodSandbox, templates } from "../src/seeds.js";

describe("seed data", () => {
  it("has 6 canonical personas that satisfy the schema", () => {
    const personas = canonicalPersonas();
    expect(personas).toHaveLength(6);
    for (const p of personas) expect(() => PersonaSchema.parse(p)).not.toThrow();
    expect(personas.map((p) => p.id)).toContain("elderly_alone");
    expect(personas.find((p) => p.id === "elderly_alone")?.conditions.uses_line).toBe(false);
  });

  it("has a flood sandbox that satisfies the schema", () => {
    const sb = SandboxSchema.parse(floodSandbox());
    expect(sb.service.steps).toHaveLength(6);
    expect(sb.service.steps[0]?.channels).toEqual(["line"]);
  });

  it("exposes 5 templates including the fixed flood scenario", () => {
    const list = templates();
    expect(list).toHaveLength(5);
    for (const t of list) expect(() => TemplateSchema.parse(t)).not.toThrow();
    const flood = list.find((t) => t.id === "heavy-rain-flooding");
    expect(flood?.sandbox).toBeDefined();
  });
});
